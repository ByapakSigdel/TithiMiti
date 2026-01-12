# Getting Your Free Gemini API Key

## Quick Setup (2 minutes)

1. **Go to Google AI Studio**
   Visit: https://makersuite.google.com/app/apikey

2. **Sign in with Google**
   Use any Google account (Gmail, etc.)

3. **Click "Create API Key"**
   - Select "Create API key in new project" or use existing project
   - Copy the key (starts with `AIza...`)

4. **Add to the app**
   Open `/src/services/api/geminiApi.ts` and replace:
   ```typescript
   const GEMINI_API_KEY = 'YOUR_KEY_HERE';
   ```
   with your actual key

## Free Tier Limits

- **1,500 requests/day** (we use ~12/day = 0.8%)
- **15 requests/minute** (we use 1 every 30 seconds)
- **100% FREE** - No credit card required
- **No expiration** - Works indefinitely

## How It Works

1. **Daily Generation**: At midnight, app generates 12 new quirky horoscopes (one per zodiac)
2. **Caching**: Horoscopes are cached for 24 hours in AsyncStorage
3. **Fallback**: If API fails, uses your original static horoscopes
4. **Widget Updates**: When user selects zodiac, widget gets updated with today's horoscope

## Testing

To force refresh horoscopes (useful during development):
```typescript
import { refreshHoroscopes } from '@/src/services/horoscope/horoscopeService';

// In your component:
await refreshHoroscopes();
```

## Privacy & Security

- API key is embedded in the app (normal for mobile apps)
- Key has usage quotas (can't be abused)
- For production, consider using a backend proxy if concerned
- Free tier has no billing, so no financial risk

## Sustainability

With 1,500 free requests/day and only using ~12:
- **Sustainable for**: Unlimited time
- **Cost**: $0 forever
- **Users**: Can support thousands of daily active users
- **Backup**: Always falls back to static horoscopes if quota exceeded

Start the app and your horoscopes will be dynamically generated with that signature quirky style! 🌟
