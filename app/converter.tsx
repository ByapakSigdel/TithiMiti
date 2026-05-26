import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { convertAdToBs, convertBsToAd } from '../src/domain/calendar/converter';
import { ForexData, getForexRates } from '../src/services/api/forexService';
import { getGoldSilverPrices, GoldSilverPrices } from '../src/services/api/goldSilverService';
import { fetchArtImage } from '../src/services/horoscope/artService';
import { clearHoroscopeCache, getRichHoroscopeForZodiac } from '../src/services/horoscope/horoscopeService';
import { updateDateWidget, updateGoldSilverWidget, updateHoroscopeWidget } from '../src/services/widget/widgetService';
import { useAppState } from '../src/state/appState';
import { NothingText } from '../src/ui/core/NothingText';

const ZODIACS = ['Mesh', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meen'];

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

  // Currency exchange (forex) state
  const [forex, setForex] = useState<ForexData | null>(null);
  const [forexLoading, setForexLoading] = useState(false);
  const [forexError, setForexError] = useState<string | null>(null);
  const [forexCurrency, setForexCurrency] = useState<string>('USD');
  const [foreignAmount, setForeignAmount] = useState<string>('1');
  const [nprAmount, setNprAmount] = useState<string>('');
  const [forexDropdownOpen, setForexDropdownOpen] = useState(false);

  const selectedRate = forex?.rates.find((r) => r.code === forexCurrency) ?? null;

  // Mirror the live currency/amount into refs so a focus-triggered reload (whose
  // closure captured the initial state) recomputes against the current selection
  // instead of a stale one.
  const forexCurrencyRef = useRef(forexCurrency);
  const foreignAmountRef = useRef(foreignAmount);
  useEffect(() => { forexCurrencyRef.current = forexCurrency; }, [forexCurrency]);
  useEffect(() => { foreignAmountRef.current = foreignAmount; }, [foreignAmount]);

  // Format a number for the converter fields: 2 decimals max, trailing zeros
  // stripped, thousands separators added.
  const fmtAmount = (n: number): string => {
    if (!isFinite(n)) return '';
    let s = (Math.round(n * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
    const [int, dec] = s.split('.');
    const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return dec ? `${withCommas}.${dec}` : withCommas;
  };

  const parseAmount = (v: string): number => parseFloat(v.replace(/,/g, ''));

  // Two-way binding: editing either field recomputes the other from the rate.
  const onForeignChange = (v: string) => {
    setForeignAmount(v);
    const num = parseAmount(v);
    if (v === '') setNprAmount('');
    else if (selectedRate && isFinite(num)) setNprAmount(fmtAmount(num * selectedRate.nprPerUnit));
  };

  const onNprChange = (v: string) => {
    setNprAmount(v);
    const num = parseAmount(v);
    if (v === '') setForeignAmount('');
    else if (selectedRate && isFinite(num)) setForeignAmount(fmtAmount(num / selectedRate.nprPerUnit));
  };

  const onCurrencyChange = (code: string) => {
    setForexCurrency(code);
    setForexDropdownOpen(false);
    const rate = forex?.rates.find((r) => r.code === code);
    const num = parseAmount(foreignAmount);
    if (rate && isFinite(num)) setNprAmount(fmtAmount(num * rate.nprPerUnit));
  };

  const loadForex = async (forceRefresh = false) => {
    try {
      setForexLoading(true);
      setForexError(null);
      const data = await getForexRates(forceRefresh);
      if (data) {
        setForex(data);
        // Recompute against the *current* selection (via refs), so a background
        // reload keeps the displayed currency and NPR amount in sync.
        const cur = forexCurrencyRef.current;
        const rate = data.rates.find((r) => r.code === cur) ?? data.rates[0];
        if (rate) {
          if (!data.rates.find((r) => r.code === cur)) setForexCurrency(rate.code);
          const num = parseAmount(foreignAmountRef.current);
          if (isFinite(num)) setNprAmount(fmtAmount(num * rate.nprPerUnit));
        }
      } else {
        setForexError('Failed to fetch exchange rates. Please try again.');
      }
    } catch (error) {
      setForexError('Failed to load exchange rates');
      console.error('Forex error:', error);
    } finally {
      setForexLoading(false);
    }
  };

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
    loadForex();
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
      loadForex();
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

  const generateDailyHoroscope = async () => {
    try {
      // Clear any old cached horoscopes
      await clearHoroscopeCache();
      
      // Generate horoscope using Vedic algorithm (no API needed!)
      const rich = await getRichHoroscopeForZodiac(selectedZodiac, null);
      setDailyHoroscope(rich.message);

      // Fetch a painting whose vibe matches the horoscope's mood (overlaid on
      // the bundled mood art when the download succeeds).
      const imagePath = await fetchArtImage(selectedZodiac, rich.mood);

      await updateHoroscopeWidget(selectedZodiac, rich.message, imagePath, rich.mood);

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
    loadForex(true);
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

        {/* Currency Exchange Section */}
        <View style={{ marginTop: 32 }}>
          <NothingText variant="h3" style={styles.sectionTitle}>Currency Exchange</NothingText>

          {forexLoading && !forex ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.text} />
            </View>
          ) : forexError && !forex ? (
            <View style={styles.errorContainer}>
              <NothingText style={{ color: colors.textSecondary, fontSize: 14 }}>{forexError}</NothingText>
              <Pressable style={[styles.retryButton, { backgroundColor: colors.text }]} onPress={() => loadForex(true)}>
                <NothingText style={{ color: colors.background, fontSize: 12 }}>Retry</NothingText>
              </Pressable>
            </View>
          ) : forex && selectedRate ? (
            <>
              {/* Currency picker */}
              <Pressable
                style={[styles.dropdownButton, { borderColor: colors.border }]}
                onPress={() => setForexDropdownOpen(!forexDropdownOpen)}
              >
                <NothingText style={{ fontSize: 14 }}>{selectedRate.code} · {selectedRate.name}</NothingText>
                <NothingText style={{ fontSize: 12, color: colors.textSecondary }}>{forexDropdownOpen ? '▲' : '▼'}</NothingText>
              </Pressable>

              {forexDropdownOpen && (
                <View style={styles.zodiacGrid}>
                  {forex.rates.map((r) => (
                    <Pressable
                      key={r.code}
                      style={[
                        styles.zodiacGridButton,
                        { borderColor: colors.border },
                        forexCurrency === r.code && { backgroundColor: '#FF0000', borderColor: '#FF0000' },
                      ]}
                      onPress={() => onCurrencyChange(r.code)}
                    >
                      <NothingText style={{ fontSize: 11, color: forexCurrency === r.code ? colors.background : colors.text }}>
                        {r.code}
                      </NothingText>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Two-way amount inputs */}
              <View style={styles.forexRow}>
                <View style={[styles.forexField, { borderColor: colors.border }]}>
                  <NothingText style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>{selectedRate.code}</NothingText>
                  <TextInput
                    keyboardType="numeric"
                    style={[styles.forexInput, { color: colors.text }]}
                    value={foreignAmount}
                    onChangeText={onForeignChange}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>

                <NothingText style={{ fontSize: 18, color: colors.textSecondary, paddingHorizontal: 4 }}>⇄</NothingText>

                <View style={[styles.forexField, { borderColor: colors.border }]}>
                  <NothingText style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 4 }}>NPR</NothingText>
                  <TextInput
                    keyboardType="numeric"
                    style={[styles.forexInput, { color: colors.text }]}
                    value={nprAmount}
                    onChangeText={onNprChange}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              <NothingText style={{ fontSize: 11, color: colors.textSecondary, marginTop: 12 }}>
                1 {selectedRate.code} = ₨{fmtAmount(selectedRate.nprPerUnit)} · {forex.source} · {forex.date}
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
    fontFamily: 'Inter_400Regular',
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
  forexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  forexField: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 8,
  },
  forexInput: {
    fontSize: 18,
    padding: 0,
    fontFamily: 'Inter_500Medium',
  },
});
