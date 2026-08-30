import { getBsMonthName, romanizeTithi } from '@/src/domain/calendar/labels';
import { getCached, setCached } from '@/src/services/cache/asyncStorage';
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

// De-duplicate concurrent fetches of the same month. The map is keyed by the
// month plus whether the caller wants Hamro Patro enrichment, so a lightweight
// (date-only) request never starves a full enriching request and vice-versa.
const inFlight = new Map<string, Promise<BsMonth>>();

export interface GetBsMonthOptions {
  // When false, skip the (relatively expensive) Hamro Patro enrichment. Used by
  // the date converter, which only needs the AD<->BS date mapping, not tithi.
  enrich?: boolean;
}

async function fetchBsMonth(
  year: number,
  month: number,
  enrich: boolean,
): Promise<{ month: BsMonth; cacheable: boolean }> {
  const paddedMonth = String(month).padStart(2, '0');
  const url = `${BASE}/${year}/${paddedMonth}.json`;

  let normalized: BsMonth | null = null;
  let lastErr: any = null;

  // 1) Try the primary source.
  for (let i = 0; i < 2; i++) {
    try {
      const rawData = await fetchJson<any[]>(url);
      normalized = normalizeBsMonth(rawData, year, month);
      break;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 400));
    }
  }

  // 2) Primary failed entirely -> fall back to Hamro Patro for the whole month.
  if (!normalized) {
    try {
      const fallback = await buildMonthFromHamroPatro(year, month);
      return { month: fallback, cacheable: true };
    } catch (e) {
      throw lastErr ?? e ?? new Error('Failed to fetch BS month');
    }
  }

  // 3) Primary returned skeleton data (missing tithi/panchang).
  if (isDegraded(normalized)) {
    if (enrich) {
      // Enrich the missing days from Hamro Patro and cache the merged result.
      normalized = await enrichWithHamroPatro(normalized);
      return { month: normalized, cacheable: true };
    }
    // Lightweight caller: return the date-only month but don't cache it, so we
    // never overwrite a richer enriched version the calendar grid may store.
    return { month: normalized, cacheable: false };
  }

  // Full data straight from the primary source.
  return { month: normalized, cacheable: true };
}

export async function getBsMonth(
  year: number,
  month: number,
  opts?: GetBsMonthOptions,
): Promise<BsMonth> {
  const enrich = opts?.enrich !== false;
  const key = `${CACHE_PREFIX}${year}:${month}`;

  const cached = await getCached<BsMonth>(key);
  if (cached) return cached;

  // Reuse an in-flight request when possible. An enriching request can only
  // reuse another enriching request; a lightweight request can reuse either.
  const enrichKey = `${key}|e`;
  const liteKey = `${key}|r`;
  const reusable = enrich
    ? inFlight.get(enrichKey)
    : inFlight.get(enrichKey) || inFlight.get(liteKey);
  if (reusable) return reusable;

  const flightKey = enrich ? enrichKey : liteKey;
  const promise = (async () => {
    const { month: result, cacheable } = await fetchBsMonth(year, month, enrich);
    if (cacheable) {
      await setCached(key, result, isDegraded(result) ? SHORT_TTL_MS : TTL_MS);
    }
    return result;
  })();

  inFlight.set(flightKey, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(flightKey);
  }
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
