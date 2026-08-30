import { findBsDayByAd } from '@/src/domain/calendar/bsCalendar';
import { localAdToBs, localBsToAdISO } from '@/src/domain/calendar/localBsCalendar';
import { AdDay, BsDay, BsMonth, ConverterResult } from '@/src/domain/calendar/types';
import { getBsMonth } from '@/src/services/api/bsCalendarApi';

function isoToYMD(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  return { y, m, d };
}

// Maps an AD (Gregorian) month to the (at most two) BS months that overlap it,
// matching the logic used to render the AD calendar grid. Any AD date in a
// given AD month falls within one of these two BS months.
function bsMonthsOverlappingAd(adYear: number, adMonth: number): { year: number; month: number }[] {
  const map: Record<number, number[]> = {
    1: [9, 10], 2: [10, 11], 3: [11, 12], 4: [12, 1], 5: [1, 2], 6: [2, 3],
    7: [3, 4], 8: [4, 5], 9: [5, 6], 10: [6, 7], 11: [7, 8], 12: [8, 9],
  };
  return (map[adMonth] || []).map((bsMonth) => {
    let fetchYear = adYear + 57;
    if (adMonth < 4) fetchYear = adYear + 56;
    if (adMonth === 4 && bsMonth === 12) fetchYear = adYear + 56;
    return { year: fetchYear, month: bsMonth };
  });
}

async function fetchSurroundingBsMonths(adISO: string): Promise<BsMonth[]> {
  const { y, m } = isoToYMD(adISO);

  // Only the two BS months that overlap this AD month are needed.
  const unique = bsMonthsOverlappingAd(y, m);

  // The converter only needs the AD<->BS date mapping, which the primary source
  // provides even for "skeleton" months. Skip Hamro Patro enrichment here so a
  // single conversion never triggers an HTML scrape.
  const results = await Promise.all(
    unique.map(({ year, month }) => getBsMonth(year, month, { enrich: false }).catch(() => null)),
  );
  return results.filter((r: BsMonth | null): r is BsMonth => r !== null);
}

function adDayFromISO(adISO: string): AdDay {
  return {
    dateISO: adISO,
    day: parseInt(adISO.slice(8, 10), 10),
    month: parseInt(adISO.slice(5, 7), 10),
    year: parseInt(adISO.slice(0, 4), 10),
    weekday: new Date(adISO + 'T00:00:00').getDay(),
  };
}

export async function convertAdToBs(adISO: string): Promise<ConverterResult> {
  // Bundled table first: synchronous and offline. The network path below only
  // serves dates outside the bundled range.
  const localBs = localAdToBs(adISO);
  if (localBs) {
    return { mode: 'BS', bs: localBs, ad: adDayFromISO(adISO) };
  }

  const months = await fetchSurroundingBsMonths(adISO);
  for (const m of months) {
    const bs = findBsDayByAd(m, adISO);
    if (bs) {
      return { mode: 'BS', bs, ad: adDayFromISO(adISO) };
    }
  }
  // Fallback if not found (shouldn't happen if API works)
  return { mode: 'BS' };
}

export async function convertBsToAd(bsYear: number, bsMonth: number, bsDay: number): Promise<ConverterResult> {
  // Bundled table first: synchronous and offline.
  const localISO = localBsToAdISO(bsYear, bsMonth, bsDay);
  if (localISO) {
    const bs = localAdToBs(localISO);
    if (bs) {
      return { mode: 'AD', bs, ad: adDayFromISO(localISO) };
    }
  }

  try {
    const monthData = await getBsMonth(bsYear, bsMonth);
    const dayData = monthData.days.find((d: BsDay) => d.bsDay === bsDay);

    if (dayData) {
      return { mode: 'AD', bs: dayData, ad: adDayFromISO(dayData.adDateISO) };
    }
  } catch (e) {
    console.error(e);
  }
  return { mode: 'AD' };
}
