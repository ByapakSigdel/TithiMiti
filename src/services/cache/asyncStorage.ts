import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'expiresAt' in parsed) {
      const { expiresAt, value } = parsed as { expiresAt?: number; value: T };
      if (expiresAt && Date.now() > expiresAt) {
        await AsyncStorage.removeItem(key);
        return null;
      }
      return value as T;
    }
    return parsed as T;
  } catch (e) {
    return null;
  }
}

export async function setCached<T>(key: string, value: T, ttlMs?: number) {
  const payload = ttlMs
    ? { value, expiresAt: Date.now() + ttlMs }
    : { value };
  await AsyncStorage.setItem(key, JSON.stringify(payload));
}

export async function clearCached(keyPrefix: string) {
  const keys = await AsyncStorage.getAllKeys();
  const targets = keys.filter((k) => k.startsWith(keyPrefix));
  if (targets.length) await AsyncStorage.multiRemove(targets);
}
