import { getBsMonthName, romanizeTithi } from '@/src/domain/calendar/labels';
import { getCachedWithMeta, setCached } from '@/src/services/cache/asyncStorage';
import { BsDay, BsMonth } from '../../domain/calendar/types';
import { fetchHamroPatroMonth, HpDay } from './hamroPatroCalendarApi';

const BASE = 'https://cal.mahansigdel.com.np';
const CACHE_PREFIX = 'bs-month-v7:'; // Versioned cache (v7: cal.mahansigdel.com.np)
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
// Shorter TTL when a month is still missing detail data after all fallbacks,
// so we retry sooner instead of caching an incomplete month for a full month.
const SHORT_TTL_MS = 1000 * 60 * 60 * 24; // 1 day

function tryParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const sanitized = text.replace(
      /(:\s*)(\d{4}-\d{2}-\d{2}(?:T[^\s",}]*)?)/g,
      '$1"$2"',
    );
    return JSON.parse(sanitized);
  }
}

const FETCH_TIMEOUT_MS = 10000;

async function fetchJson<T>(url: string): Promise<T> {
  // Abort hung connections: without a timeout a single stalled request can
  // freeze month grids and conversions for minutes on flaky mobile networks.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const text = await res.text();
    return tryParse(text) as T;
  } finally {
    clearTimeout(timer);
  }
}

function countMissingTithi(days: BsDay[]): number {
  return days.filter((d) => !d.tithiRom || !d.tithiRom.trim()).length;
}

function isDegraded(month: BsMonth): boolean {
  if (!month.days.length) return true;
  // Treat the month as degraded if more than 30% of days lack tithi data.
  return countMissingTithi(month.days) > month.days.length * 0.3;
}

/**
 * Fill in the tithi/panchang fields that the primary API left empty using
 * Hamro Patro data for the same BS month. Only empty fields are touched, so
 * authoritative primary-source data is never overwritten.
 */
async function enrichWithHamroPatro(month: BsMonth): Promise<BsMonth> {
  try {
    const hpDays = await fetchHamroPatroMonth(month.bsYear, month.bsMonth);
    if (!hpDays.length) return month;

    const byDay = new Map<number, HpDay>();
    for (const h of hpDays) byDay.set(h.bsDay, h);

    const days = month.days.map((d) => {
      const hasTithi = !!(d.tithiRom && d.tithiRom.trim());
      const hasPanchang = !!(d.extraDetails && (d.extraDetails.pakshya || d.extraDetails.nakshatra));
      if (hasTithi && hasPanchang) return d;

      const h = byDay.get(d.bsDay);
      if (!h) return d;

      const existingEvents = d.events && d.events.length ? d.events : undefined;
      return {
        ...d,
        tithiRom: hasTithi ? d.tithiRom : h.tithiRom || d.tithiRom,
        events: existingEvents ?? (h.events.length ? h.events : d.events),
        extraDetails: {
          ...(d.extraDetails || {}),
          pakshya: d.extraDetails?.pakshya || h.paksha,
          nakshatra: d.extraDetails?.nakshatra || h.nakshatra,
          yog: d.extraDetails?.yog || h.yog,
          karan: d.extraDetails?.karan || h.karan,
        },
      } as BsDay;
    });

    return { ...month, days };
  } catch (e) {
    console.warn('[HP] enrichment failed:', (e as any)?.message || e);
    return month;
  }
}

/**
 * Build a full BS month entirely from Hamro Patro. Used as a last resort when
 * the primary API is unreachable / errors out for a month.
 */
async function buildMonthFromHamroPatro(year: number, month: number): Promise<BsMonth> {
  const hpDays = await fetchHamroPatroMonth(year, month);
  if (!hpDays.length) throw new Error('Hamro Patro returned no days');

  const days: BsDay[] = hpDays.map((h) => ({
    bsYear: h.bsYear,
    bsMonth: h.bsMonth,
    bsDay: h.bsDay,
    adDateISO: h.adDateISO,
    weekday: h.weekday,
    tithiRom: h.tithiRom,
    holidayNameRom: h.isHoliday ? h.events[0] || null : null,
    events: h.events,
    extraDetails: {
      pakshya: h.paksha,
      nakshatra: h.nakshatra,
      yog: h.yog,
      karan: h.karan,
      muhurats: [],
    },
  }));

  return {
    bsYear: year,
    bsMonth: month,
    bsMonthNameRom: getBsMonthName(month),
    days,
  };
}

