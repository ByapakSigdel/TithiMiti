import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { useFocusEffect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { convertAdToBs, convertBsToAd } from '../src/domain/calendar/converter';
import { getGoldSilverPrices, GoldSilverPrices } from '../src/services/api/goldSilverService';
import { clearHoroscopeCache, getHoroscopeForZodiac } from '../src/services/horoscope/horoscopeService';
import { updateDateWidget, updateGoldSilverWidget, updateHoroscopeWidget } from '../src/services/widget/widgetService';
import { useAppState } from '../src/state/appState';
import { NothingText } from '../src/ui/core/NothingText';

const ZODIACS = ['Mesh', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meen'];
const ART_API_OBJECT = 'https://collectionapi.metmuseum.org/public/collection/v1/objects/';

// Zodiac-themed painting queries (Met Museum search). Each picks
// classical paintings that visually match the sign's archetype.
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

function buildArtSearchUrl(zodiac: string): string {
  const term = ZODIAC_PAINTING_QUERIES[zodiac] || 'celestial';
  const encoded = encodeURIComponent(term);
  return `https://collectionapi.metmuseum.org/public/collection/v1/search?q=${encoded}&hasImages=true&medium=Paintings`;
}

export default function ConverterScreen() {
  const { colors } = useAppState();
  const [inputDate, setInputDate] = useState('');
  const [conversionMode, setConversionMode] = useState<'AD_TO_BS' | 'BS_TO_AD'>('AD_TO_BS');
  const [result, setResult] = useState<string>('');
  
  // Gold & Silver prices state
  const [goldSilverPrices, setGoldSilverPrices] = useState<GoldSilverPrices | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesError, setPricesError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Horoscope state
  const [selectedZodiac, setSelectedZodiac] = useState<string>('Mesh');
  const [dailyHoroscope, setDailyHoroscope] = useState<string>('Loading your horoscope...');
  const [dropdownVisible, setDropdownVisible] = useState(false);

  // Load gold/silver prices from HamroPatro
  const loadMetalPrices = async (forceRefresh = false) => {
    try {
      setPricesLoading(true);
      setPricesError(null);

      // Fetch prices (includes caching internally)
      const prices = await getGoldSilverPrices(forceRefresh);
      if (prices) {
        setGoldSilverPrices(prices);
        await updateGoldSilverWidget(prices);
      } else {
        setPricesError('Failed to fetch prices. Please try again.');
      }
    } catch (error) {
      setPricesError('Failed to load gold/silver prices');
      console.error('Gold/Silver prices error:', error);
    } finally {
      setPricesLoading(false);
      setRefreshing(false);
    }
  };

  // Load saved zodiac and generate horoscope
  useEffect(() => {
    loadSavedZodiac();
    loadMetalPrices();
    // Clear any corrupted cache on first load
    clearHoroscopeCache();
  }, []);

  useEffect(() => {
    generateDailyHoroscope();
  }, [selectedZodiac]);

  // Refresh prices when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadMetalPrices();
    }, [])
  );

  const loadSavedZodiac = async () => {
    try {
      const saved = await AsyncStorage.getItem('selected-zodiac');
      if (saved) {
        setSelectedZodiac(saved);
      }
    } catch (e) {
      console.error('Failed to load zodiac:', e);
    }
  };

  const saveZodiac = async (zodiac: string) => {
    try {
      await AsyncStorage.setItem('selected-zodiac', zodiac);
      setSelectedZodiac(zodiac);
      setDropdownVisible(false);
    } catch (e) {
      console.error('Failed to save zodiac:', e);
    }
  };

  const fetchArtImage = async (zodiac: string) => {
    try {
      // One painting per zodiac per day so the widget feels themed
      const today = new Date().toISOString().split('T')[0];
      const cacheKey = `art-image-${zodiac}`;
      const dateKey = `art-image-date-${zodiac}`;
      const savedDate = await AsyncStorage.getItem(dateKey);
      const savedPath = await AsyncStorage.getItem(cacheKey);

      if (savedDate === today && savedPath) {
        return savedPath;
      }

      const searchRes = await fetch(buildArtSearchUrl(zodiac));
      const searchData = await searchRes.json();

      if (searchData.objectIDs && searchData.objectIDs.length > 0) {
        // Try a few random IDs in case primaryImageSmall is missing
        const candidates = searchData.objectIDs.slice(0, 30);
        for (let i = 0; i < 5; i++) {
          const randomId = candidates[Math.floor(Math.random() * candidates.length)];
          try {
            const objRes = await fetch(`${ART_API_OBJECT}${randomId}`);
            const objData = await objRes.json();
            if (objData.primaryImageSmall) {
              const downloadDest = FileSystem.documentDirectory + `horoscope_bg_${zodiac}.jpg`;
              await FileSystem.downloadAsync(objData.primaryImageSmall, downloadDest);
              await AsyncStorage.setItem(dateKey, today);
              await AsyncStorage.setItem(cacheKey, downloadDest);
              return downloadDest;
            }
          } catch (innerErr) {
            console.warn('Failed to fetch art object', randomId, innerErr);
          }
        }
      }
    } catch (e) {
      console.error('Failed to fetch art image:', e);
    }
    return '';
  };

  const generateDailyHoroscope = async () => {
    try {
      // Clear any old cached horoscopes
      await clearHoroscopeCache();
      
      // Generate horoscope using Vedic algorithm (no API needed!)
      const horoscope = await getHoroscopeForZodiac(selectedZodiac, null);
      setDailyHoroscope(horoscope);
      
      // Fetch background painting tied to the chosen zodiac
      const imagePath = await fetchArtImage(selectedZodiac);

      await updateHoroscopeWidget(selectedZodiac, horoscope, imagePath);

    } catch (error) {
      console.error('Failed to generate horoscope:', error);
      setDailyHoroscope('Unable to load your horoscope. Please try again.');
    }
  };

  const handleConvert = async () => {
    if (conversionMode === 'AD_TO_BS') {
      const r = await convertAdToBs(inputDate);
      const bsDate = r.bs ? `${r.bs.bsYear}/${r.bs.bsMonth}/${r.bs.bsDay}` : 'Invalid date';
      setResult(bsDate);
      if (r.bs) {
        await updateDateWidget(bsDate);
      }
    } else {
      const parts = inputDate.split('/');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        const r = await convertBsToAd(y, m, d);
        setResult(r.ad ? r.ad.dateISO : 'Invalid date');
      } else {
        setResult('Invalid format');
      }
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadMetalPrices(true);
  };

  return (
    <ScrollView 
      style={[styles.screen, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View style={styles.container}>
        {/* Gold & Silver Prices Section */}
        <View style={{ marginTop: 16 }}>
          <NothingText variant="h3" style={styles.sectionTitle}>Gold & Silver Prices</NothingText>
          
          {pricesLoading && !goldSilverPrices ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.text} />
            </View>
          ) : pricesError && !goldSilverPrices ? (
            <View style={styles.errorContainer}>
              <NothingText style={{ color: colors.textSecondary, fontSize: 14 }}>{pricesError}</NothingText>
              <Pressable style={[styles.retryButton, { backgroundColor: colors.text }]} onPress={() => loadMetalPrices(true)}>
                <NothingText style={{ color: colors.background, fontSize: 12 }}>Retry</NothingText>
              </Pressable>
            </View>
          ) : goldSilverPrices ? (
            <>
              <View style={styles.pricesGrid}>
                {/* Gold Hallmark - Tola */}
                <View style={[styles.priceCard, { borderColor: '#FF0000' }]}>
                  <NothingText style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Gold (Tola)</NothingText>
                  <NothingText variant="h2" style={{ fontSize: 18, color: '#FF0000' }}>₨{goldSilverPrices.goldHallmarkTola}</NothingText>
                </View>

                {/* Gold Hallmark - 10g */}
                <View style={[styles.priceCard, { borderColor: '#FF0000' }]}>
                  <NothingText style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Gold (10g)</NothingText>
                  <NothingText variant="h2" style={{ fontSize: 18, color: '#FF0000' }}>₨{goldSilverPrices.goldHallmark10g}</NothingText>
                </View>

                {/* Silver - Tola */}
                <View style={[styles.priceCard, { borderColor: colors.border }]}>
                  <NothingText style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Silver (Tola)</NothingText>
                  <NothingText variant="h2" style={{ fontSize: 18 }}>₨{goldSilverPrices.silverTola}</NothingText>
                </View>

                {/* Silver - 10g */}
                <View style={[styles.priceCard, { borderColor: colors.border }]}>
                  <NothingText style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>Silver (10g)</NothingText>
                  <NothingText variant="h2" style={{ fontSize: 18 }}>₨{goldSilverPrices.silver10g}</NothingText>
                </View>
              </View>
              
              <NothingText style={{ fontSize: 11, color: colors.textSecondary, marginTop: 12 }}>
                {goldSilverPrices.date || 'Updated today'}
              </NothingText>
            </>
          ) : null}
        </View>

        {/* Date Converter Section */}
        <View style={{ marginTop: 32 }}>
          <NothingText variant="h3" style={styles.sectionTitle}>Date Converter</NothingText>

          {/* Mode Selector */}
          <View style={styles.modeSelector}>
            <Pressable
              style={[
                styles.modeButton,
                { borderColor: colors.border },
                conversionMode === 'AD_TO_BS' && { backgroundColor: colors.text, borderColor: colors.text }
              ]}
              onPress={() => {
                setConversionMode('AD_TO_BS');
                setInputDate('');
                setResult('');
              }}
            >
              <NothingText style={{
                fontSize: 13,
                color: conversionMode === 'AD_TO_BS' ? colors.background : colors.text
              }}>
                AD → BS
              </NothingText>
            </Pressable>
            <Pressable
              style={[
                styles.modeButton,
                { borderColor: colors.border },
                conversionMode === 'BS_TO_AD' && { backgroundColor: colors.text, borderColor: colors.text }
              ]}
              onPress={() => {
                setConversionMode('BS_TO_AD');
                setInputDate('');
                setResult('');
              }}
            >
              <NothingText style={{
                fontSize: 13,
                color: conversionMode === 'BS_TO_AD' ? colors.background : colors.text
              }}>
                BS → AD
              </NothingText>
            </Pressable>
          </View>

          {/* Unified Input */}
          <View style={styles.converterCard}>
            <View style={styles.inputRow}>
              <TextInput
                placeholder={conversionMode === 'AD_TO_BS' ? 'YYYY-MM-DD' : 'YYYY/MM/DD'}
                placeholderTextColor={colors.textSecondary}
                style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                value={inputDate}
                onChangeText={setInputDate}
              />
              <Pressable
                style={[styles.convertBtn, { backgroundColor: colors.text }]}
                onPress={handleConvert}
              >
                <NothingText style={{ color: colors.background, fontSize: 13 }}>Convert</NothingText>
              </Pressable>
            </View>
          </View>

          {/* Result Display */}
          {result && (
            <Animated.View
              entering={ZoomIn.duration(200)}
              style={[styles.resultCard, { borderColor: colors.border }]}
            >
              <NothingText style={{ fontSize: 14 }}>{result}</NothingText>
            </Animated.View>
          )}
        </View>

        {/* Daily Horoscope Section */}
        <View style={{ marginTop: 32, marginBottom: 32 }}>
          <NothingText variant="h3" style={styles.sectionTitle}>Daily Horoscope</NothingText>
          
          {/* Dropdown Selector */}
          <Pressable 
            style={[styles.dropdownButton, { borderColor: colors.border }]}
            onPress={() => setDropdownVisible(!dropdownVisible)}
          >
            <NothingText style={{ fontSize: 14 }}>{selectedZodiac}</NothingText>
            <NothingText style={{ fontSize: 12, color: colors.textSecondary }}>{dropdownVisible ? '▲' : '▼'}</NothingText>
          </Pressable>

          {/* Zodiac Selector - Only visible when dropdown is open */}
          {dropdownVisible && (
            <View style={styles.zodiacGrid}>
              {ZODIACS.map((zodiac) => (
                <Pressable
                  key={zodiac}
                  style={[
                    styles.zodiacGridButton,
                    { borderColor: colors.border },
                    selectedZodiac === zodiac && { backgroundColor: '#FF0000', borderColor: '#FF0000' }
                  ]}
                  onPress={() => saveZodiac(zodiac)}
                >
                  <NothingText style={{
                    fontSize: 11,
                    color: selectedZodiac === zodiac ? colors.background : colors.text
                  }}>
                    {zodiac}
                  </NothingText>
                </Pressable>
              ))}
            </View>
          )}

          <View style={[styles.horoscopeCard, { borderColor: colors.border }]}>
            <NothingText style={{ fontSize: 13, lineHeight: 20, color: colors.text }}>
              {dailyHoroscope}
            </NothingText>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 16,
    letterSpacing: 1,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  pricesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  priceCard: {
    flex: 1,
    minWidth: '46%',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 12,
  },
  zodiacGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  zodiacGridButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 4,
    minWidth: '22%',
    alignItems: 'center',
  },
  horoscopeCard: {
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 100,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
  },
  converterCard: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 2,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 4,
    fontSize: 13,
  },
  convertBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
    justifyContent: 'center',
  },
  resultCard: {
    marginTop: 16,
    padding: 12,
    borderWidth: 1,
    borderRadius: 4,
    alignItems: 'center',
  },
});
