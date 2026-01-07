import { getGoldSilverCache, setGoldSilverCache } from '../cache/goldSilverCache';
import { fetchHamroPatroGoldSilver, GoldSilverPrices } from './hamroPatroGoldApi';

export type { GoldSilverPrices };

export async function getGoldSilverPrices(forceRefresh = false) {
  if (!forceRefresh) {
    const cached = await getGoldSilverCache();
    if (cached) return cached;
  }
  const fresh = await fetchHamroPatroGoldSilver();
  await setGoldSilverCache(fresh);
  return fresh;
}
