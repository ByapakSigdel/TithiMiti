/**
 * Horoscope Art Service
 * Fetches a real painting from The Metropolitan Museum of Art whose vibe matches
 * the horoscope's mood, downloads it locally, and caches the path per
 * zodiac+mood per day. Shared by the Tools screen and the startup widget seed so
 * the home-screen widget always has a painting regardless of which tab opens.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

const ART_API_OBJECT = 'https://collectionapi.metmuseum.org/public/collection/v1/objects/';

// Zodiac-themed painting queries (Met Museum search) — the sign's archetype.
const ZODIAC_PAINTING_QUERIES: Record<string, string> = {
  Mesh: 'ram',
  Vrishabha: 'bull pasture',
  Mithuna: 'twins portrait',
  Karka: 'moon water',
  Simha: 'lion',
  Kanya: 'maiden harvest',
  Tula: 'balance scales',
  Vrishchika: 'night dark',
  Dhanu: 'archer hunt',
  Makara: 'mountain winter',
  Kumbha: 'water sky',
  Meen: 'fish sea',
};

// Mood -> painting vibes. The horoscope's mood (fiery, stormy, radiant, ...)
// drives which real painting we fetch so the art matches the *vibe* of the
// reading being shown, not just the zodiac archetype.
const MOOD_PAINTING_QUERIES: Record<string, string[]> = {
  fiery: ['fire', 'sunset blaze', 'flames', 'volcano eruption'],
  earthy: ['harvest landscape', 'autumn field', 'mountain valley', 'forest'],
  airy: ['open sky clouds', 'meadow breeze', 'birds in flight', 'spring landscape'],
  watery: ['moonlit sea', 'ocean waves', 'river reflection', 'rain'],
  stormy: ['storm at sea', 'tempest', 'dark storm clouds', 'shipwreck storm'],
  radiant: ['sunrise', 'dawn light', 'golden glow landscape', 'radiant sun'],
};

function buildArtSearchUrl(term: string): string {
  const encoded = encodeURIComponent(term);
  return `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encoded}&hasImages=true&medium=Paintings`;
}

/**
 * Return the cached art path for this zodiac if it's still current for today's
 * mood, without hitting the network. Empty string when there's no usable cache.
 */
export async function getCachedArtImage(zodiac: string, mood: string): Promise<string> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const savedDate = await AsyncStorage.getItem(`art-image-date-${zodiac}`);
    if (savedDate === `${today}-${mood}`) {
      return (await AsyncStorage.getItem(`art-image-${zodiac}`)) || '';
    }
  } catch {
    // ignore — treat as no cache
  }
  return '';
}

/**
 * Fetch a real painting whose vibe matches the horoscope's mood. We build a
 * prioritized list of search terms (mood vibe + zodiac archetype, then the mood
 * vibes alone, then the archetype) and download the first painting that actually
 * has an image. Cached per zodiac+mood per day; returns '' on failure.
 */
export async function fetchArtImage(zodiac: string, mood: string): Promise<string> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `art-image-${zodiac}`;
    const dateKey = `art-image-date-${zodiac}`;

    // Re-fetch when the day OR the mood changes so the art tracks the vibe.
    const cached = await getCachedArtImage(zodiac, mood);
    if (cached) return cached;

    const moodTerms = MOOD_PAINTING_QUERIES[mood] || ['celestial'];
    const zodiacTerm = ZODIAC_PAINTING_QUERIES[zodiac] || 'celestial';
    // Combined first (vibe + archetype), then mood-only vibes, then archetype.
    const queries = [`${moodTerms[0]} ${zodiacTerm}`, ...moodTerms, zodiacTerm];

    for (const query of queries) {
      try {
        const searchRes = await fetch(buildArtSearchUrl(query));
        const searchData = await searchRes.json();
        if (!searchData.objectIDs || searchData.objectIDs.length === 0) continue;

        const candidates = searchData.objectIDs.slice(0, 40);
        for (let i = 0; i < 6; i++) {
          const randomId = candidates[Math.floor(Math.random() * candidates.length)];
          try {
            const objRes = await fetch(`${ART_API_OBJECT}${randomId}`);
            const objData = await objRes.json();
            if (objData.primaryImageSmall) {
              const downloadDest = FileSystem.documentDirectory + `horoscope_bg_${zodiac}.jpg`;
              await FileSystem.downloadAsync(objData.primaryImageSmall, downloadDest);
              await AsyncStorage.setItem(dateKey, `${today}-${mood}`);
              await AsyncStorage.setItem(cacheKey, downloadDest);
              return downloadDest;
            }
          } catch (innerErr) {
            console.warn('[Art] Failed to fetch art object', randomId, innerErr);
          }
        }
      } catch (queryErr) {
        console.warn('[Art] Art search failed for query', query, queryErr);
      }
    }
  } catch (e) {
    console.error('[Art] Failed to fetch art image:', e);
  }
  return '';
}
