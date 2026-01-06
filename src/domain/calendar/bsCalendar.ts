import { BsDay, BsMonth } from '@/src/domain/calendar/types';
import { areDatesEqual } from '@/src/utils/dateUtils';

export function findBsDayByAd(month: BsMonth, adISO: string): BsDay | undefined {
  return month.days.find((d) => areDatesEqual(d.adDateISO, adISO));
}

export function findAdISOByBs(month: BsMonth, bsDay: number): string | undefined {
  return month.days.find((d) => d.bsDay === bsDay)?.adDateISO;
}
