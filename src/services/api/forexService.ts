// Foreign-exchange rates against the Nepali Rupee (NPR).
//
// Primary source: Nepal Rastra Bank (NRB), the country's central bank, which
// publishes official daily buy/sell rates. Some currencies are quoted per
// multiple units (INR per 100, JPY per 10), which `unit` captures so we can
// normalise to a per-single-unit rate.
//
// Fallback: open.er-api.com (free, no key) when NRB is unreachable, so the tool
// still works. The fallback only carries a single mid rate (buy == sell).

import { getForexCache, setForexCache } from '../cache/forexCache';

export interface ForexRate {
  code: string; // ISO-3, e.g. "USD"
  name: string; // e.g. "U.S. Dollar"
  unit: number; // foreign units the buy/sell are quoted per
  buy: number; // NPR for `unit` foreign units
  sell: number; // NPR for `unit` foreign units
  nprPerUnit: number; // mid rate normalised to NPR per 1 foreign unit
}

export interface ForexData {
  date: string; // rate date (YYYY-MM-DD)
  source: string; // "NRB" | "open.er-api.com"
  rates: ForexRate[];
}

const NRB_URL = 'https://www.nrb.org.np/api/forex/v1/rates';
const FALLBACK_URL = 'https://open.er-api.com/v6/latest/USD';

// Currencies surfaced when falling back to open.er-api (which has no NPR-native
// quoting). Names match NRB's labels so the UI looks consistent.
const FALLBACK_CURRENCIES: { code: string; name: string }[] = [
  { code: 'USD', name: 'U.S. Dollar' },
  { code: 'EUR', name: 'European Euro' },
  { code: 'GBP', name: 'UK Pound Sterling' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Arabian Riyal' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'KRW', name: 'South Korean Won' },
  { code: 'HKD', name: 'Hong Kong Dollar' },
];

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function fetchNrb(): Promise<ForexData> {
  // Query a small window ending today so weekends/holidays still resolve to the
  // most recently published day.
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 6);
  const url = `${NRB_URL}?page=1&per_page=100&from=${ymd(from)}&to=${ymd(to)}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`NRB HTTP ${res.status}`);
  const json = await res.json();

  const payload: any[] = json?.data?.payload ?? [];
  if (!payload.length) throw new Error('NRB empty payload');

  // Pick the most recent published day in the window.
  const latest = payload.reduce((a, b) => (a.date > b.date ? a : b));
  const rates: ForexRate[] = (latest.rates ?? [])
    .map((r: any): ForexRate | null => {
      const unit = Number(r?.currency?.unit) || 1;
      const buy = parseFloat(r?.buy);
      const sell = parseFloat(r?.sell);
      if (!isFinite(buy) || !isFinite(sell)) return null;
      return {
        code: r.currency.iso3,
        name: r.currency.name,
        unit,
        buy,
        sell,
        nprPerUnit: (buy + sell) / 2 / unit,
      };
    })
    .filter((r: ForexRate | null): r is ForexRate => r !== null);

  if (!rates.length) throw new Error('NRB no usable rates');
  return { date: latest.date, source: 'NRB', rates };
}

async function fetchFallback(): Promise<ForexData> {
  const res = await fetch(FALLBACK_URL);
  if (!res.ok) throw new Error(`fallback HTTP ${res.status}`);
  const json = await res.json();
  if (json?.result !== 'success') throw new Error('fallback result not success');

  const usdRates: Record<string, number> = json.rates ?? {};
  const npr = usdRates.NPR;
  if (!npr) throw new Error('fallback missing NPR');

  // NPR per 1 unit of C = (NPR per USD) / (C per USD).
  const rates: ForexRate[] = FALLBACK_CURRENCIES.map(({ code, name }) => {
    const perUsd = usdRates[code];
    if (!perUsd) return null;
    const nprPerUnit = npr / perUsd;
    return { code, name, unit: 1, buy: nprPerUnit, sell: nprPerUnit, nprPerUnit };
  }).filter((r): r is ForexRate => r !== null);

  const date = json.time_last_update_utc
    ? new Date(json.time_last_update_utc).toISOString().slice(0, 10)
    : ymd(new Date());
  return { date, source: 'open.er-api.com', rates };
}

export async function getForexRates(forceRefresh = false): Promise<ForexData | null> {
  if (!forceRefresh) {
    const cached = await getForexCache();
    if (cached) return cached;
  }
  let data: ForexData;
  try {
    data = await fetchNrb();
  } catch (e) {
    console.warn('[Forex] NRB failed, using fallback:', e);
    data = await fetchFallback();
  }
  await setForexCache(data);
  return data;
}
