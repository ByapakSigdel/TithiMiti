import { findBsDayByAd } from '@/src/domain/calendar/bsCalendar';
import { AdDay, BsDay, BsMonth, ConverterResult } from '@/src/domain/calendar/types';
import { getBsMonth } from '@/src/services/api/bsCalendarApi';

function isoToYMD(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  return { y, m, d };
}

async function fetchSurroundingBsMonths(adISO: string): Promise<BsMonth[]> {
  const { y, m } = isoToYMD(adISO);
  
  // Approximate BS Year
  // Mid-April is the cutoff.
  // If month > 4, we are definitely in AD+57.
  // If month < 4, we are in AD+56.
  // If month == 4, could be either.
  
  const baseYear = m > 4 ? y + 57 : y + 56;
  
  // Approximate BS Month
  // AD Jan (1) -> BS Poush (9)
  // AD Apr (4) -> BS Chaitra (12) / Baisakh (1)
  // AD Dec (12) -> BS Poush (9)
  // Formula: (m + 8) % 12 || 12 seems roughly okay for offset.
  // 1+8 = 9 (Poush). 12+8 = 20 -> 8 (Mangsir).
  // Wait, Dec is usually Poush (9).
  // Let's just fetch a wider range to be safe.
  
  const approxBsMonth = (m + 8) % 12 || 12;

  const candidates = [
    { year: baseYear, month: approxBsMonth },
    { year: baseYear, month: approxBsMonth - 1 },
    { year: baseYear, month: approxBsMonth + 1 },
    // Add year boundary checks
    { year: m === 4 ? y + 57 : baseYear, month: 1 }, 
    { year: m === 4 ? y + 56 : baseYear, month: 12 },
  ];

  // Normalize months
  const normalizedCandidates = candidates.map(c => {
    let { year, month } = c;
    if (month < 1) { month = 12; year--; }
    if (month > 12) { month = 1; year++; }
    return { year, month };
  });

  // Deduplicate
  const unique = normalizedCandidates.filter((v, i, a) => a.findIndex(t => t.year === v.year && t.month === v.month) === i);

  const results = await Promise.all(unique.map(({ year, month }) => getBsMonth(year, month).catch(() => null)));
  return results.filter((r: BsMonth | null): r is BsMonth => r !== null);
}

export async function convertAdToBs(adISO: string): Promise<ConverterResult> {
  const months = await fetchSurroundingBsMonths(adISO);
  for (const m of months) {
    const bs = findBsDayByAd(m, adISO);
    if (bs) {
      const ad: AdDay = {
        dateISO: adISO,
        day: parseInt(adISO.slice(8, 10), 10),
        month: parseInt(adISO.slice(5, 7), 10),
        year: parseInt(adISO.slice(0, 4), 10),
        weekday: new Date(adISO + 'T00:00:00').getDay(),
      };
      return { mode: 'BS', bs, ad };
    }
  }
  // Fallback if not found (shouldn't happen if API works)
  return { mode: 'BS' };
}

export async function convertBsToAd(bsYear: number, bsMonth: number, bsDay: number): Promise<ConverterResult> {
  try {
    const monthData = await getBsMonth(bsYear, bsMonth);
    const dayData = monthData.days.find((d: BsDay) => d.bsDay === bsDay);
    
    if (dayData) {
      const adISO = dayData.adDateISO;
      const ad: AdDay = {
        dateISO: adISO,
        day: parseInt(adISO.slice(8, 10), 10),
        month: parseInt(adISO.slice(5, 7), 10),
        year: parseInt(adISO.slice(0, 4), 10),
        weekday: new Date(adISO + 'T00:00:00').getDay(),
      };
      return { mode: 'AD', bs: dayData, ad };
    }
  } catch (e) {
    console.error(e);
  }
  return { mode: 'AD' };
}
