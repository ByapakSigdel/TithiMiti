import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { convertAdToBs, convertBsToAd } from '../src/domain/calendar/converter';
import { getGoldSilverPrices, GoldSilverPrices } from '../src/services/api/goldSilverService';
import { updateDateWidget, updateGoldSilverWidget, updateHoroscopeWidget } from '../src/services/widget/widgetService';
import { useAppState } from '../src/state/appState';
import { NothingText } from '../src/ui/core/NothingText';


const ZODIACS = ['Mesh', 'Vrishabha', 'Mithuna', 'Karka', 'Simha', 'Kanya', 'Tula', 'Vrishchika', 'Dhanu', 'Makara', 'Kumbha', 'Meen'];

const HOROSCOPES: { [key: string]: string[] } = {
  Mesh: [
    "Stop rushing into everything without thinking. Your impulsive decisions might feel exciting but they're creating unnecessary chaos. Take a breath before you act, Mesh.",
    "Not every battle needs to be fought today. Channel that fire energy into something productive instead of arguing with everyone. Save your energy for what truly matters, Mesh.",
    "Your confidence is attractive but overconfidence is just arrogance in disguise. Listen to others' advice before making that big decision, Mesh.",
    "That competitive streak is showing again. Remember, you're not always racing against others. Sometimes the real competition is with yourself, Mesh."
  ],
  Vrishabha: [
    "Let go of what's no longer serving you, even if it feels comfortable. Clinging to the familiar is holding you back from better opportunities, Vrishabha.",
    "Stop overthinking that purchase. Your financial anxiety is valid but don't let fear of spending prevent you from enjoying life's pleasures, Vrishabha.",
    "Your stubborn nature is showing and it's not cute anymore. Sometimes being flexible is a strength, not a weakness, Vrishabha.",
    "Change isn't your enemy. That resistance to new experiences is limiting your growth. Try something different today, Vrishabha."
  ],
  Mithuna: [
    "Pick a lane and stick with it. Your scattered energy is preventing you from finishing anything meaningful. Focus on one thing today, Mithuna.",
    "Stop talking and start listening. Not every conversation needs your input. Sometimes silence teaches more than words, Mithuna.",
    "Finish what you started before jumping to the next shiny thing. Your inconsistency is creating problems you don't even notice, Mithuna.",
    "Quality over quantity in everything today - conversations, tasks, relationships. Depth matters more than breadth, Mithuna."
  ],
  Karka: [
    "Not everyone is out to hurt you. Your defensive walls are keeping out the good stuff too. Let people in occasionally, Karka.",
    "Stop taking everything so personally. That comment wasn't about you. Your sensitivity is a gift but don't weaponize it, Karka.",
    "You can't protect everyone from everything. Sometimes people need to face their own struggles to grow. Let go a little, Karka.",
    "Your emotional manipulation tactics aren't as subtle as you think. Express your needs directly instead of guilt-tripping others, Karka."
  ],
  Simha: [
    "The world doesn't revolve around you today. Share the spotlight and watch how much more you receive in return, Simha.",
    "Your need for validation is showing. Create for yourself, not for applause. Authentic expression beats performed perfection, Simha.",
    "Humility won't kill you. That defensive pride is just your ego protecting itself. Admit when you're wrong, Simha.",
    "Not every moment needs to be dramatic. Sometimes quiet confidence speaks louder than grand gestures, Simha."
  ],
  Kanya: [
    "Perfection is a myth that's stealing your joy. Good enough is actually good enough today. Let it go, Kanya.",
    "Stop criticizing everyone including yourself. Your judgmental streak is creating distance in your relationships, Kanya.",
    "Not everything needs to be optimized and organized. Sometimes chaos has its own wisdom. Relax your control, Kanya.",
    "Your anxiety about health and wellness is becoming unhealthy. Trust your body knows what it's doing, Kanya."
  ],
  Tula: [
    "Make a decision already. Your chronic indecisiveness is exhausting everyone around you. Sometimes you just have to choose, Tula.",
    "Stop people-pleasing at the cost of your own needs. Saying no doesn't make you a bad person, Tula.",
    "Your peace-keeping is actually conflict-avoidance. Address the real issues instead of smoothing everything over, Tula.",
    "You don't need everyone to like you. Authenticity over approval today. Stand for something, Tula."
  ],
  Vrishchika: [
    "Let go of that grudge you're carrying. It's poisoning only you, not them. Forgiveness is for your peace, Vrishchika.",
    "Not everything is a conspiracy. Your trust issues are pushing away genuine people. Give someone the benefit of doubt, Vrishchika.",
    "Stop stalking their social media. That obsessive behavior isn't giving you peace. Move forward, Vrishchika.",
    "Your intensity scares people sometimes. Not everyone can handle your depth and that's okay. Find your tribe, Vrishchika."
  ],
  Dhanu: [
    "Commitment isn't a cage. Your fear of being tied down is preventing beautiful connections. Stay still for once, Dhanu.",
    "Think before you speak today. Your brutal honesty is just rudeness without compassion. Tact exists for a reason, Dhanu.",
    "Running away won't solve the problem. Face what's in front of you instead of planning the next escape, Dhanu.",
    "The grass isn't greener elsewhere. What you have here is valuable too. Practice gratitude, Dhanu."
  ],
  Makara: [
    "Take a break from work. Your worth isn't measured by productivity alone. Rest is not laziness, Makara.",
    "Stop carrying everyone's responsibilities. That martyr complex is exhausting you for no good reason, Makara.",
    "Loosen up a bit. Not everything needs a plan. Sometimes spontaneity brings the best experiences, Makara.",
    "Success isn't just about the destination. Enjoy the climb occasionally. You're missing the view, Makara."
  ],
  Kumbha: [
    "Come back down to earth. Your detachment is making people feel unloved. Connection requires vulnerability, Kumbha.",
    "Being different doesn't make you superior. Your intellectual arrogance is showing. Listen to others, Kumbha.",
    "The future is important but so is the present. Stop living in tomorrow and engage with today, Kumbha.",
    "Emotions aren't your enemy. That rational approach to feelings is keeping you lonely. Let yourself feel, Kumbha."
  ],
  Meen: [
    "Reality check needed today. Stop escaping into fantasy when life gets hard. Face your problems, Meen.",
    "You can't save everyone. That savior complex is draining you. Focus on your own healing first, Meen.",
    "Stop playing the victim. You have more power than you're claiming. Take responsibility, Meen.",
    "Ground yourself. Your head is in the clouds but your body needs attention too. Come back to reality, Meen."
  ]
};

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
  const [selectedZodiac, setSelectedZodiac] = useState<string>('Aries');
  const [dailyHoroscope, setDailyHoroscope] = useState<string>('');
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
        // Update widget
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
      // Update widget when zodiac changes
      const messages = HOROSCOPES[zodiac] || HOROSCOPES.Mesh;
      const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
      const index = dayOfYear % messages.length;
      await updateHoroscopeWidget(zodiac, messages[index]);
    } catch (e) {
      console.error('Failed to save zodiac:', e);
    }
  };

  const generateDailyHoroscope = async () => {
    const messages = HOROSCOPES[selectedZodiac] || HOROSCOPES.Mesh;
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const index = dayOfYear % messages.length;
    const horoscope = messages[index];
    setDailyHoroscope(horoscope);
    // Update widget
    await updateHoroscopeWidget(selectedZodiac, horoscope);
  };

  const handleConvert = async () => {
    if (conversionMode === 'AD_TO_BS') {
      const r = await convertAdToBs(inputDate);
      const bsDate = r.bs ? `${r.bs.bsYear}/${r.bs.bsMonth}/${r.bs.bsDay}` : 'Invalid date';
      setResult(bsDate);
      // Update date widget
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
