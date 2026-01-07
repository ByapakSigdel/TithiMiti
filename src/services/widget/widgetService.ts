/**
 * Widget Service
 * Updates widget data for Android/iOS home screen widgets
 */

import { BsDay, EventItem } from '@/src/domain/calendar/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const WIDGET_DATA_KEY = 'widget_data';

interface WidgetData {
  date: string; // BS date formatted
  adDate: string; // AD date formatted
  tithi: string;
  events: string[]; // List of event titles
  lastUpdated: string;
}

/**
 * Update widget with today's calendar data
 */
export async function updateWidget(day: BsDay | null, events: EventItem[]): Promise<void> {
  if (!day) return;

  try {
    const widgetData: WidgetData = {
      date: `${day.bsYear}/${day.bsMonth}/${day.bsDay}`,
      adDate: new Date(day.adDateISO).toDateString(),
      tithi: day.tithiRom || '',
      events: events.map(e => e.title).slice(0, 3), // Max 3 events
      lastUpdated: new Date().toISOString(),
    };

    // Store in AsyncStorage
    await AsyncStorage.setItem(WIDGET_DATA_KEY, JSON.stringify(widgetData));

    // Platform-specific widget updates
    if (Platform.OS === 'android') {
      await updateAndroidWidget(widgetData);
    } else if (Platform.OS === 'ios') {
      await updateIOSWidget(widgetData);
    }
  } catch (error) {
    console.error('Failed to update widget:', error);
  }
}

/**
 * Update Android widget via SharedPreferences
 */
async function updateAndroidWidget(data: WidgetData): Promise<void> {
  try {
    // This requires a native module to write to SharedPreferences
    // For now, we'll use AsyncStorage which can be bridged to SharedPreferences
    // In a production app, you'd use a native module like:
    // await NativeModules.WidgetModule.updateWidget(data);
    
    const jsonData = {
      date: data.date,
      event: data.events.length > 0 ? data.events[0] : 'No events today',
      tithi: data.tithi,
    };
    
    // Store in a format the Android widget can read
    await AsyncStorage.setItem('android_widget_data', JSON.stringify(jsonData));
  } catch (error) {
    console.error('Android widget update failed:', error);
  }
}

/**
 * Update iOS widget via App Groups
 */
async function updateIOSWidget(data: WidgetData): Promise<void> {
  try {
    // iOS widgets use App Groups to share data
    // This requires a native module to write to App Groups
    // await NativeModules.WidgetModule.updateWidget(data);
    
    // For now, store in AsyncStorage
    await AsyncStorage.setItem('ios_widget_data', JSON.stringify(data));
  } catch (error) {
    console.error('iOS widget update failed:', error);
  }
}

/**
 * Get current widget data
 */
export async function getWidgetData(): Promise<WidgetData | null> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_DATA_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
