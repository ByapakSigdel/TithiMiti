import { getBsMonthName } from './labels';
import { BsDay, BsMonth } from './types';
import {
  BS_DATA_START_YEAR,
  BS_DATA_END_YEAR,
  BS_DATA_TOTAL_DAYS,
  BS_EPOCH_AD_ISO,
  BS_MONTH_DAYS,
} from './bsCalendarData';

// Local, synchronous BS<->AD conversion over the bundled table
// (bsCalendarData.ts). Everything here is date arithmetic only — no tithi,
// panchang, or events — so the calendar grid can paint instantly and offline,
// with details layered on top when the network responds.

const MS_PER_DAY = 86400000;

function isoToUtcDays(iso: string): number | null {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS_PER_DAY;
}

function utcDaysToIso(days: number): string {
  return new Date(days * MS_PER_DAY).toISOString().slice(0, 10);
}

function weekdayOf(utcDays: number): number {
  return new Date(utcDays * MS_PER_DAY).getUTCDay();
}

const EPOCH_DAYS = isoToUtcDays(BS_EPOCH_AD_ISO) as number;

// Cumulative day offset of Baisakh 1 for each covered year, so year lookups
// don't rescan the whole table.
const YEAR_START_OFFSETS: number[] = (() => {
  const offsets: number[] = [];
  let acc = 0;
  for (const row of BS_MONTH_DAYS) {
    offsets.push(acc);
    for (const len of row) acc += len;
  }
  return offsets;
})();

export function isBsMonthInLocalRange(bsYear: number, bsMonth: number): boolean {
  return (
    bsYear >= BS_DATA_START_YEAR &&
    bsYear <= BS_DATA_END_YEAR &&
    bsMonth >= 1 &&
    bsMonth <= 12
  );
}

export function daysInLocalBsMonth(bsYear: number, bsMonth: number): number | null {
  if (!isBsMonthInLocalRange(bsYear, bsMonth)) return null;
  return BS_MONTH_DAYS[bsYear - BS_DATA_START_YEAR][bsMonth - 1];
}

/** AD ISO date for a BS date, or null when outside the bundled range. */
export function localBsToAdISO(bsYear: number, bsMonth: number, bsDay: number): string | null {
  const monthLen = daysInLocalBsMonth(bsYear, bsMonth);
  if (!monthLen || bsDay < 1 || bsDay > monthLen) return null;

  const yearRow = BS_MONTH_DAYS[bsYear - BS_DATA_START_YEAR];
  let offset = YEAR_START_OFFSETS[bsYear - BS_DATA_START_YEAR];
  for (let m = 1; m < bsMonth; m++) offset += yearRow[m - 1];
  offset += bsDay - 1;

  return utcDaysToIso(EPOCH_DAYS + offset);
}

/** BS date for an AD ISO date, or null when outside the bundled range. */
export function localAdToBs(adISO: string): BsDay | null {
  const target = isoToUtcDays(adISO);
  if (target === null) return null;

  let offset = target - EPOCH_DAYS;
  if (offset < 0 || offset >= BS_DATA_TOTAL_DAYS) return null;

  let yearIdx = 0;
  while (
    yearIdx + 1 < YEAR_START_OFFSETS.length &&
    YEAR_START_OFFSETS[yearIdx + 1] <= offset
  ) {
    yearIdx++;
  }
  offset -= YEAR_START_OFFSETS[yearIdx];

  const row = BS_MONTH_DAYS[yearIdx];
  let month = 1;
  while (offset >= row[month - 1]) {
    offset -= row[month - 1];
    month++;
  }

  return {
    bsYear: BS_DATA_START_YEAR + yearIdx,
    bsMonth: month,
    bsDay: offset + 1,
    adDateISO: adISO,
    weekday: weekdayOf(target),
  };
}

/**
 * A full BS month with correct dates and weekdays but no tithi/events —
 * renders instantly while the detailed month loads.
 */
export function getLocalBsMonthSkeleton(bsYear: number, bsMonth: number): BsMonth | null {
  const monthLen = daysInLocalBsMonth(bsYear, bsMonth);
  const firstISO = localBsToAdISO(bsYear, bsMonth, 1);
  if (!monthLen || !firstISO) return null;

  const firstDays = isoToUtcDays(firstISO) as number;
  const days: BsDay[] = [];
  for (let d = 0; d < monthLen; d++) {
    days.push({
      bsYear,
      bsMonth,
      bsDay: d + 1,
      adDateISO: utcDaysToIso(firstDays + d),
      weekday: weekdayOf(firstDays + d),
      events: [],
      holidayNameRom: null,
    });
  }

  return { bsYear, bsMonth, bsMonthNameRom: getBsMonthName(bsMonth), days };
}

/** Same skeleton, but for a Gregorian month view. */
export function getLocalAdMonthSkeleton(adYear: number, adMonth: number): BsMonth | null {
  const monthLen = new Date(Date.UTC(adYear, adMonth, 0)).getUTCDate();
  const days: BsDay[] = [];
  for (let d = 1; d <= monthLen; d++) {
    const iso = `${adYear}-${String(adMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const bs = localAdToBs(iso);
    if (!bs) return null; // partially covered AD months fall back to the network
    days.push({ ...bs, events: [], holidayNameRom: null });
  }

  return {
    bsYear: days[0].bsYear,
    bsMonth: 0,
    bsMonthNameRom: new Date(adYear, adMonth - 1).toLocaleString('default', { month: 'long' }),
    days,
  };
}
