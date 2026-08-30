/**
 * Widget Service
 * Updates widget data for Android home screen widgets
 * Uses SharedPreferences via native module like the blog shows
 */

import { NativeModules, Platform } from 'react-native';

import { getTodayISO } from '@/src/utils/dateUtils';

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

    // Seed the horoscope widget first so its painting appears regardless of
    // which tab opens — and so a slow/stalled date API below can't starve it.
    await seedHoroscopeWidget();

    // Compute today's real BS date so widgets show meaningful data immediately.
    // Must be local time, not UTC — Nepal is UTC+5:45, so toISOString() would
    // yield yesterday between 00:00 and 05:45 local.
    const todayISO = getTodayISO();
    let bsDate = 'Loading...';
    let bsDateNepali = '';
    let tithi = 'Open app to load';
    let sunrise = '--:--';
    let sunset = '--:--';
    let todayEvent = '';

    try {
      const { convertAdToBs } = await import('@/src/domain/calendar/converter');
      const { getBsMonth } = await import('@/src/services/api/bsCalendarApi');
      const { formatBsDateNepali } = await import('@/src/domain/calendar/labels');
      const result = await convertAdToBs(todayISO);
      if (result.bs) {
        bsDate = `${result.bs.bsYear}/${result.bs.bsMonth}/${result.bs.bsDay}`;
        bsDateNepali = formatBsDateNepali(result.bs.bsYear, result.bs.bsMonth, result.bs.bsDay);
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

    await updateTodayWidget(bsDate, tithi, sunrise, sunset, todayEvent, bsDateNepali);
    await seedUserEventsWidget();

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

    console.log('[Widget] Init complete; bsDate=', bsDate);
  } catch (error) {
    console.error('[Widget] Failed to initialize widgets:', error);
  }
}

/**
 * Seed the horoscope widget from the saved zodiac. Seeds the text + any cached
 * mood-matched painting immediately, then downloads a fresh painting in the
 * background (when none is cached) and refreshes the widget once it lands.
 * Independent of the date/metals network calls so it always runs at startup.
 */
export async function seedHoroscopeWidget(): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) return;
  try {
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const savedZodiac = (await AsyncStorage.getItem('selected-zodiac')) || 'Mesh';
    const { getRichHoroscopeForZodiac } = await import('@/src/services/horoscope/horoscopeService');
    const { fetchArtImage, getCachedArtImage } = await import('@/src/services/horoscope/artService');
    const rich = await getRichHoroscopeForZodiac(savedZodiac, null);
    const message = rich.message || 'Open Tools to load horoscope';

    // Seed immediately with any already-downloaded, mood-matched painting so
    // the widget has art right away (and we don't clobber it with '').
    const cachedArt = await getCachedArtImage(savedZodiac, rich.mood);
    await updateHoroscopeWidget(savedZodiac, message, cachedArt, rich.mood);

    // No current painting yet: download one in the background and refresh the
    // widget when it lands. Don't block startup on the Met network call.
    if (!cachedArt) {
      fetchArtImage(savedZodiac, rich.mood)
        .then((path) => {
          if (path) updateHoroscopeWidget(savedZodiac, message, path, rich.mood);
        })
        .catch((e) => console.warn('[Widget] Art download failed:', e));
    }
  } catch (e) {
    // Leave any previously written payload intact — overwriting with a 'Mesh'
    // placeholder would clobber a valid widget for users with another zodiac.
    console.warn('[Widget] Horoscope init failed:', e);
  }
}

/**
 * Seed the "my events" widget from stored custom events at startup, so it shows
 * the closest upcoming event even before the Events tab has been opened.
 * updateUserEventsWidget does the upcoming-filter + earliest-pick.
 */
export async function seedUserEventsWidget(): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) return;
  try {
    const { getAllEvents } = await import('@/src/services/events/eventsStore');
    const all = await getAllEvents();
    const mapped = all.map((e) => ({
      title: e.title,
      date: e.adDateISO,
      adDateISO: e.adDateISO,
    }));
    await updateUserEventsWidget(mapped);
  } catch (e) {
    console.warn('[Widget] seedUserEventsWidget failed:', e);
    await updateUserEventsWidget([]);
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
export async function updateHoroscopeWidget(zodiac: string, horoscope: string, imagePath: string = '', theme: string = ''): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) return;

  try {
    const data = JSON.stringify({
      zodiac,
      message: horoscope,
      imagePath,
      theme
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
 * Update today widget (BS date, tithi, sunrise, sunset, today's event)
 */
export async function updateTodayWidget(
  bsDate: string,
  tithi: string,
  sunrise: string,
  sunset: string,
  todayEvent: string = '',
  bsDateNepali: string = ''
): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) return;

  try {
    const data = JSON.stringify({
      bsDate,
      bsDateNepali,
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
export async function updateUserEventsWidget(events: any[]): Promise<void> {
  if (Platform.OS !== 'android' || !WidgetData) return;
  
  try {
    // Filter for upcoming events only (today and future). Local-time boundary:
    // toISOString() is UTC and would keep yesterday / drop today in Nepal.
    const todayISO = getTodayISO();

    // Send the full upcoming list — the Kotlin side re-filters with the device
    // clock and picks the earliest, so truncating here to one event could leave
    // the widget empty once that single event passes.
    const upcomingEvents = events
      .filter(event => event.adDateISO >= todayISO)
      .sort((a, b) => a.adDateISO.localeCompare(b.adDateISO));

    const data = JSON.stringify({ events: upcomingEvents });
    WidgetData.setData('user_events_widget', data, () => {
      console.log('[Widget] Updated user events widget with', upcomingEvents.length, 'upcoming events');
    });
  } catch (error) {
    console.error('[Widget] Failed to update user events widget:', error);
  }
}
