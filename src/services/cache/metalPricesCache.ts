/**
 * Metal Prices Cache Service
 * Caches metal prices locally to provide offline access
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { MetalPrice } from '../api/metalPricesApi';

const CACHE_KEY = '@metal_prices_cache';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache validity

interface CachedPrices {
  data: MetalPrice;
  cachedAt: number;
}

/**
 * Save metal prices to cache
 */
export async function cacheMetalPrices(prices: MetalPrice): Promise<void> {
  try {
    const cached: CachedPrices = {
      data: prices,
      cachedAt: Date.now(),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cached));
  } catch (error) {
    console.error('Failed to cache metal prices:', error);
  }
}

/**
 * Get cached metal prices
 * Returns null if cache is expired or doesn't exist
 */
export async function getCachedMetalPrices(): Promise<MetalPrice | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, cachedAt }: CachedPrices = JSON.parse(cached);
    
    // Check if cache is still valid
    const isExpired = Date.now() - cachedAt > CACHE_DURATION;
    if (isExpired) {
      return null;
    }

    return data;
  } catch (error) {
    console.error('Failed to read cached metal prices:', error);
    return null;
  }
}

/**
 * Clear cached metal prices
 */
export async function clearMetalPricesCache(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('Failed to clear metal prices cache:', error);
  }
}
