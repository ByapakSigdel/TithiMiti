import AsyncStorage from '@react-native-async-storage/async-storage';
import { getGoldSilverCache, setGoldSilverCache } from '../cache/goldSilverCache';
import { fetchAsheshGoldSilver } from './asheshGoldApi';
import { fetchHamroPatroGoldSilver, GoldSilverPrices } from './hamroPatroGoldApi';

export type { GoldSilverPrices };

// Last-known-good prices, never expired: if every live source is down or has
// changed its markup, the app still shows the most recent real prices instead
// of zeros or an empty error state.
const LAST_GOOD_KEY = 'gold-silver-last-good-v1';

function toNumber(s: string | undefined): number {
  return s ? parseFloat(String(s).replace(/,/g, '')) : NaN;
}

/** Sanity-check parsed prices so a markup change can never surface garbage. */
function isValid(p: GoldSilverPrices | null | undefined): p is GoldSilverPrices {
  if (!p) return false;
  const gold = toNumber(p.goldHallmarkTola);
  const silver = toNumber(p.silverTola);
  return isFinite(gold) && gold > 10000 && isFinite(silver) && silver > 100 && gold > silver;
}

async function saveLastGood(p: GoldSilverPrices) {
  try {
    await AsyncStorage.setItem(LAST_GOOD_KEY, JSON.stringify(p));
  } catch {
    // best-effort
  }
}

async function getLastGood(): Promise<GoldSilverPrices | null> {
  try {
    const raw = await AsyncStorage.getItem(LAST_GOOD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GoldSilverPrices;
    return isValid(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Get gold/silver prices with layered resilience:
 * 1. Fresh cache (12h TTL) unless force-refreshing.
 * 2. HamroPatro (embedded JSON + server-rendered cards).
 * 3. ashesh.com.np (plain HTML table).
 * 4. Last-known-good values (never expire), flagged with isStale.
 */
export async function getGoldSilverPrices(forceRefresh = false): Promise<GoldSilverPrices | null> {
  if (!forceRefresh) {
    const cached = await getGoldSilverCache();
    if (isValid(cached)) return cached;
  }

  const sources: { name: string; fn: () => Promise<GoldSilverPrices> }[] = [
    { name: 'hamropatro', fn: fetchHamroPatroGoldSilver },
    { name: 'ashesh', fn: fetchAsheshGoldSilver },
  ];

  for (const source of sources) {
    try {
      const fresh = await source.fn();
      if (isValid(fresh)) {
        await setGoldSilverCache(fresh);
        await saveLastGood(fresh);
        return fresh;
      }
      console.warn(`[Gold] ${source.name} returned implausible values, trying next source`);
    } catch (e: any) {
      console.warn(`[Gold] ${source.name} failed:`, e?.message || e);
    }
  }

  // All live sources failed: fall back to the newest saved values we have.
  const lastGood = await getLastGood();
  if (lastGood) return { ...lastGood, isStale: true };

  const cached = await getGoldSilverCache();
  if (isValid(cached)) return { ...cached, isStale: true };

  return null;
}
