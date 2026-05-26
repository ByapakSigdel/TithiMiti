import AsyncStorage from '@react-native-async-storage/async-storage';
import { ForexData } from '../api/forexService';

const CACHE_KEY = 'forex-rates';
const CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours (NRB publishes daily)

export async function setForexCache(data: ForexData) {
  const payload = { data, ts: Date.now() };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(payload));
}

export async function getForexCache(): Promise<ForexData | null> {
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
