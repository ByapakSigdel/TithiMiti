# Widget Debugging Guide

## How to Test Widgets

### 1. Build and Install the App
```bash
npx expo run:android
# OR
eas build --platform android --profile preview
```

### 2. Add Widgets to Home Screen
- Long press on home screen
- Tap "Widgets"
- Find "Tithi Miti" section
- Drag widgets to home screen:
  - **Today Date** - Shows BS/AD date, tithi, sunrise/sunset
  - **Events** - Shows your custom events
  - **Gold/Silver** - Live metal prices
  - **Horoscope** - Daily horoscope with art background
  - **Date Converter** - Current date in both calendars

### 3. Trigger Data Updates

Open the app and navigate to each tab to trigger widget updates:

#### Calendar Tab (Today Widget)
- Opens automatically on launch
- **Updates**: Today's BS date, tithi, sunrise, sunset

#### Tools/Converter Tab (Horoscope + Gold/Silver)
- Scroll to horoscope section
- Select your zodiac sign
- **Updates**: Horoscope widget with static message + Met Museum art
- **Updates**: Gold/Silver prices widget

#### Events Tab (Events Widget)
- Add a custom event (tap + button)
- **Updates**: Events widget with your custom events

### 4. Check Logs

Watch the logs to see widget updates:
```bash
npx react-native log-android
```

Look for these log messages:
- `[Widget] Updated widget data:` - Widget file was written
- `[Widget] Updating horoscope widget:` - Horoscope widget update
- `[Horoscope] Using cached horoscopes` - Using cached AI horoscopes
- `[Horoscope] API generation failed, using fallback` - Using static horoscopes

### 5. Verify Widget Data File

The widgets read from: `/data/data/com.byapak.tithimiti/files/widget_data.json`

To check if data is being written:
```bash
adb shell run-as com.byapaksigdel.tithimiti cat files/widget_data.json
```

Expected structure:
```json
{
  "today": {
    "bsDate": "2082/9/24",
    "bsDateNepali": "पौष २४, २०८२",
    "tithi": "Ashtami",
    "sunrise": "06:45",
    "sunset": "17:30"
  },
  "goldSilver": {
    "goldHallmarkTola": "265700.09",
    "silverTola": "4835.31",
    "date": "Thursday, January 08,2026 - 11:45 AM"
  },
  "horoscope": {
    "zodiac": "Mesh",
    "message": "Stop rushing into everything...",
    "imagePath": "/data/user/0/com.byapak.tithimiti/files/horoscope_bg.jpg"
  },
  "userEvents": [
    {
      "title": "Birthday Party",
      "date": "2026-01-15",
      "adDateISO": "2026-01-15"
    }
  ]
}
```

### 6. Manual Widget Refresh

If widgets don't update automatically:
- Long press widget
- Tap "Update" or "Refresh"
- Or remove and re-add the widget

### 7. Common Issues

#### Widgets Show "Loading..."
- **Cause**: App hasn't written data yet
- **Fix**: Open the app, navigate to each tab

#### Horoscope Widget Blank
- **Cause**: Image download failed or path is wrong
- **Fix**: Check logs for "Failed to fetch art image"
- **Fallback**: Widget shows text-only horoscope

#### Events Widget Shows "No user events"
- **Cause**: No custom events added
- **Expected**: This is correct! Add an event in the Events tab

#### Gold/Silver Shows "N/A"
- **Cause**: API fetch failed
- **Fix**: Open Converter tab, check internet connection

### 8. Force Widget Update

If you want to force update all widgets programmatically:
```typescript
import { broadcastWidgetUpdate } from '@/src/services/widget/widgetService';

// In your component:
broadcastWidgetUpdate();
```

## Horoscope System

### Static Horoscopes (Primary)
- **Always works** - No internet required
- Updates daily based on day of year
- Quirky, brutally honest style

### AI Horoscopes (Enhancement)
- Uses Gemini API (free tier)
- **Optional** - Falls back to static if fails
- Cached for 24 hours
- Same quirky style, AI-generated

### How It Works
1. App generates static horoscope immediately
2. Shows it to user and updates widget
3. Tries to fetch AI horoscope in background
4. If successful, replaces with AI version
5. If fails, keeps static version

**Result**: Widgets ALWAYS show a horoscope, never blank!
