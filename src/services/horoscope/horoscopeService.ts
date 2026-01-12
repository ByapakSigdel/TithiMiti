/**
 * Daily Horoscope Service
 * Generates quirky horoscopes using Vedic astrology algorithm
 * NO EXTERNAL API - Fully self-contained
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateAllHoroscopes, generateVedicHoroscope } from './vedicHoroscopeGenerator';

const CACHE_KEY_PREFIX = 'daily_horoscope_';
const CACHE_DATE_KEY = 'horoscope_cache_date';

export interface DailyHoroscopes {
  [zodiac: string]: string;
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
    const horoscopes = generateAllHoroscopes(new Date(), tithi);
    
    // Cache them
    await AsyncStorage.setItem(CACHE_KEY_PREFIX + today, JSON.stringify(horoscopes));
    await AsyncStorage.setItem(CACHE_DATE_KEY, today);
    
    // Clean up old cached horoscopes (keep only last 3 days)
    cleanupOldCache(today);
    
    return horoscopes;
  } catch (error) {
    console.error('[Horoscope] Failed to get daily horoscopes:', error);
    
    // Generate fresh ones as fallback
    return generateAllHoroscopes(new Date(), tithi);
  }
}

/**
 * Get horoscope for a specific zodiac sign
 */
export async function getHoroscopeForZodiac(zodiac: string, tithi: number | null = null): Promise<string> {
  const horoscopes = await getDailyHoroscopes(tithi);
  return horoscopes[zodiac] || generateVedicHoroscope(zodiac, new Date(), tithi);
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
