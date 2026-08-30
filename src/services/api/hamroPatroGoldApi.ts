export interface GoldSilverPrices {
  date: string;
  goldHallmarkTola: string;
  goldTajabiTola: string;
  silverTola: string;
  goldHallmark10g: string;
  goldTajabi10g: string;
  silver10g: string;
  /** True when these are last-known-good values because every live source failed. */
  isStale?: boolean;
  /** Which upstream produced the values (debugging aid). */
  source?: string;
}

const FETCH_TIMEOUT_MS = 12000;
const TOLA_IN_10G = 1.16638; // 1 tola = 11.6638 g

export async function fetchTextWithTimeout(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
        Accept: 'text/html,*/*',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

/** Format an amount in the Nepali lakh style HamroPatro uses: 306700 -> 3,06,700. */
export function formatNprAmount(n: number | undefined): string {
  if (n === undefined || !isFinite(n) || n <= 0) return '';
  const s = String(Math.round(n));
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  let rest = s.slice(0, -3);
  const parts: string[] = [];
  while (rest.length > 2) {
    parts.unshift(rest.slice(-2));
    rest = rest.slice(0, -2);
  }
  if (rest) parts.unshift(rest);
  return `${parts.join(',')},${last3}`;
}

interface MetalQuote {
  tola?: number;
  tenGram?: number;
  date?: string;
}

/**
 * Primary strategy: HamroPatro's page is a Next.js app that embeds the full
 * price dataset (all metals, both units, plus history) in its flight data.
 * We unescape the payload and pull each metal block's unit prices.
 */
function parseFlightData(html: string): Record<string, MetalQuote> | null {
  const un = html.replace(/\\"/g, '"');
  const metals = ['Silver', 'HalMark Gold', 'Tejabi Gold'];

  const found: { name: string; at: number }[] = [];
  for (const m of metals) {
    const at = un.indexOf(`"name":"${m}"`);
    if (at >= 0) found.push({ name: m, at });
  }
  if (!found.length) return null;
  found.sort((a, b) => a.at - b.at);

  const out: Record<string, MetalQuote> = {};
  for (let i = 0; i < found.length; i++) {
    const start = found[i].at;
    const end = i + 1 < found.length ? found[i + 1].at : Math.min(un.length, start + 60000);
    const block = un.slice(start, end);

    const tola = block.match(/"name":"1 tola","price":\{"date":"([^"]*)","price":([\d.]+)/);
    const tenG = block.match(/"name":"10 gms","price":\{"date":"([^"]*)","price":([\d.]+)/);
    out[found[i].name] = {
      tola: tola ? parseFloat(tola[2]) : undefined,
      tenGram: tenG ? parseFloat(tenG[2]) : undefined,
      date: tola?.[1] || tenG?.[1],
    };
  }
  return out;
}

/**
 * Secondary strategy: parse the server-rendered price cards. These only carry
 * gold-hallmark and silver per-tola values, so 10g is derived from tola and
 * tajabi is left for the flight data / other sources.
 */
function parseSsrCards(html: string): { goldTola?: number; silverTola?: number; updated?: string } {
  const text = html
    .replace(/<!--\s*-->/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');

  const gold = text.match(/Gold \(Hallmark\)\s*Per Tola[\s\S]{0,220}?Rs\s*([\d,]+)/i);
  const silver = text.match(/Silver\s*Per Tola[\s\S]{0,220}?Rs\s*([\d,]+)/i);
  const updated = text.match(/Last updated\s*:\s*([A-Za-z\u0900-\u097F]+\s*\d{1,2}(?:\s*\|\s*[\d:]+\s*[ap]m)?)/i);

  const toNum = (s?: string) => (s ? parseFloat(s.replace(/,/g, '')) : undefined);
  return {
    goldTola: toNum(gold?.[1]),
    silverTola: toNum(silver?.[1]),
    updated: updated?.[1]?.trim(),
  };
}

export async function fetchHamroPatroGoldSilver(): Promise<GoldSilverPrices> {
  const html = await fetchTextWithTimeout('https://www.hamropatro.com/gold');

  const flight = parseFlightData(html);
  const ssr = parseSsrCards(html);

  const hallmark = flight?.['HalMark Gold'] ?? {};
  const tajabi = flight?.['Tejabi Gold'] ?? {};
  const silver = flight?.['Silver'] ?? {};

  // Merge: flight data first, SSR cards as backup, derive 10g when missing.
  const goldTola = hallmark.tola ?? ssr.goldTola;
  const silverTola = silver.tola ?? ssr.silverTola;

  const gold10g = hallmark.tenGram ?? (goldTola ? goldTola / TOLA_IN_10G : undefined);
  const silver10g = silver.tenGram ?? (silverTola ? silverTola / TOLA_IN_10G : undefined);
  const tajabiTola = tajabi.tola;
  const tajabi10g = tajabi.tenGram ?? (tajabiTola ? tajabiTola / TOLA_IN_10G : undefined);

  const date = ssr.updated || hallmark.date || silver.date || '';

  return {
    date,
    goldHallmarkTola: formatNprAmount(goldTola),
    goldTajabiTola: formatNprAmount(tajabiTola),
    silverTola: formatNprAmount(silverTola),
    goldHallmark10g: formatNprAmount(gold10g),
    goldTajabi10g: formatNprAmount(tajabi10g),
    silver10g: formatNprAmount(silver10g),
    source: 'hamropatro',
  };
}