// De-duplicate concurrent fetches of the same month. Enrichment no longer
// blocks the fetch, so lite and enriching callers share one flight.
const inFlight = new Map<string, Promise<BsMonth>>();

export interface GetBsMonthOptions {
  // When false, skip the (relatively expensive) Hamro Patro enrichment. Used by
  // the date converter, which only needs the AD<->BS date mapping, not tithi.
  enrich?: boolean;
}

// Screens subscribe to hear about months that got richer AFTER getBsMonth
// resolved: background Hamro Patro enrichment, or a stale-cache refresh.
type MonthUpdateListener = (bsYear: number, bsMonth: number) => void;
const monthUpdateListeners = new Set<MonthUpdateListener>();

export function subscribeBsMonthUpdates(listener: MonthUpdateListener): () => void {
  monthUpdateListeners.add(listener);
  return () => { monthUpdateListeners.delete(listener); };
}

function notifyMonthUpdated(bsYear: number, bsMonth: number) {
  for (const listener of monthUpdateListeners) {
    try { listener(bsYear, bsMonth); } catch { /* listener bugs stay local */ }
  }
}

function cacheKey(year: number, month: number): string {
  return `${CACHE_PREFIX}${year}:${month}`;
}

function cacheMonth(year: number, month: number, value: BsMonth) {
  // Fire-and-forget: callers must not wait on an AsyncStorage write.
  setCached(cacheKey(year, month), value, isDegraded(value) ? SHORT_TTL_MS : TTL_MS)
    .catch(() => {});
}

function monthsDiffer(a: BsMonth, b: BsMonth): boolean {
  // enrichWithHamroPatro returns fresh objects even when it added nothing, so
  // compare content — identity checks would loop update notifications forever.
  return JSON.stringify(a.days) !== JSON.stringify(b.days);
}

// One background enrichment per month at a time, with a cooldown so months the
// fallback source genuinely lacks aren't re-scraped on every grid mount.
const enrichInFlight = new Set<string>();
const enrichLastAttempt = new Map<string, number>();
const ENRICH_RETRY_MS = 1000 * 60 * 10;

function enrichInBackground(year: number, month: number, current: BsMonth) {
  const key = cacheKey(year, month);
  const last = enrichLastAttempt.get(key) || 0;
  if (enrichInFlight.has(key) || Date.now() - last < ENRICH_RETRY_MS) return;
  enrichInFlight.add(key);
  enrichLastAttempt.set(key, Date.now());
  (async () => {
    try {
      const enriched = await enrichWithHamroPatro(current);
      if (monthsDiffer(enriched, current)) {
        cacheMonth(year, month, enriched);
        notifyMonthUpdated(year, month);
      }
    } catch {
      // Keep the skeleton on screen; a later view retries after the cooldown.
    } finally {
      enrichInFlight.delete(key);
    }
  })();
}

// Background revalidation of expired cache entries (stale-while-revalidate).
const refreshInFlight = new Set<string>();
const refreshLastAttempt = new Map<string, number>();
const REFRESH_RETRY_MS = 1000 * 60;

function refreshInBackground(year: number, month: number, stale: BsMonth) {
  const key = cacheKey(year, month);
  const last = refreshLastAttempt.get(key) || 0;
  if (refreshInFlight.has(key) || Date.now() - last < REFRESH_RETRY_MS) return;
  refreshInFlight.add(key);
  refreshLastAttempt.set(key, Date.now());
  (async () => {
    try {
      const result = await fetchBsMonthRaw(year, month);
      cacheMonth(year, month, result);
      if (isDegraded(result)) enrichInBackground(year, month, result);
      if (monthsDiffer(result, stale)) notifyMonthUpdated(year, month);
    } catch {
      // Offline: the stale month stays on screen and we retry after cooldown.
    } finally {
      refreshInFlight.delete(key);
    }
  })();
}

