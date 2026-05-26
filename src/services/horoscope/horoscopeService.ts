/**
 * Daily Horoscope Service
 * Generates quirky horoscopes using Vedic astrology algorithm
 * NO EXTERNAL API - Fully self-contained
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAllRichHoroscopes, generateRichHoroscope, RichHoroscope } from './vedicHoroscopeGenerator';

// Bumped to v2 when the cache shape changed from string to RichHoroscope.
const CACHE_KEY_PREFIX = 'daily_horoscope_v2_';
const CACHE_DATE_KEY = 'horoscope_cache_date_v2';

export interface DailyHoroscopes {
  [zodiac: string]: RichHoroscope;
}

/**
 * Get cached horoscopes if they're from today, otherwise generate new ones
 */
export async function getDailyHoroscopes(tithi: number | null = null): Promise<DailyHoroscopes> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const cachedDate = await AsyncStorage.getItem(CACHE_DATE_KEY);
    
    // Check if we have today's horoscopes cached
    if (cachedDate === today) {
      const cached = await AsyncStorage.getItem(CACHE_KEY_PREFIX + today);
      if (cached) {
        console.log('[Horoscope] Using cached horoscopes for', today);
        return JSON.parse(cached);
      }
    }
    
    // Generate new horoscopes using Vedic algorithm
    console.log('[Horoscope] Generating new horoscopes for', today, 'with tithi', tithi);
    const horoscopes = generateAllRichHoroscopes(new Date(), tithi);

    // Cache them
    await AsyncStorage.setItem(CACHE_KEY_PREFIX + today, JSON.stringify(horoscopes));
    await AsyncStorage.setItem(CACHE_DATE_KEY, today);

    // Clean up old cached horoscopes (keep only last 3 days)
    cleanupOldCache(today);

    return horoscopes;
  } catch (error) {
    console.error('[Horoscope] Failed to get daily horoscopes:', error);

    // Generate fresh ones as fallback
    return generateAllRichHoroscopes(new Date(), tithi);
  }
}

/**
 * Get the rich horoscope (message + painting mood) for a zodiac sign.
 */
export async function getRichHoroscopeForZodiac(zodiac: string, tithi: number | null = null): Promise<RichHoroscope> {
  const horoscopes = await getDailyHoroscopes(tithi);
  return horoscopes[zodiac] || generateRichHoroscope(zodiac, new Date(), tithi);
}

/**
 * Get horoscope message string for a specific zodiac sign.
 */
export async function getHoroscopeForZodiac(zodiac: string, tithi: number | null = null): Promise<string> {
  return (await getRichHoroscopeForZodiac(zodiac, tithi)).message;
}

/**
 * Clean up old cached horoscopes to save storage
 */
async function cleanupOldCache(currentDate: string) {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const horoscopeKeys = keys.filter(key => key.startsWith(CACHE_KEY_PREFIX));
    
    for (const key of horoscopeKeys) {
      const dateStr = key.replace(CACHE_KEY_PREFIX, '');
      if (dateStr !== currentDate) {
        await AsyncStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.error('[Horoscope] Failed to cleanup old cache:', error);
  }
}

/**
 * Force refresh horoscopes (useful for testing)
 */
export async function refreshHoroscopes(tithi: number | null = null): Promise<DailyHoroscopes> {
  const today = new Date().toISOString().split('T')[0];
  await AsyncStorage.removeItem(CACHE_KEY_PREFIX + today);
  await AsyncStorage.removeItem(CACHE_DATE_KEY);
  return getDailyHoroscopes(tithi);
}

/**
 * Clear all horoscope caches
 */
export async function clearHoroscopeCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const horoscopeKeys = keys.filter(key => 
      key.startsWith(CACHE_KEY_PREFIX) || key === CACHE_DATE_KEY
    );
    await AsyncStorage.multiRemove(horoscopeKeys);
    console.log('[Horoscope] Cache cleared successfully');
  } catch (error) {
    console.error('[Horoscope] Failed to clear cache:', error);
  }
}
