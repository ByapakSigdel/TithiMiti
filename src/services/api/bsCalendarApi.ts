import { getBsMonthName, romanizeTithi } from '@/src/domain/calendar/labels';
import { getCached, setCached } from '@/src/services/cache/asyncStorage';
import { BsDay, BsMonth } from '../../domain/calendar/types';

const BASE = 'https://data.miti.bikram.io/data';
const CACHE_PREFIX = 'bs-month-v5:'; // Versioned cache
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

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

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const text = await res.text();
  return tryParse(text) as T;
}

export async function getBsMonth(year: number, month: number): Promise<BsMonth> {
  const key = `${CACHE_PREFIX}${year}:${month}`;
  const cached = await getCached<BsMonth>(key);
  if (cached) return cached;

  const paddedMonth = String(month).padStart(2, '0');
  const url = `${BASE}/${year}/${paddedMonth}.json`;
  
  let lastErr: any = null;
  for (let i = 0; i < 2; i++) {
    try {
      const rawData = await fetchJson<any[]>(url);
      console.log('[API] Fetched raw data, first item:', JSON.stringify(rawData[0], null, 2).substring(0, 500));
      const normalized = normalizeBsMonth(rawData, year, month);
      await setCached(key, normalized, TTL_MS);
      return normalized;
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw lastErr ?? new Error('Failed to fetch BS month');
}

function normalizeBsMonth(rawData: any[], year: number, month: number): BsMonth {
  const days: BsDay[] = rawData.map((item: any, index: number) => {
    const bsDate = item.calendarInfo?.dates?.bs;
    const adDate = item.calendarInfo?.dates?.ad;
    const tithiTitle = item.tithiDetails?.title?.np;
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
    
    // Debug log for first day
    if (index === 0) {
      console.log('[DEBUG] panchanga.times:', JSON.stringify(times, null, 2));
    }
    
    // Extract all available panchanga data
    const extraDetails: any = {
      // Times - direct strings (Devanagari format like "०६ः५८")
      sunrise: times.sunrise || "",
      sunset: times.sunset || "",
      moonrise: times.moonrise || "",
      moonset: times.moonset || "",
      
      // Tithi details
      tithiEnd: tithiDetails.endTime?.np || "",
      tithiEndDisplay: tithiDetails.display?.np || "",
      
      // Panchanga Details - strings, not objects
      pakshya: panchanga.pakshya?.np || "",
      nakshatra: panchanga.nakshatra?.np || "",
      nakshatraEnd: panchanga.nakshatra?.endTime?.np || "",
      yog: panchanga.yog?.np || "",
      yogEnd: panchanga.yog?.endTime?.np || "",
      karan: panchanga.karans?.first?.np || "",
      karanSecond: panchanga.karans?.second?.np || "",
      
      // Rashi - chandraRashi uses .time field, suryaRashi is direct
      chandraRashi: panchanga.chandraRashi?.time?.np || "",
      chandraRashiEnd: panchanga.chandraRashi?.endTime?.np || "",
      suryaRashi: panchanga.suryaRashi?.np || "",
      
      // Season
      ritu: item.hrituDetails?.title?.en || panchanga.season?.name?.en || "",
      
      // Muhurats (auspicious times) - direct string fields
      muhurats: auspicious.muhurats?.map((m: any) => ({
        name: m.periodName || "",
        time: m.duration || ""
      })).filter((m: any) => m.name && m.time) || [],
    };
    
    // Log first day's extraction for debugging
    if (index === 0) {
      console.log('[EXTRACT] First day extraDetails:', JSON.stringify(extraDetails, null, 2));
    }
    
    // Nepal Sambat and Sak Sambat
    const nepalSambat = parseInt(nepaliEra.nepalSambat?.year?.en || '0') || undefined;
    const sakSambat = parseInt(nepaliEra.sakSambat?.year?.en || '0') || undefined;
    
    return {
      bsYear: parseInt(bsDate?.year?.en || year),
      bsMonth: parseInt(bsDate?.month?.code?.en || month),
      bsDay: parseInt(bsDate?.day?.en || '1'),
      adDateISO: iso,
      weekday: weekday, 
      tithiRom: romanizeTithi(item.tithiDetails?.title?.np),
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
  const bsYearStart = adMonth < 4 ? adYear + 56 : adYear + 57;
  
  const map: Record<number, number[]> = {
    1: [9, 10], 2: [10, 11], 3: [11, 12], 4: [12, 1], 5: [1, 2], 6: [2, 3],
    7: [3, 4], 8: [4, 5], 9: [5, 6], 10: [6, 7], 11: [7, 8], 12: [8, 9]
  };

  const targetBsMonths = map[adMonth];
  const days: BsDay[] = [];

  for (const bsMonth of targetBsMonths) {
    let fetchYear = adYear + 57;
    if (adMonth < 4) fetchYear = adYear + 56;
    if (adMonth === 4 && bsMonth === 12) fetchYear = adYear + 56;

    try {
      const monthData = await getBsMonth(fetchYear, bsMonth);
      days.push(...monthData.days);
    } catch (e) {
      console.warn(`Failed to fetch BS ${fetchYear}/${bsMonth} for AD ${adYear}/${adMonth}`);
    }
  }

  const filteredDays = days.filter(d => {
    const date = new Date(d.adDateISO);
    return date.getFullYear() === adYear && (date.getMonth() + 1) === adMonth;
  });

  filteredDays.sort((a, b) => {
    const [y1, m1, d1] = a.adDateISO.split('-').map(Number);
    const [y2, m2, d2] = b.adDateISO.split('-').map(Number);
    return (y1 - y2) || (m1 - m2) || (d1 - d2);
  });

  const uniqueDays = Array.from(new Map(filteredDays.map(item => [item.adDateISO, item])).values());

  return {
    bsYear: adYear + 57,
    bsMonth: 0,
    bsMonthNameRom: new Date(adYear, adMonth - 1).toLocaleString('default', { month: 'long' }),
    days: uniqueDays,
  };
}
