import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { convertAdToBs, convertBsToAd } from '@/src/domain/calendar/converter';
import { ForexData, getForexRates } from '@/src/services/api/forexService';
import { getGoldSilverPrices, GoldSilverPrices } from '@/src/services/api/goldSilverService';
import { fetchArtImage } from '@/src/services/horoscope/artService';
import { getRichHoroscopeForZodiac } from '@/src/services/horoscope/horoscopeService';
import { updateGoldSilverWidget, updateHoroscopeWidget } from '@/src/services/widget/widgetService';
import { useAppState } from '@/src/state/appState';
import { NothingText } from '@/src/ui/core/NothingText';
import { HundredTheme } from '@/src/ui/theme/hundred';

const ZODIACS = ['Mesh', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meen'];

// Section heading with the feature's signature color tick — every tool keeps
// its own hue (gold=marigold, forex=teal, dates=vermilion, horoscope=iris).
function SectionTitle({ label, tickColor }: { label: string; tickColor: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={[styles.sectionTick, { backgroundColor: tickColor }]} />
      <NothingText variant="h3" style={styles.sectionTitle}>{label}</NothingText>
    </View>
  );
}

export default function ToolsScreen() {
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
    const s = (Math.round(n * 100) / 100).toFixed(2).replace(/\.?0+$/, '');
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

  const loadForex = useCallback(async (forceRefresh = false) => {
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
     
  }, []);

  // Load gold/silver prices (multi-source with last-known-good fallback)
  const loadMetalPrices = useCallback(async (forceRefresh = false) => {
    try {
      setPricesLoading(true);
      setPricesError(null);

      // Fetch prices (includes caching + fallback sources internally)
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
    }
  }, []);

  // Load the saved zodiac once on mount. (Prices/forex load via the focus
  // effect below, which also covers first mount — a separate mount effect
  // doubled every network call at startup.)
  useEffect(() => {
    loadSavedZodiac();
  }, []);

  // Regenerate the horoscope when the zodiac changes. Guarded by a token so a
  // slow older request (art download included) can't overwrite a newer one —
  // without it, tapping Mesh then Tula could leave Mesh's text and widget
  // payload on screen while Tula is selected.
  const horoscopeRequestId = useRef(0);
  useEffect(() => {
    const requestId = ++horoscopeRequestId.current;
    const zodiac = selectedZodiac;
    (async () => {
      try {
        setDailyHoroscope('Loading your horoscope...');
        // Generate horoscope using Vedic algorithm (no API needed!)
        const rich = await getRichHoroscopeForZodiac(zodiac, null);
        if (requestId !== horoscopeRequestId.current) return;
        setDailyHoroscope(rich.message);

        // Fetch a painting whose vibe matches the horoscope's mood (overlaid on
        // the bundled mood art when the download succeeds).
        const imagePath = await fetchArtImage(zodiac, rich.mood);
        if (requestId !== horoscopeRequestId.current) return;

        await updateHoroscopeWidget(zodiac, rich.message, imagePath, rich.mood);
      } catch (error) {
        console.error('Failed to generate horoscope:', error);
        if (requestId === horoscopeRequestId.current) {
          setDailyHoroscope('Unable to load your horoscope. Please try again.');
        }
      }
    })();
  }, [selectedZodiac]);

  // Refresh prices when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadMetalPrices();
      loadForex();
    }, [loadMetalPrices, loadForex])
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

  const handleConvert = async () => {
    if (conversionMode === 'AD_TO_BS') {
      const r = await convertAdToBs(inputDate);
      const bsDate = r.bs ? `${r.bs.bsYear}/${r.bs.bsMonth}/${r.bs.bsDay}` : 'Invalid date';
      setResult(bsDate);
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

  // Keep the spinner up until BOTH loads settle — clearing it from one loader's
  // finally made it vanish while the other was still in flight.
  const handleRefresh = () => {
    setRefreshing(true);
    Promise.allSettled([loadMetalPrices(true), loadForex(true)]).finally(() => setRefreshing(false));
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.screen}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
            colors={[colors.accent]}
          />
        }
      >
      <View style={styles.container}>
        {/* Gold & Silver Prices Section */}
        <View style={{ marginTop: 16 }}>
          <SectionTitle label="Gold & Silver" tickColor={colors.marigold} />

          {pricesLoading && !goldSilverPrices ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.marigold} />
            </View>
          ) : pricesError && !goldSilverPrices ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.surface }]}>
              <NothingText style={{ color: colors.textSecondary, fontSize: 14 }}>{pricesError}</NothingText>
              <Pressable
                style={[styles.retryButton, { backgroundColor: colors.accent }]}
                onPress={() => loadMetalPrices(true)}
                accessibilityRole="button"
                accessibilityLabel="Retry loading gold and silver prices"
              >
                <NothingText variant="dot" style={{ fontSize: 11 }} color={colors.onAccent}>RETRY</NothingText>
              </Pressable>
            </View>
          ) : goldSilverPrices ? (
            <>
              <View style={styles.pricesGrid}>
                {/* Gold Hallmark - Tola */}
                <View style={[styles.priceCard, { backgroundColor: colors.marigoldSoft }]}>
                  <NothingText variant="caption" style={{ marginBottom: 6 }} color={colors.marigold}>Gold · Tola</NothingText>
                  <NothingText variant="h2" style={{ fontSize: 19 }} color={colors.marigold}>₨{goldSilverPrices.goldHallmarkTola}</NothingText>
                </View>

                {/* Gold Hallmark - 10g */}
                <View style={[styles.priceCard, { backgroundColor: colors.marigoldSoft }]}>
                  <NothingText variant="caption" style={{ marginBottom: 6 }} color={colors.marigold}>Gold · 10g</NothingText>
                  <NothingText variant="h2" style={{ fontSize: 19 }} color={colors.marigold}>₨{goldSilverPrices.goldHallmark10g}</NothingText>
                </View>

                {/* Silver - Tola */}
                <View style={[styles.priceCard, { backgroundColor: colors.surface }]}>
                  <NothingText variant="caption" style={{ marginBottom: 6 }}>Silver · Tola</NothingText>
                  <NothingText variant="h2" style={{ fontSize: 19 }}>₨{goldSilverPrices.silverTola}</NothingText>
                </View>

                {/* Silver - 10g */}
                <View style={[styles.priceCard, { backgroundColor: colors.surface }]}>
                  <NothingText variant="caption" style={{ marginBottom: 6 }}>Silver · 10g</NothingText>
                  <NothingText variant="h2" style={{ fontSize: 19 }}>₨{goldSilverPrices.silver10g}</NothingText>
                </View>
              </View>

              <NothingText style={{ fontSize: 11, color: goldSilverPrices.isStale ? colors.marigold : colors.textSecondary, marginTop: 12 }}>
                {goldSilverPrices.isStale
                  ? `Offline — showing last saved prices${goldSilverPrices.date ? ` (${goldSilverPrices.date})` : ''}`
                  : (goldSilverPrices.date || 'Updated today')}
              </NothingText>
            </>
          ) : null}
        </View>

        {/* Currency Exchange Section */}
        <View style={{ marginTop: 32 }}>
          <SectionTitle label="Currency Exchange" tickColor={colors.teal} />

          {forexLoading && !forex ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.teal} />
            </View>
          ) : forexError && !forex ? (
            <View style={[styles.errorContainer, { backgroundColor: colors.surface }]}>
              <NothingText style={{ color: colors.textSecondary, fontSize: 14 }}>{forexError}</NothingText>
              <Pressable
                style={[styles.retryButton, { backgroundColor: colors.accent }]}
                onPress={() => loadForex(true)}
                accessibilityRole="button"
                accessibilityLabel="Retry loading exchange rates"
              >
                <NothingText variant="dot" style={{ fontSize: 11 }} color={colors.onAccent}>RETRY</NothingText>
              </Pressable>
            </View>
          ) : forex && selectedRate ? (
            <>
              {/* Currency picker */}
              <Pressable
                style={[styles.dropdownButton, { backgroundColor: colors.surface }]}
                onPress={() => setForexDropdownOpen(!forexDropdownOpen)}
                accessibilityRole="button"
                accessibilityLabel={`Currency: ${selectedRate.name}. Choose another currency`}
                accessibilityState={{ expanded: forexDropdownOpen }}
              >
                <NothingText style={{ fontSize: 14 }}>{selectedRate.code} · {selectedRate.name}</NothingText>
                <Ionicons name={forexDropdownOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.teal} />
              </Pressable>

              {forexDropdownOpen && (
                <View style={styles.chipGrid}>
                  {forex.rates.map((r) => (
                    <Pressable
                      key={r.code}
                      style={[
                        styles.chip,
                        { backgroundColor: colors.surface },
                        forexCurrency === r.code && { backgroundColor: colors.teal },
                      ]}
                      onPress={() => onCurrencyChange(r.code)}
                      accessibilityRole="button"
                      accessibilityLabel={r.name}
                      accessibilityState={{ selected: forexCurrency === r.code }}
                    >
                      <NothingText style={{ fontSize: 11 }} color={forexCurrency === r.code ? colors.card : colors.text}>
                        {r.code}
                      </NothingText>
                    </Pressable>
                  ))}
                </View>
              )}

              {/* Two-way amount inputs */}
              <View style={styles.forexRow}>
                <View style={[styles.forexField, { backgroundColor: colors.surface }]}>
                  <NothingText variant="caption" style={{ marginBottom: 4 }} color={colors.teal}>{selectedRate.code}</NothingText>
                  <TextInput
                    keyboardType="numeric"
                    style={[styles.forexInput, { color: colors.text }]}
                    value={foreignAmount}
                    onChangeText={onForeignChange}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    accessibilityLabel={`Amount in ${selectedRate.name}`}
                  />
                </View>

                <Ionicons name="swap-horizontal" size={20} color={colors.teal} style={{ paddingHorizontal: 4 }} />

                <View style={[styles.forexField, { backgroundColor: colors.surface }]}>
                  <NothingText variant="caption" style={{ marginBottom: 4 }} color={colors.teal}>NPR</NothingText>
                  <TextInput
                    keyboardType="numeric"
                    style={[styles.forexInput, { color: colors.text }]}
                    value={nprAmount}
                    onChangeText={onNprChange}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    accessibilityLabel="Amount in Nepali Rupees"
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
          <SectionTitle label="Date Converter" tickColor={colors.accent} />

          {/* Mode Selector */}
          <View style={styles.modeSelector}>
            <Pressable
              style={[
                styles.modeButton,
                { backgroundColor: colors.surface },
                conversionMode === 'AD_TO_BS' && { backgroundColor: colors.accent }
              ]}
              onPress={() => {
                setConversionMode('AD_TO_BS');
                setInputDate('');
                setResult('');
              }}
              accessibilityRole="button"
              accessibilityLabel="Convert English date to Nepali date"
              accessibilityState={{ selected: conversionMode === 'AD_TO_BS' }}
            >
              <NothingText variant="dot" style={{ fontSize: 12 }} color={conversionMode === 'AD_TO_BS' ? colors.onAccent : colors.text}>
                AD → BS
              </NothingText>
            </Pressable>
            <Pressable
              style={[
                styles.modeButton,
                { backgroundColor: colors.surface },
                conversionMode === 'BS_TO_AD' && { backgroundColor: colors.accent }
              ]}
              onPress={() => {
                setConversionMode('BS_TO_AD');
                setInputDate('');
                setResult('');
              }}
              accessibilityRole="button"
              accessibilityLabel="Convert Nepali date to English date"
              accessibilityState={{ selected: conversionMode === 'BS_TO_AD' }}
            >
              <NothingText variant="dot" style={{ fontSize: 12 }} color={conversionMode === 'BS_TO_AD' ? colors.onAccent : colors.text}>
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
                style={[styles.input, { color: colors.text, backgroundColor: colors.surface }]}
                value={inputDate}
                onChangeText={setInputDate}
                accessibilityLabel={conversionMode === 'AD_TO_BS' ? 'English date, format year-month-day' : 'Nepali date, format year/month/day'}
              />
              <Pressable
                style={[styles.convertBtn, { backgroundColor: colors.accent }]}
                onPress={handleConvert}
                accessibilityRole="button"
                accessibilityLabel="Convert date"
              >
                <NothingText variant="dot" style={{ fontSize: 12 }} color={colors.onAccent}>CONVERT</NothingText>
              </Pressable>
            </View>
          </View>

          {/* Result Display */}
          {result && (
            <Animated.View
              entering={ZoomIn.duration(200)}
              style={[styles.resultCard, { backgroundColor: colors.accentSoft }]}
            >
              <NothingText variant="h3" color={colors.accent}>{result}</NothingText>
            </Animated.View>
          )}
        </View>

        {/* Daily Horoscope Section */}
        <View style={{ marginTop: 32, marginBottom: 32 }}>
          <SectionTitle label="Daily Horoscope" tickColor={colors.iris} />

          {/* Dropdown Selector */}
          <Pressable
            style={[styles.dropdownButton, { backgroundColor: colors.surface }]}
            onPress={() => setDropdownVisible(!dropdownVisible)}
            accessibilityRole="button"
            accessibilityLabel={`Zodiac sign: ${selectedZodiac}. Choose another sign`}
            accessibilityState={{ expanded: dropdownVisible }}
          >
            <NothingText style={{ fontSize: 14 }}>{selectedZodiac}</NothingText>
            <Ionicons name={dropdownVisible ? 'chevron-up' : 'chevron-down'} size={16} color={colors.iris} />
          </Pressable>

          {/* Zodiac Selector - Only visible when dropdown is open */}
          {dropdownVisible && (
            <View style={styles.chipGrid}>
              {ZODIACS.map((zodiac) => (
                <Pressable
                  key={zodiac}
                  style={[
                    styles.chip,
                    { backgroundColor: colors.surface },
                    selectedZodiac === zodiac && { backgroundColor: colors.iris }
                  ]}
                  onPress={() => saveZodiac(zodiac)}
                  accessibilityRole="button"
                  accessibilityLabel={zodiac}
                  accessibilityState={{ selected: selectedZodiac === zodiac }}
                >
                  <NothingText style={{ fontSize: 11 }} color={selectedZodiac === zodiac ? colors.card : colors.text}>
                    {zodiac}
                  </NothingText>
                </Pressable>
              ))}
            </View>
          )}

          <View style={[styles.horoscopeCard, { backgroundColor: colors.irisSoft }]}>
            <NothingText style={{ fontSize: 13.5, lineHeight: 21, color: colors.text }}>
              {dailyHoroscope}
            </NothingText>
          </View>
        </View>
      </View>
      </ScrollView>
    </SafeAreaView>
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
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTick: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  sectionTitle: {
    letterSpacing: 0.3,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  errorContainer: {
    padding: 24,
    alignItems: 'center',
    borderRadius: HundredTheme.radius.lg,
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: HundredTheme.radius.round,
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
    borderRadius: HundredTheme.radius.lg,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: HundredTheme.radius.md,
    marginBottom: 12,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    // 12px vertical padding + ~15px text ≈ 39-40pt tall — close enough to the
    // 44pt guideline for a dense grid; 9px left mis-tap-prone ~33pt targets.
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: HundredTheme.radius.round,
    minWidth: '22%',
    alignItems: 'center',
  },
  horoscopeCard: {
    padding: 16,
    borderRadius: HundredTheme.radius.lg,
    minHeight: 100,
  },
  modeSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: HundredTheme.radius.round,
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
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: HundredTheme.radius.md,
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
  },
  convertBtn: {
    paddingHorizontal: 18,
    borderRadius: HundredTheme.radius.md,
    justifyContent: 'center',
  },
  resultCard: {
    marginTop: 16,
    padding: 14,
    borderRadius: HundredTheme.radius.md,
    alignItems: 'center',
  },
  forexRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  forexField: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: HundredTheme.radius.md,
  },
  forexInput: {
    fontSize: 18,
    padding: 0,
    fontFamily: 'Inter_500Medium',
  },
});
