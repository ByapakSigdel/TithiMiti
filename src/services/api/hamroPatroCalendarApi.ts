import { romanizeTithi } from '@/src/domain/calendar/labels';

// Hamro Patro serves a per-BS-month calendar grid (with tithi + panchang) via an
// internal AJAX endpoint. We use it as a fallback/enrichment source for the
// months where the primary API (cal.mahansigdel.com.np) ships skeleton data
// (null tithiDetails/panchangaDetails) — i.e. roughly mid-2026 onward.
const HP_AJAX = 'https://www.hamropatro.com/gui/home/calender-ajax.php';
const FETCH_TIMEOUT_MS = 15000;

export interface HpDay {
  bsYear: number;
  bsMonth: number;
  bsDay: number;
  adDateISO: string; // YYYY-MM-DD
  weekday: number; // 0-6 (0 = Sunday)
  tithiNp: string;
  tithiRom: string;
  paksha: string; // शुक्ल / कृष्ण
  yog: string;
  karan: string;
  nakshatra: string;
  events: string[]; // Nepali event titles
  isHoliday: boolean;
}

const NP_DIGITS: Record<string, string> = {
  '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
  '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
};

function npNumeralToInt(input: string | undefined): number {
  if (!input) return 0;
  let out = '';
  for (const ch of input.trim()) {
    out += NP_DIGITS[ch] ?? (/[0-9]/.test(ch) ? ch : '');
  }
  return out ? parseInt(out, 10) : 0;
}

function padIso(adRaw: string): string {
  // Accepts "2026-11-7" or "2026-11-07" -> "2026-11-07"
  const m = adRaw.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return '';
  const [, y, mo, d] = m;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function weekdayFromIso(iso: string): number {
  // iso is YYYY-MM-DD; build a local date at noon to avoid TZ rollovers.
  const [y, m, d] = iso.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return 0;
  return new Date(y, m - 1, d, 12, 0, 0).getDay();
}

async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent':
          'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36',
        Accept: 'text/html,*/*',
      },
    });
    if (!res.ok) throw new Error(`HP HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function clean(s: string | undefined): string {
  if (!s) return '';
  return decodeEntities(s.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
}

function parsePanchanga(block: string): { paksha: string; yog: string; karan: string; nakshatra: string } {
  const result = { paksha: '', yog: '', karan: '', nakshatra: '' };
  const inner = block.match(/<div class="panchangaWrapper">([\s\S]*?)<\/div>/);
  if (!inner) return result;

  const lines = inner[1]
    .split(/<br\s*\/?>/i)
    .map((l) => clean(l))
    .filter(Boolean);

  // Line 1: "<masa...> <paksha> <tithi>" e.g. "कार्तिक शुक्ल अष्टमी"
  if (lines[0]) {
    if (lines[0].includes('शुक्ल')) result.paksha = 'शुक्ल';
    else if (lines[0].includes('कृष्ण')) result.paksha = 'कृष्ण';
  }

  // Line 2: "पञ्चाङ्ग: <yog> <karan> <nakshatra>" e.g. "वृद्धि विष्टि धनिष्ठा"
  const panchangLine = lines.find((l) => l.includes('पञ्चाङ्ग'));
  if (panchangLine) {
    const after = panchangLine.replace(/^.*?पञ्चाङ्ग\s*[:ः]?\s*/, '').trim();
    const tokens = after.split(/\s+/).filter(Boolean);
    if (tokens.length >= 3) {
      result.yog = tokens[0];
      result.karan = tokens[1];
      result.nakshatra = tokens.slice(2).join(' ');
    } else if (tokens.length === 2) {
      result.yog = tokens[0];
      result.nakshatra = tokens[1];
    } else if (tokens.length === 1) {
      result.yog = tokens[0];
    }
  }

  return result;
}

function parseLi(chunk: string, bsYear: number, bsMonth: number): HpDay | null {
  // The <li> id is the AD date for real (enabled) days, or "0" for the
  // leading/trailing filler cells that belong to adjacent months.
  const idMatch = chunk.match(/id="([^"]*)"/);
  const liId = idMatch ? idMatch[1] : '';
  if (!/^\d{4}-\d{1,2}-\d{1,2}$/.test(liId)) return null; // skip filler/disabled cells

  const adDateISO = padIso(liId);
  if (!adDateISO) return null;

  const nep = chunk.match(/<span class="nep">([^<]*)<\/span>/);
  const bsDay = npNumeralToInt(nep ? nep[1] : undefined);
  if (!bsDay) return null;

  const tithiMatch = chunk.match(/<span class="tithi">([^<]*)<\/span>/);
  const tithiNp = clean(tithiMatch ? tithiMatch[1] : '');

  const panchanga = parsePanchanga(chunk);

  const eventMatch = chunk.match(/<span class="event">([\s\S]*?)<\/span>/);
  const eventsRaw = clean(eventMatch ? eventMatch[1] : '');
  const events = eventsRaw
    .split('/')
    .map((e) => e.trim())
    .filter((e) => e && e !== '--');

  const classMatch = chunk.match(/class="([\s\S]*?)"/);
  const isHoliday = !!classMatch && /holiday/.test(classMatch[1]);

  return {
    bsYear,
    bsMonth,
    bsDay,
    adDateISO,
    weekday: weekdayFromIso(adDateISO),
    tithiNp,
    tithiRom: romanizeTithi(tithiNp || null),
    paksha: panchanga.paksha,
    yog: panchanga.yog,
    karan: panchanga.karan,
    nakshatra: panchanga.nakshatra,
    events,
    isHoliday,
  };
}

/**
 * Fetch and parse a single BS month from Hamro Patro.
 * Returns the days that genuinely belong to (bsYear, bsMonth), sorted by day.
 */
export async function fetchHamroPatroMonth(bsYear: number, bsMonth: number): Promise<HpDay[]> {
  const url = `${HP_AJAX}?year=${encodeURIComponent(bsYear)}&month=${encodeURIComponent(bsMonth)}`;
  const html = await fetchHtml(url);

  const liChunks = html.match(/<li[\s\S]*?<\/li>/g) || [];
  const days: HpDay[] = [];
  for (const chunk of liChunks) {
    const day = parseLi(chunk, bsYear, bsMonth);
    if (day) days.push(day);
  }

  // Dedupe by BS day (defensive) and sort.
  const byDay = new Map<number, HpDay>();
  for (const d of days) {
    if (!byDay.has(d.bsDay)) byDay.set(d.bsDay, d);
  }
  return Array.from(byDay.values()).sort((a, b) => a.bsDay - b.bsDay);
}
