import { BsDay } from '@/src/domain/calendar/types';
import { useAppState } from '@/src/state/appState';
import { NothingText } from '@/src/ui/core/NothingText';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// The sheet is anchored to the bottom of the screen (above the tab bar). It's
// translated DOWN by translateY: 0 = fully open, CLOSED_POSITION leaves only the
// peek (handle + a sliver) visible above the tab bar so it can be grabbed.
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.85);
const PEEK_HEIGHT = 90;
const OPEN_POSITION = 0;
const CLOSED_POSITION = SHEET_HEIGHT - PEEK_HEIGHT;

interface DayDetailSheetProps {
  day: BsDay | null;
}

export function DayDetailSheet({ day }: DayDetailSheetProps) {
  const { colors } = useAppState();
  const translateY = useSharedValue(CLOSED_POSITION);
  const dragStartY = useSharedValue(CLOSED_POSITION);
  const [isOpen, setIsOpen] = useState(false);

  // Snap the sheet to the open or closed (peek) position.
  const snapTo = (open: boolean) => {
    'worklet';
    translateY.value = withTiming(open ? OPEN_POSITION : CLOSED_POSITION, {
      duration: 300,
      easing: Easing.out(Easing.cubic),
    });
    runOnJS(setIsOpen)(open);
  };

  // Drag the handle to pull the sheet up / push it down. On release, snap to the
  // nearer position (a fast flick wins over distance).
  const panGesture = Gesture.Pan()
    .onStart(() => {
      dragStartY.value = translateY.value;
    })
    .onUpdate((e) => {
      const next = dragStartY.value + e.translationY;
      translateY.value = Math.min(Math.max(next, OPEN_POSITION), CLOSED_POSITION);
    })
    .onEnd((e) => {
      const midpoint = (OPEN_POSITION + CLOSED_POSITION) / 2;
      const shouldOpen =
        e.velocityY < -500 ? true : e.velocityY > 500 ? false : translateY.value < midpoint;
      snapTo(shouldOpen);
    });

  // Tap the handle still toggles, as a convenience.
  const tapGesture = Gesture.Tap().onEnd(() => {
    snapTo(translateY.value > OPEN_POSITION + 10);
  });

  const handleGesture = Gesture.Race(panGesture, tapGesture);

  const rBottomSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  if (!day) return null;

  // Calculate Nepal Sambat year (from API or fallback calculation)
  const nepalSambatYear = day.nepalSambat || (day.bsYear - 880);
  const sakSambatYear = day.sakSambat;

  return (
    <Animated.View style={[styles.bottomSheetContainer, rBottomSheetStyle, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Grab area: handle + date header. The whole peek is draggable (pull up
          to expand, push down to minimise); a tap still toggles. */}
      <GestureDetector gesture={handleGesture}>
        <View style={styles.dragRegion}>
          <View style={styles.lineWrapper}>
            <View style={[styles.line, { backgroundColor: colors.textSecondary }]} />
          </View>
          <View style={styles.header}>
            <NothingText variant="h1" style={{ fontSize: 28 }}>
              {day.bsDay}
            </NothingText>
            <View style={{ flex: 1, marginLeft: 16 }}>
              <NothingText variant="h2" style={{ marginBottom: 4 }}>
                {day.bsYear} / {day.bsMonth}
              </NothingText>
              <NothingText style={{ color: colors.textSecondary, fontSize: 12 }}>
                {new Date(day.adDateISO).toDateString()}
              </NothingText>
              <NothingText style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                Nepal Sambat: {nepalSambatYear}
              </NothingText>
              {sakSambatYear && (
                <NothingText style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Sak Sambat: {sakSambatYear}
                </NothingText>
              )}
            </View>
          </View>
        </View>
      </GestureDetector>
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={true}
        scrollEnabled={isOpen}
        nestedScrollEnabled={true}
      >
        {/* Tithi */}
        {day.tithiRom && (
            <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
              <NothingText style={styles.infoLabel}>Tithi</NothingText>
              <View style={{ alignItems: 'flex-end' }}>
                <NothingText style={styles.infoValue}>{day.tithiRom}</NothingText>
                {day.extraDetails?.tithiEndDisplay && (
                  <NothingText style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                    {day.extraDetails.tithiEndDisplay}
                  </NothingText>
                )}
              </View>
            </View>
        )}

        {/* Panchanga Details */}
        {day.extraDetails && (
          <View>
              {/* Times Section */}
              <View style={{ marginTop: 16 }}>
                <NothingText variant="h3" style={{ marginBottom: 12 }}>Sun & Moon Times</NothingText>
                <View style={styles.detailsGrid}>
                  {day.extraDetails.sunrise && (
                    <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
                      <NothingText style={styles.detailLabel}>Sunrise</NothingText>
                      <NothingText style={styles.detailValue}>{day.extraDetails.sunrise}</NothingText>
                    </View>
                  )}
                  {day.extraDetails.sunset && (
                    <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
                      <NothingText style={styles.detailLabel}>Sunset</NothingText>
                      <NothingText style={styles.detailValue}>{day.extraDetails.sunset}</NothingText>
                    </View>
                  )}
                  {day.extraDetails.moonrise && (
                    <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
                      <NothingText style={styles.detailLabel}>Moonrise</NothingText>
                      <NothingText style={styles.detailValue}>{day.extraDetails.moonrise}</NothingText>
                    </View>
                  )}
                  {day.extraDetails.moonset && (
                    <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
                      <NothingText style={styles.detailLabel}>Moonset</NothingText>
                      <NothingText style={styles.detailValue}>{day.extraDetails.moonset}</NothingText>
                    </View>
                  )}
                </View>
              </View>

              {/* Panchanga Section */}
              <View style={{ marginTop: 16 }}>
                <NothingText variant="h3" style={{ marginBottom: 12 }}>Panchanga</NothingText>
                <View style={styles.detailsGrid}>
                  {day.extraDetails.pakshya && (
                    <View style={[styles.detailCard, { backgroundColor: colors.background, width: '100%' }]}>
                      <NothingText style={styles.detailLabel}>Pakshya</NothingText>
                      <NothingText style={styles.detailValue}>{day.extraDetails.pakshya}</NothingText>
                    </View>
                  )}
                  {day.extraDetails.nakshatra && (
                    <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
                      <NothingText style={styles.detailLabel}>Nakshatra</NothingText>
                      <NothingText style={styles.detailValue}>{day.extraDetails.nakshatra}</NothingText>
                      {day.extraDetails.nakshatraEnd && (
                        <NothingText style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                          Until {day.extraDetails.nakshatraEnd}
                        </NothingText>
                      )}
                    </View>
                  )}
                  {day.extraDetails.yog && (
                    <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
                      <NothingText style={styles.detailLabel}>Yog</NothingText>
                      <NothingText style={styles.detailValue}>{day.extraDetails.yog}</NothingText>
                      {day.extraDetails.yogEnd && (
                        <NothingText style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                          Until {day.extraDetails.yogEnd}
                        </NothingText>
                      )}
                    </View>
                  )}
                  {day.extraDetails.karan && (
                    <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
                      <NothingText style={styles.detailLabel}>Karan (1st Half)</NothingText>
                      <NothingText style={styles.detailValue}>{day.extraDetails.karan}</NothingText>
                    </View>
                  )}
                  {day.extraDetails.karanSecond && (
                    <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
                      <NothingText style={styles.detailLabel}>Karan (2nd Half)</NothingText>
                      <NothingText style={styles.detailValue}>{day.extraDetails.karanSecond}</NothingText>
                    </View>
                  )}
                </View>
              </View>

              {/* Rashi Section */}
              {(day.extraDetails.chandraRashi || day.extraDetails.suryaRashi) && (
                <View style={{ marginTop: 16 }}>
                  <NothingText variant="h3" style={{ marginBottom: 12 }}>Rashi</NothingText>
                  <View style={styles.detailsGrid}>
                    {day.extraDetails.chandraRashi && (
                      <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
                        <NothingText style={styles.detailLabel}>Chandra Rashi</NothingText>
                        <NothingText style={styles.detailValue}>{day.extraDetails.chandraRashi}</NothingText>
                        {day.extraDetails.chandraRashiEnd && (
                          <NothingText style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
                            Until {day.extraDetails.chandraRashiEnd}
                          </NothingText>
                        )}
                      </View>
                    )}
                    {day.extraDetails.suryaRashi && (
                      <View style={[styles.detailCard, { backgroundColor: colors.background }]}>
                        <NothingText style={styles.detailLabel}>Surya Rashi</NothingText>
                        <NothingText style={styles.detailValue}>{day.extraDetails.suryaRashi}</NothingText>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Season Section */}
              {day.extraDetails.ritu && (
                <View style={{ marginTop: 16 }}>
                  <NothingText variant="h3" style={{ marginBottom: 12 }}>Season</NothingText>
                  <View style={[styles.infoCard, { backgroundColor: colors.background }]}>
                    <NothingText style={styles.infoLabel}>Ritu</NothingText>
                    <NothingText style={styles.infoValue}>{day.extraDetails.ritu}</NothingText>
                  </View>
                </View>
              )}

              {/* Muhurats Section */}
              {day.extraDetails.muhurats && day.extraDetails.muhurats.length > 0 && (
                <View style={{ marginTop: 16 }}>
                  <NothingText variant="h3" style={{ marginBottom: 12 }}>Auspicious Moments</NothingText>
                  {day.extraDetails.muhurats.map((muhurat: any, index: number) => (
                    <View key={index} style={[styles.muhurtCard, { backgroundColor: colors.background }]}>
                      <NothingText style={styles.muhurtName}>{muhurat.name}</NothingText>
                      <NothingText style={[styles.muhurtTime, { color: colors.accent }]}>{muhurat.time}</NothingText>
                    </View>
                  ))}
                </View>
              )}
          </View>
          )}

          {day.events && day.events.length > 0 && (
              <View style={{ marginTop: 16 }}>
                  <NothingText variant="h3" style={{ marginBottom: 8 }}>Events</NothingText>
                  {day.events.map((e, i) => (
                      <NothingText key={i} style={{ marginBottom: 4 }}>• {e}</NothingText>
                  ))}
              </View>
          )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bottomSheetContainer: {
    height: SHEET_HEIGHT,
    width: '100%',
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 0,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  dragRegion: {
    paddingHorizontal: 20,
  },
  lineWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
  },
  line: {
    width: 60,
    height: 5,
    borderRadius: 3,
    opacity: 0.4,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 4,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(128,128,128,0.2)',
  },
  infoCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailCard: {
    width: '48%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.7,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  muhurtCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  muhurtName: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  muhurtTime: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 12,
  },
});
