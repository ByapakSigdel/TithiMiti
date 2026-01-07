# Android Widgets

This app includes 4 home screen widgets that automatically update with app data:

## 1. Gold & Silver Prices Widget
- Shows current gold and silver prices in Nepal (per tola)
- Red text for gold, black for silver
- Updates every 30 minutes
- Pulls data from HamroPatro scraping

## 2. Daily Horoscope Widget
- Displays horoscope for your selected zodiac sign
- Uses Nepali zodiac names (Mesh, Vrishabha, etc.)
- Updates every 60 minutes
- Changes daily with quirky advice

## 3. Date Converter Widget
- Shows current date in both AD and BS calendars
- System date for AD
- Bikram Sambat date from app cache
- Updates every 60 minutes

## 4. Events Widget
- Lists today's Nepali calendar events
- Shows holidays, festivals, and user events
- Updates when events change in app
- Maximum 3 events displayed

## How Widgets Work

1. **Data Sync**: Widgets read from AsyncStorage using SharedPreferences bridge
2. **Auto-Update**: Periodic updates (30-60 min) + immediate updates when app data changes
3. **Keys Used**:
   - `gold-silver-cache:latest` - Metal prices
   - `selected-zodiac` - Current zodiac sign
   - `daily-horoscope` - Today's horoscope message
   - `today-bs-date` - Current BS date
   - `today-events` - Today's event titles

## Installation

Widgets will be available in the home screen widget picker after installing the APK:
1. Long-press on home screen
2. Select "Widgets"
3. Find "TithiMiti" widgets
4. Drag to home screen

## Building APK

```bash
eas build --platform android --profile preview
```

The widgets are automatically included in the build via the `withAndroidWidget.js` Expo config plugin.

## Development Notes

- Widget code: `widgets/native-code/android/*.kt`
- XML layouts: `widgets/native-code/android/res/layout/*.xml`
- Widget info: `widgets/native-code/android/res/xml/*_info.xml`
- Update service: `src/services/widget/widgetService.ts`
- Config plugin: `plugins/withAndroidWidget.js`