/** Primary source with retries, whole-month Hamro Patro as a last resort. */
async function fetchBsMonthRaw(year: number, month: number): Promise<BsMonth> {
  const paddedMonth = String(month).padStart(2, '0');
  const url = `${BASE}/${year}/${paddedMonth}.json`;

  let lastErr: any = null;
  for (let i = 0; i < 2; i++) {
    try {
      const rawData = await fetchJson<any[]>(url);
      return normalizeBsMonth(rawData, year, month);
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  try {
    return await buildMonthFromHamroPatro(year, month);
  } catch (e) {
    throw lastErr ?? e ?? new Error('Failed to fetch BS month');
  }
}

export async function getBsMonth(
  year: number,
  month: number,
  opts?: GetBsMonthOptions,
): Promise<BsMonth> {
  const enrich = opts?.enrich !== false;

  const cached = await getCachedWithMeta<BsMonth>(cacheKey(year, month));
  if (cached) {
    // Serve instantly; repair whatever is lacking in the background and let
    // subscribers know when something better lands.
    if (!cached.fresh) {
      refreshInBackground(year, month, cached.value);
    } else if (enrich && isDegraded(cached.value)) {
      enrichInBackground(year, month, cached.value);
    }
    return cached.value;
  }

  const key = cacheKey(year, month);
  let flight = inFlight.get(key);
  if (!flight) {
    flight = fetchBsMonthRaw(year, month).finally(() => inFlight.delete(key));
    inFlight.set(key, flight);
  }
  const result = await flight;

  if (isDegraded(result)) {
    if (enrich) {
      // Return the date-complete month NOW and pull tithi/panchang from Hamro
      // Patro in the background — blocking first paint on an HTML scrape made
      // every uncached month feel broken.
      cacheMonth(year, month, result);
      enrichInBackground(year, month, result);
    }
    // Lite callers never cache a degraded month, so they can't overwrite a
    // richer version the calendar grid may store later.
  } else {
    cacheMonth(year, month, result);
  }
  return result;
}

function npText(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.np || value.en || '';
}

function normalizeBsMonth(rawData: any[], year: number, month: number): BsMonth {
  const days: BsDay[] = rawData.map((item: any, index: number) => {
    const bsDate = item.calendarInfo?.dates?.bs;
    const adDate = item.calendarInfo?.dates?.ad;
    const events = item.eventDetails || [];
    
    // Extract all event titles
    const eventNames = events.map((e: any) => e.title?.en || e.title?.np).filter(Boolean);

    // Find holiday
    const holiday = events.find((e: any) => e.isHoliday);
    let holidayName = null;
    if (holiday) {
      holidayName = holiday.title?.en || holiday.title?.np;
    }

    const weekdayCode = parseInt(item.calendarInfo?.days?.codes?.en || '1');
    const weekday = weekdayCode - 1;

    // Ensure ISO format YYYY-MM-DD
    let iso = adDate?.full?.en || '';
    if (iso) {
      const parts = iso.split('-');
      if (parts.length === 3) {
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        iso = `${y}-${m}-${d}`;
      }
    }

    const panchanga = item.panchangaDetails || {};
    const times = panchanga.times || {};
    const tithiDetails = item.tithiDetails || {};
    const nepaliEra = item.calendarInfo?.nepaliEra || {};
    const auspicious = item.auspiciousMoments || {};

    const tithiNp =
      tithiDetails.title?.np ||
      panchanga.tithi?.title?.np ||
      '';

    // Extract all available panchanga data (supports legacy bikram.io and enriched mahansigdel schemas)
    const extraDetails: any = {
      // Times - direct strings (Devanagari format like "०६ः५८")
      sunrise: npText(panchanga.sunrise) || times.sunrise || '',
      sunset: npText(panchanga.sunset) || times.sunset || '',
      moonrise: npText(panchanga.moonrise) || times.moonrise || '',
      moonset: npText(panchanga.moonset) || times.moonset || '',
      
      // Tithi details
      tithiEnd: npText(panchanga.tithi?.endTime) || npText(tithiDetails.endTime) || '',
      tithiEndDisplay: npText(tithiDetails.display) || npText(panchanga.tithi?.endTime) || '',
      
      // Panchanga Details - strings, not objects
      pakshya:
        npText(panchanga.paksha) ||
        npText(panchanga.pakshya) ||
        npText(tithiDetails.paksha) ||
        '',
      nakshatra: npText(panchanga.nakshatra?.title) || npText(panchanga.nakshatra) || '',
      nakshatraEnd: npText(panchanga.nakshatra?.endTime) || '',
      yog: npText(panchanga.yoga?.title) || npText(panchanga.yog) || '',
      yogEnd: npText(panchanga.yoga?.endTime) || npText(panchanga.yog?.endTime) || '',
      karan: npText(panchanga.karana?.title) || npText(panchanga.karans?.first) || '',
      karanSecond: npText(panchanga.karans?.second) || '',
      
      // Rashi - chandraRashi uses .time field, suryaRashi is direct
      chandraRashi: npText(panchanga.chandraRashi?.time) || npText(panchanga.chandraRashi) || '',
      chandraRashiEnd: npText(panchanga.chandraRashi?.endTime) || '',
      suryaRashi: npText(panchanga.suryaRashi) || '',
      
      // Season
      ritu:
        item.hrituDetails?.title?.en ||
        item.hrituDetails?.title?.np ||
        panchanga.season?.name?.en ||
        '',
      
      // Muhurats (auspicious times)
      muhurats:
        auspicious.muhurats
          ?.map((m: any) => {
            const from = m.timing?.from;
            const to = m.timing?.to;
            const time =
              m.duration ||
              (from && to ? `${from} - ${to}` : from || to || '');
            const name = m.periodName || npText(m.title) || npText(m.result) || '';
            return { name, time };
          })
          .filter((m: any) => m.name && m.time) || [],
    };

    // Nepal Sambat and Sak Sambat
    const nepalSambat = parseInt(nepaliEra.nepalSambat?.year?.en || '0') || undefined;
    const sakSambat = parseInt(nepaliEra.sakSambat?.year?.en || '0') || undefined;
    
    return {
      bsYear: parseInt(bsDate?.year?.en || year),
      bsMonth: parseInt(bsDate?.month?.code?.en || month),
      bsDay: parseInt(bsDate?.day?.en || '1'),
      adDateISO: iso,
      weekday: weekday, 
      tithiRom: romanizeTithi(tithiNp),
      holidayNameRom: holidayName,
      events: eventNames,
      nepalSambat,
      sakSambat,
      extraDetails
    };
  });

  return {
    bsYear: year,
    bsMonth: month,
    bsMonthNameRom: getBsMonthName(month),
    days,
  };
}

export async function getAdMonth(adYear: number, adMonth: number): Promise<BsMonth> {
  const map: Record<number, number[]> = {
    1: [9, 10], 2: [10, 11], 3: [11, 12], 4: [12, 1], 5: [1, 2], 6: [2, 3],
    7: [3, 4], 8: [4, 5], 9: [5, 6], 10: [6, 7], 11: [7, 8], 12: [8, 9]
  };

  const targetBsMonths = map[adMonth];

  // Fetch the two overlapping BS months in parallel: sequential awaits doubled
  // the wait for every uncached AD month view.
  const results = await Promise.all(
    targetBsMonths.map((bsMonth) => {
      let fetchYear = adYear + 57;
      if (adMonth < 4) fetchYear = adYear + 56;
      if (adMonth === 4 && bsMonth === 12) fetchYear = adYear + 56;
      return getBsMonth(fetchYear, bsMonth).catch((e) => {
        console.warn(`Failed to fetch BS ${fetchYear}/${bsMonth} for AD ${adYear}/${adMonth}`);
        return null;
      });
    }),
  );

  const days: BsDay[] = [];
  for (const monthData of results) {
    if (monthData) days.push(...monthData.days);
  }

  // Compare the ISO string directly: new Date("YYYY-MM-DD") parses as UTC
  // midnight, so local getFullYear()/getMonth() shift the date by a day in
  // negative-UTC timezones and would mis-filter the whole month.
  const adPrefix = `${adYear}-${String(adMonth).padStart(2, '0')}`;
  const filteredDays = days.filter(d => d.adDateISO.startsWith(adPrefix));

  filteredDays.sort((a, b) => {
    const [y1, m1, d1] = a.adDateISO.split('-').map(Number);
    const [y2, m2, d2] = b.adDateISO.split('-').map(Number);
    return (y1 - y2) || (m1 - m2) || (d1 - d2);
  });

  const uniqueDays = Array.from(new Map(filteredDays.map(item => [item.adDateISO, item])).values());

  if (!uniqueDays.length) {
    throw new Error('Failed to load calendar for this month');
  }

  return {
    bsYear: adYear + 57,
    bsMonth: 0,
    bsMonthNameRom: new Date(adYear, adMonth - 1).toLocaleString('default', { month: 'long' }),
    days: uniqueDays,
  };
}
