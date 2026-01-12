/**
 * Widget Service
 * Updates widget data for Android home screen widgets
 * Uses SharedPreferences via native module like the blog shows
 */

import { NativeModules, Platform } from 'react-native';

const WidgetData = NativeModules.WidgetData;

/**
 * Initialize all widgets with default data
 * Call this on app startup to ensure widgets always have data
 */
export async function initializeAllWidgets(): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) return;
  
  try {
    console.log('[Widget] Initializing all widgets with default data');
    
    // Set default data for all widgets to prevent "can't load widget" errors
    const today = new Date();
    const adDate = today.toISOString().split('T')[0];
    
    // Default date converter widget
    await updateDateWidget('2082/9/24');
    
    // Default today widget
    await updateTodayWidget('2082/9/24', 'Purnima', '06:45', '17:30');
    
    // Default gold/silver widget
    await updateGoldSilverWidget({
      goldHallmarkTola: 'Loading...',
      silverTola: 'Loading...',
      date: 'Open app to update'
    });
    
    // Default horoscope widget
    await updateHoroscopeWidget('Mesh', 'Open app to see your daily horoscope', '');
    
    // Default events widget
    await updateUserEventsWidget([]);
    
    console.log('[Widget] All widgets initialized with default data');
  } catch (error) {
    console.error('[Widget] Failed to initialize widgets:', error);
  }
}

/**
 * Update gold/silver prices widget
 */
export async function updateGoldSilverWidget(prices: any): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) return;
  
  try {
    const data = JSON.stringify(prices);
    WidgetData.setData('gold_silver_widget', data, () => {
      console.log('[Widget] Updated gold/silver widget');
    });
  } catch (error) {
    console.error('[Widget] Failed to update gold/silver widget:', error);
  }
}

/**
 * Update horoscope widget
 */
export async function updateHoroscopeWidget(zodiac: string, horoscope: string, imagePath: string = ''): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) return;
  
  try {
    const data = JSON.stringify({
      zodiac,
      message: horoscope,
      imagePath
    });
    console.log('[Widget] Updating horoscope widget:', zodiac, horoscope.substring(0, 50));
    WidgetData.setData('horoscope_widget', data, () => {
      console.log('[Widget] Updated horoscope widget');
    });
  } catch (error) {
    console.error('[Widget] Failed to update horoscope widget:', error);
  }
}

/**
 * Update date converter widget
 */
export async function updateDateWidget(bsDate: string): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) return;
  
  try {
    const data = JSON.stringify({ bsDate });
    WidgetData.setData('date_converter_widget', data, () => {
      console.log('[Widget] Updated date converter widget:', bsDate);
    });
  } catch (error) {
    console.error('[Widget] Failed to update date converter widget:', error);
  }
}

/**
 * Update events widget
 */
export async function updateEventsWidget(events: string[]): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) return;
  
  try {
    const data = JSON.stringify({ events });
    WidgetData.setData('events_widget', data, () => {
      console.log('[Widget] Updated events widget with', events.length, 'events');
    });
  } catch (error) {
    console.error('[Widget] Failed to update events widget:', error);
  }
}

/**
 * Update today widget (BS date, tithi, sunrise, sunset)
 */
export async function updateTodayWidget(
  bsDate: string,
  tithi: string,
  sunrise: string,
  sunset: string
): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) return;
  
  try {
    const data = JSON.stringify({
      bsDate,
      tithi,
      sunrise,
      sunset
    });
    WidgetData.setData('today_widget', data, () => {
      console.log('[Widget] Updated today widget');
    });
  } catch (error) {
    console.error('[Widget] Failed to update today widget:', error);
  }
}

/**
 * Update user events widget
 * Filters and shows only upcoming events
 */
export async function updateUserEventsWidget(events: Array<any>): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) return;
  
  try {
    // Filter for upcoming events only (today and future)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString().split('T')[0];
    
    const upcomingEvents = events
      .filter(event => event.adDateISO >= todayISO)
      .sort((a, b) => a.adDateISO.localeCompare(b.adDateISO))
      .slice(0, 5); // Limit to next 5 events
    
    const data = JSON.stringify({ events: upcomingEvents });
    WidgetData.setData('user_events_widget', data, () => {
      console.log('[Widget] Updated user events widget with', upcomingEvents.length, 'upcoming events');
    });
  } catch (error) {
    console.error('[Widget] Failed to update user events widget:', error);
  }
}
