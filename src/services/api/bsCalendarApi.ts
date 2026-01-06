import { getBsMonthName, romanizeTithi } from '@/src/domain/calendar/labels';
import { getCached, setCached } from '@/src/services/cache/asyncStorage';
import { BsDay, BsMonth } from '../../domain/calendar/types';

const BASE = 'https://data.miti.bikram.io/data';
const CACHE_PREFIX = 'bs-month-v3:'; // Versioned cache to invalidate old data
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

// Helper to parse potentially malformed JSON (though the new endpoint should be clean)
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
  const days: BsDay[] = rawData.map((item: any) => {
    const bsDate = item.calendarInfo?.dates?.bs;
    const adDate = item.calendarInfo?.dates?.ad;
    const tithi = item.tithiDetails?.title?.np;
    const events = item.eventDetails || [];
    
    // Extract all event titles
    const eventNames = events.map((e: any) => e.title?.en || e.title?.np).filter(Boolean);

    // Find holiday
    const holiday = events.find((e: any) => e.isHoliday);
    let holidayName = null;
    if (holiday) {
      holidayName = holiday.title?.en || holiday.title?.np; // Prefer EN if available
    }

    // Weekday: 1=Sun, 7=Sat in API? 
    // API says: "dayOfWeek": { "np": "बिहिवार", "en": "Thursday" }, "codes": { "np": "५", "en": "5" }
    // If 1=Sunday, then 5=Thursday. 
    // JS Date.getDay(): 0=Sunday, 4=Thursday.
    // So we need to subtract 1 from the API code.
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

    const panchanga = item.panchangaDetails || item.panchanga || {};
    const times = panchanga.times || {};
    
    return {
      bsYear: parseInt(bsDate?.year?.en || year),
      bsMonth: parseInt(bsDate?.month?.code?.en || month),
      bsDay: parseInt(bsDate?.day?.en || '1'),
      adDateISO: iso,
      weekday: weekday, 
      tithiRom: romanizeTithi(tithi),
      holidayNameRom: holidayName,
      events: eventNames,
      extraDetails: {
        sunrise: times.sunrise || panchanga.sunrise,
        sunset: times.sunset || panchanga.sunset,
        nakshatra: panchanga.nakshatra?.np || panchanga.nakshatra?.name?.en || panchanga.nakshatra?.name?.np,
        yog: panchanga.yog?.np || panchanga.yog?.name?.en || panchanga.yog?.name?.np,
        karan: panchanga.karans?.first?.np || panchanga.karan?.name?.en || panchanga.karan?.name?.np,
        ritu: item.hrituDetails?.title?.en || item.hrituDetails?.title?.np || item.calendarInfo?.ritu?.en || item.calendarInfo?.ritu?.np,
      }
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
  // 1. Determine likely BS year and months
  // AD Month 1 (Jan) -> BS Month 9/10 of (adYear + 56)
  // AD Month 4 (Apr) -> BS Month 12 of (adYear + 56) / BS Month 1 of (adYear + 57)
  
  const bsYearStart = adMonth < 4 ? adYear + 56 : adYear + 57;
  // If adMonth is 1 (Jan), we need BS months 9 and 10 of bsYearStart.
  // If adMonth is 4 (Apr), we need BS month 12 of (adYear+56) and BS month 1 of (adYear+57).
  
  // Simplified mapping of AD Month to likely BS Months (approximate)
  // 1: [9, 10], 2: [10, 11], 3: [11, 12], 4: [12, 1], 5: [1, 2], ...
  const map: Record<number, number[]> = {
    1: [9, 10], 2: [10, 11], 3: [11, 12], 4: [12, 1], 5: [1, 2], 6: [2, 3],
    7: [3, 4], 8: [4, 5], 9: [5, 6], 10: [6, 7], 11: [7, 8], 12: [8, 9]
  };

  const targetBsMonths = map[adMonth];
  const days: BsDay[] = [];

  for (const bsMonth of targetBsMonths) {
    // Adjust year if we wrapped around (e.g. month 12 -> 1)
    // For Apr (4): [12, 1]. 12 is year X, 1 is year X+1.
    let y = bsYearStart;
    if (adMonth === 4 && bsMonth === 12) y = adYear + 56; // Chaitra is previous year
    if (adMonth === 4 && bsMonth === 1) y = adYear + 57; // Baisakh is new year
    
    // General case correction is hard without exact logic, but let's try:
    // If adMonth < 4, we are in adYear+56.
    // If adMonth >= 4, we are mostly in adYear+57.
    // Exception: Chaitra (12) usually falls in Mar/Apr.
    
    // Let's just fetch based on the map and handle the year carefully.
    // If adMonth is Jan(1), bsYear is adYear+56. Months 9, 10. Correct.
    // If adMonth is Dec(12), bsYear is adYear+57. Months 8, 9. Correct.
    
    // Special case: April (4).
    // Mid-April is New Year.
    // Early April is Chaitra (12) of adYear+56.
    // Late April is Baisakh (1) of adYear+57.
    
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

  // Filter days that belong to the requested AD month
  const filteredDays = days.filter(d => {
    const date = new Date(d.adDateISO);
    return date.getFullYear() === adYear && (date.getMonth() + 1) === adMonth;
  });

  // Sort by date just in case
  filteredDays.sort((a, b) => {
    const [y1, m1, d1] = a.adDateISO.split('-').map(Number);
    const [y2, m2, d2] = b.adDateISO.split('-').map(Number);
    return (y1 - y2) || (m1 - m2) || (d1 - d2);
  });

  // Remove duplicates if any
  const uniqueDays = Array.from(new Map(filteredDays.map(item => [item.adDateISO, item])).values());

  return {
    bsYear: adYear + 57, // Placeholder
    bsMonth: 0, // Placeholder
    bsMonthNameRom: new Date(adYear, adMonth - 1).toLocaleString('default', { month: 'long' }),
    days: uniqueDays,
  };
}
