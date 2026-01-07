import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { convertAdToBs, convertBsToAd } from '../src/domain/calendar/converter';
import { fetchMetalPrices, MetalPrice } from '../src/services/api/metalPricesApi';
import { cacheMetalPrices, getCachedMetalPrices } from '../src/services/cache/metalPricesCache';
import { useAppState } from '../src/state/appState';
import { NothingText } from '../src/ui/core/NothingText';
import { NothingTheme } from '../src/ui/theme/nothing';

export default function ConverterScreen() {
  const { colors } = useAppState();
  const [adISO, setAdISO] = useState('');
  const [bsYear, setBsYear] = useState('');
  const [bsMonth, setBsMonth] = useState('');
  const [bsDay, setBsDay] = useState('');
  const [result, setResult] = useState<string>('');
  
  // Metal prices state
  const [metalPrices, setMetalPrices] = useState<MetalPrice | null>(null);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [pricesError, setPricesError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load metal prices on mount and when screen is focused
  const loadMetalPrices = async (forceRefresh = false) => {
    try {
      setPricesLoading(true);
      setPricesError(null);

      // Try to get cached prices first
      if (!forceRefresh) {
        const cached = await getCachedMetalPrices();
        if (cached) {
          setMetalPrices(cached);
          setPricesLoading(false);
          // Still fetch fresh data in background
          fetchMetalPrices().then(fresh => {
            if (fresh) {
              setMetalPrices(fresh);
              cacheMetalPrices(fresh);
            }
          });
          return;
        }
      }

      // Fetch fresh prices
      const prices = await fetchMetalPrices();
      if (prices) {
        setMetalPrices(prices);
        await cacheMetalPrices(prices);
      } else {
        setPricesError('Failed to fetch prices. Please try again.');
      }
    } catch (error) {
      setPricesError('Failed to load metal prices');
      console.error('Metal prices error:', error);
    } finally {
      setPricesLoading(false);
      setRefreshing(false);
    }
  };

  // Load prices on mount
  useEffect(() => {
    loadMetalPrices();
  }, []);

  // Refresh prices when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      loadMetalPrices();
    }, [])
  );

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
      <NothingText variant="h2" style={styles.title}>Services</NothingText>

      {/* Metal Prices Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="logo-usd" size={24} color={colors.text} />
          <NothingText variant="h3" style={{ marginLeft: 8 }}>Daily Metal Prices</NothingText>
        </View>

        {pricesLoading && !metalPrices ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.text} />
            <NothingText style={{ marginTop: 8, color: colors.textSecondary }}>Loading prices...</NothingText>
          </View>
        ) : pricesError && !metalPrices ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.accent} />
            <NothingText style={{ marginTop: 8, color: colors.textSecondary }}>{pricesError}</NothingText>
            <Pressable style={styles.retryButton} onPress={() => loadMetalPrices(true)}>
              <NothingText style={{ color: NothingTheme.colors.white }}>Retry</NothingText>
            </Pressable>
          </View>
        ) : metalPrices ? (
          <>
            <View style={styles.pricesGrid}>
              {/* Gold Price Card */}
              <View style={[styles.priceCard, { backgroundColor: colors.background }]}>
                <Ionicons name="diamond-outline" size={32} color="#FFD700" />
                <NothingText variant="caption" style={{ marginTop: 8, color: colors.textSecondary }}>GOLD (24K)</NothingText>
                {metalPrices.goldPerGram && (
                  <>
                    <NothingText variant="h2" style={{ marginTop: 4 }}>
                      ₨{metalPrices.goldPerGram.toLocaleString('en-NP')}
                    </NothingText>
                    <NothingText variant="caption" style={{ color: colors.textSecondary }}>
                      per gram
                    </NothingText>
                  </>
                )}
                <NothingText variant="caption" style={{ marginTop: 8, color: colors.textSecondary }}>
                  ${metalPrices.gold.toFixed(2)}/oz
                </NothingText>
              </View>

              {/* Silver Price Card */}
              <View style={[styles.priceCard, { backgroundColor: colors.background }]}>
                <Ionicons name="diamond-outline" size={32} color="#C0C0C0" />
                <NothingText variant="caption" style={{ marginTop: 8, color: colors.textSecondary }}>SILVER</NothingText>
                {metalPrices.silverPerGram && (
                  <>
                    <NothingText variant="h2" style={{ marginTop: 4 }}>
                      ₨{metalPrices.silverPerGram.toLocaleString('en-NP')}
                    </NothingText>
                    <NothingText variant="caption" style={{ color: colors.textSecondary }}>
                      per gram
                    </NothingText>
                  </>
                )}
                <NothingText variant="caption" style={{ marginTop: 8, color: colors.textSecondary }}>
                  ${metalPrices.silver.toFixed(2)}/oz
                </NothingText>
              </View>
            </View>
          </>
        ) : null}

        {metalPrices && (
          <View style={styles.pricesFooter}>
            <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
            <NothingText variant="caption" style={{ marginLeft: 4, color: colors.textSecondary }}>
              Last updated: {new Date(metalPrices.timestamp).toLocaleTimeString()}
            </NothingText>
          </View>
        )}
      </View>

      {/* Date Converter Section */}
      <View style={[styles.section, { backgroundColor: colors.card }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar-outline" size={24} color={colors.text} />
          <NothingText variant="h3" style={{ marginLeft: 8 }}>Date Converter</NothingText>
        </View>

        {/* AD to BS Converter */}
        <View style={styles.converterCard}>
          <View style={styles.converterHeader}>
            <Ionicons name="arrow-forward-circle-outline" size={20} color={colors.accent} />
            <NothingText style={[styles.converterLabel, { color: colors.text }]}>AD → BS</NothingText>
          </View>
          <View style={styles.inputRow}>
            <TextInput
              placeholder="2026-01-07"
              placeholderTextColor={colors.textSecondary}
              style={[styles.modernInput, { color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              value={adISO}
              onChangeText={setAdISO}
            />
            <Pressable
              style={[styles.convertButton, { backgroundColor: colors.text }]}
              onPress={async () => {
                const r = await convertAdToBs(adISO);
                setResult(r.bs ? `विक्रम संवत: ${r.bs.bsYear} / ${r.bs.bsMonth} / ${r.bs.bsDay}` : 'Invalid date');
              }}
            >
              <Ionicons name="swap-horizontal" size={20} color={colors.background} />
            </Pressable>
          </View>
        </View>

        {/* BS to AD Converter */}
        <View style={[styles.converterCard, { marginTop: 16 }]}>
          <View style={styles.converterHeader}>
            <Ionicons name="arrow-back-circle-outline" size={20} color={colors.accent} />
            <NothingText style={[styles.converterLabel, { color: colors.text }]}>BS → AD</NothingText>
          </View>
          <View style={styles.inputRow}>
            <TextInput
              placeholder="Year"
              placeholderTextColor={colors.textSecondary}
              style={[styles.modernInput, { flex: 1, color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              keyboardType="numeric"
              value={bsYear}
              onChangeText={setBsYear}
            />
            <TextInput
              placeholder="Month"
              placeholderTextColor={colors.textSecondary}
              style={[styles.modernInput, { flex: 0.7, color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              keyboardType="numeric"
              value={bsMonth}
              onChangeText={setBsMonth}
            />
            <TextInput
              placeholder="Day"
              placeholderTextColor={colors.textSecondary}
              style={[styles.modernInput, { flex: 0.7, color: colors.text, backgroundColor: colors.background, borderColor: colors.border }]}
              keyboardType="numeric"
              value={bsDay}
              onChangeText={setBsDay}
            />
            <Pressable
              style={[styles.convertButton, { backgroundColor: colors.text }]}
              onPress={async () => {
                const y = parseInt(bsYear, 10);
                const m = parseInt(bsMonth, 10);
                const d = parseInt(bsDay, 10);
                const r = await convertBsToAd(y, m, d);
                setResult(r.ad ? `Gregorian: ${r.ad.dateISO}` : 'Invalid date');
              }}
            >
              <Ionicons name="swap-horizontal" size={20} color={colors.background} />
            </Pressable>
          </View>
        </View>

        {/* Result Display */}
        {result && (
          <Animated.View 
            entering={ZoomIn.duration(300)}
            style={[styles.resultCard, { backgroundColor: colors.background }]}
          >
            <Ionicons name="checkmark-circle" size={24} color={NothingTheme.colors.red} />
            <NothingText style={[styles.resultText, { marginLeft: 8 }]}>{result}</NothingText>
          </Animated.View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: NothingTheme.spacing.lg },
  title: { letterSpacing: 1.4, marginBottom: 16 },
  section: { 
    borderRadius: NothingTheme.radius.md, 
    padding: NothingTheme.spacing.md, 
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: NothingTheme.colors.red,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: NothingTheme.radius.sm,
  },
  pricesGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  priceCard: {
    flex: 1,
    padding: 16,
    borderRadius: NothingTheme.radius.md,
    alignItems: 'center',
  },
  pricesFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  converterCard: {
    marginBottom: 8,
  },
  converterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  converterLabel: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  modernInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: NothingTheme.radius.sm,
    borderWidth: 1,
    fontSize: 14,
  },
  convertButton: {
    width: 44,
    height: 44,
    borderRadius: NothingTheme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: NothingTheme.radius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  resultText: {
    fontSize: 16,
    fontWeight: '600',
  },
  card: { borderRadius: NothingTheme.radius.md, padding: NothingTheme.spacing.md, gap: NothingTheme.spacing.sm, marginBottom: 16 },
  label: { letterSpacing: 1 },
  input: { borderBottomWidth: 1, paddingVertical: 8 },
  button: { backgroundColor: NothingTheme.colors.red, padding: 10, borderRadius: NothingTheme.radius.sm, alignItems: 'center' },
  buttonText: { color: NothingTheme.colors.white, letterSpacing: 1 },
  result: { borderRadius: NothingTheme.radius.md, padding: NothingTheme.spacing.md, marginBottom: 16 },
});
