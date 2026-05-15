/**
 * Widget Service
 * Updates widget data for Android home screen widgets
 * Uses SharedPreferences via native module like the blog shows
 */

import { NativeModules, Platform } from 'react-native';

const WidgetData = NativeModules.WidgetData;

/**
 * Initialize all widgets at app startup. Computes today's real BS date
 * (best-effort; falls back to placeholder text if conversion fails).
 * Call once at root layout mount so it runs regardless of which tab opens first.
 */
export async function initializeAllWidgets(): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) return;

  try {
    console.log('[Widget] Initializing all widgets');

    // Compute today's real BS date so widgets show meaningful data immediately
    const todayISO = new Date().toISOString().slice(0, 10);
    let bsDate = 'Loading...';
    let tithi = 'Open app to load';
    let sunrise = '--:--';
    let sunset = '--:--';
    let todayEvent = '';

    try {
      const { convertAdToBs } = await import('@/src/domain/calendar/converter');
      const { getBsMonth } = await import('@/src/services/api/bsCalendarApi');
      const result = await convertAdToBs(todayISO);
      if (result.bs) {
        bsDate = `${result.bs.bsYear}/${result.bs.bsMonth}/${result.bs.bsDay}`;
        try {
          const monthData = await getBsMonth(result.bs.bsYear, result.bs.bsMonth);
          const todayData = monthData.days.find(d => d.adDateISO === todayISO);
          if (todayData) {
            tithi = todayData.tithiRom || tithi;
            sunrise = todayData.extraDetails?.sunrise || sunrise;
            sunset = todayData.extraDetails?.sunset || sunset;
            if (todayData.holidayNameRom) {
              todayEvent = todayData.holidayNameRom;
            } else if (todayData.events && todayData.events.length > 0) {
              todayEvent = todayData.events[0];
            }
          }
        } catch (e) {
          console.warn('[Widget] BS month fetch failed, using partial data:', e);
        }
      }
    } catch (e) {
      console.warn('[Widget] Date computation failed, using placeholders:', e);
    }

    await updateDateWidget(bsDate);
    await updateTodayWidget(bsDate, tithi, sunrise, sunset, todayEvent);
    await updateUserEventsWidget([]);

    // Populate AD->BS map for the date-converter widget stepper
    populateDateConverterMap().catch((e) =>
      console.warn('[Widget] populateDateConverterMap failed:', e),
    );

    // Best-effort metals fetch so the widget shows real prices on first install
    try {
      const { getGoldSilverPrices } = await import('@/src/services/api/goldSilverService');
      const prices = await getGoldSilverPrices(false);
      if (prices) {
        await updateGoldSilverWidget(prices);
      } else {
        await updateGoldSilverWidget({ goldHallmarkTola: '', silverTola: '', date: '' });
      }
    } catch (e) {
      console.warn('[Widget] Metals init failed:', e);
      await updateGoldSilverWidget({ goldHallmarkTola: '', silverTola: '', date: '' });
    }

    // Best-effort horoscope seed using saved zodiac
    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      const savedZodiac = (await AsyncStorage.getItem('selected-zodiac')) || 'Mesh';
      const { getHoroscopeForZodiac } = await import('@/src/services/horoscope/horoscopeService');
      const horoscope = await getHoroscopeForZodiac(savedZodiac, null);
      await updateHoroscopeWidget(savedZodiac, horoscope || 'Open Tools to load horoscope', '');
    } catch (e) {
      console.warn('[Widget] Horoscope init failed:', e);
      await updateHoroscopeWidget('Mesh', 'Open Tools to load horoscope', '');
    }

    console.log('[Widget] Init complete; bsDate=', bsDate);
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
 * Populate AD->BS map covering ±60 days from today so the widget's
 * prev/next stepper can resolve a BS date for any picked AD date offline.
 */
export async function populateDateConverterMap(): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) return;
  try {
    const { getAdMonth } = await import('@/src/services/api/bsCalendarApi');
    const map: Record<string, string> = {};

    const today = new Date();
    const months = new Set<string>();
    for (let delta = -2; delta <= 2; delta++) {
      const d = new Date(today.getFullYear(), today.getMonth() + delta, 1);
      months.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
    }

    for (const ym of months) {
      const [yStr, mStr] = ym.split('-');
      try {
        const monthData = await getAdMonth(parseInt(yStr, 10), parseInt(mStr, 10));
        for (const day of monthData.days) {
          if (day.adDateISO) {
            map[day.adDateISO] = `${day.bsYear}/${day.bsMonth}/${day.bsDay}`;
          }
        }
      } catch (e) {
        console.warn('[Widget] populateDateConverterMap: month fetch failed', ym, e);
      }
    }

    WidgetData.setData('date_converter_map', JSON.stringify(map), () => {
      console.log('[Widget] Populated date_converter_map with', Object.keys(map).length, 'entries');
    });
  } catch (error) {
    console.error('[Widget] Failed to populate date converter map:', error);
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
 * Update today widget (BS date, tithi, sunrise, sunset, today's event)
 */
export async function updateTodayWidget(
  bsDate: string,
  tithi: string,
  sunrise: string,
  sunset: string,
  todayEvent: string = ''
): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) return;

  try {
    const data = JSON.stringify({
      bsDate,
      tithi,
      sunrise,
      sunset,
      todayEvent,
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
