import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoldSilverPrices } from '../api/hamroPatroGoldApi';

const CACHE_KEY = 'gold-silver-prices';
const CACHE_TTL = 1000 * 60 * 60 * 12; // 12 hours

export async function setGoldSilverCache(data: GoldSilverPrices) {
  const payload = {
    data,
    ts: Date.now(),
  };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

export async function getGoldSilverCache(): Promise<GoldSilverPrices | null> {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}
