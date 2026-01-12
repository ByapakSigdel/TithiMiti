# Widget Setup Guide

## Overview
The TithiMiti app includes 4 Android home screen widgets that automatically sync with app data:

1. **Date Converter Widget** - Shows today's BS/AD date
2. **Gold & Silver Widget** - Displays current metal prices
3. **Horoscope Widget** - Your daily horoscope with artistic background
4. **Events Widget** - Upcoming events

## How Widgets Work

### Data Synchronization
- Widgets read data from a shared JSON file: `filesDir/widget_data.json`
- The app updates this file whenever data changes using `expo-file-system/legacy`
- Updates happen automatically when:
  - Gold/Silver prices are fetched
  - Horoscope is generated
  - Date is converted
  - Events are loaded

### Deep Linking
When you click on a widget, it opens the corresponding tab in the app:
- **Date Widget** → Calendar tab (`(tabs)/index`)
- **Gold/Silver Widget** → Tools tab (`(tabs)/converter`)
- **Horoscope Widget** → Tools tab (`(tabs)/converter`)
- **Events Widget** → Events tab (`(tabs)/events`)

### Widget Updates
Widgets are automatically updated when:
1. App writes new data to the shared JSON file
2. A broadcast intent is sent to refresh widgets
3. User manually refreshes the widget (long-press → Update)

## Files Structure

```
widgets/native-code/android/
├── EventsWidget.kt              # Events widget logic
├── GoldSilverWidget.kt          # Gold/Silver prices widget
├── HoroscopeWidget.kt           # Daily horoscope widget
├── DateConverterWidget.kt       # Date converter widget
├── WidgetUpdateModule.kt        # Native module for broadcasting updates
├── WidgetUpdatePackage.kt       # React Native package registration
└── res/
    ├── layout/                  # Widget layouts (XML)
    ├── xml/                     # Widget provider configs
    └── values/
        └── strings.xml          # Widget strings

src/services/widget/
└── widgetService.ts             # JS service to update widget data

plugins/
└── withAndroidWidget.js         # Expo config plugin
```

## Building with Widgets

### Development Build
```bash
npx expo run:android
```

### Production Build
```bash
eas build --platform android --profile production
```

## Troubleshooting

### Widgets show "Loading..."
- Open the app to trigger data sync
- The app writes data to `filesDir/widget_data.json` on launch

### Widget doesn't update
- Long-press widget → Remove
- Re-add the widget from the widget picker
- Open the app to refresh data

### Deep links don't work
- Ensure the app scheme is configured: `tithimiti://`
- Check `app.json` has `"scheme": "tithimiti"`

## Notes

- The TypeScript errors in `node_modules/expo-file-system` and `expo-symbols` are harmless - they're configuration issues in dependencies that don't affect the build
- Widgets use `expo-file-system/legacy` for backward compatibility with v19
- Artistic horoscope backgrounds are fetched from the Metropolitan Museum of Art API
