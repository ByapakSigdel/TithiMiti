import { AdDay } from '@/src/domain/calendar/types';

export function getAdMonthDays(year: number, month: number): AdDay[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const result: AdDay[] = [];
  let d = new Date(first);
  while (d.getUTCMonth() === first.getUTCMonth()) {
    result.push({
      dateISO: d.toISOString().slice(0, 10),
      day: d.getUTCDate(),
      month,
      year,
      weekday: d.getUTCDay(),
    });
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return result;
}
