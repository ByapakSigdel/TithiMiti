/**
 * Widget Service
 * Updates widget data for Android home screen widgets
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * Update gold/silver prices widget
 */
export async function updateGoldSilverWidget(prices: any): Promise<void> {
  if (Platform.OS !== 'android') return;
  
  try {
    // Store with key that matches widget lookup
    await AsyncStorage.setItem('gold-silver-cache:latest', JSON.stringify(prices));
  } catch (error) {
    console.error('Failed to update gold/silver widget:', error);
  }
}

/**
 * Update horoscope widget
 */
export async function updateHoroscopeWidget(zodiac: string, horoscope: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  
  try {
    await AsyncStorage.setItem('selected-zodiac', zodiac);
    await AsyncStorage.setItem('daily-horoscope', horoscope);
  } catch (error) {
    console.error('Failed to update horoscope widget:', error);
  }
}

/**
 * Update date converter widget
 */
export async function updateDateWidget(bsDate: string): Promise<void> {
  if (Platform.OS !== 'android') return;
  
  try {
    await AsyncStorage.setItem('today-bs-date', bsDate);
  } catch (error) {
    console.error('Failed to update date widget:', error);
  }
}

/**
 * Update events widget
 */
export async function updateEventsWidget(events: string[]): Promise<void> {
  if (Platform.OS !== 'android') return;
  
  try {
    await AsyncStorage.setItem('today-events', JSON.stringify(events));
  } catch (error) {
    console.error('Failed to update events widget:', error);
  }
}
