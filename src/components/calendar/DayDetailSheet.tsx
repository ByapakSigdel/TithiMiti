import { BsDay } from '@/src/domain/calendar/types';
import { useAppState } from '@/src/state/appState';
import { NothingText } from '@/src/ui/core/NothingText';
import React from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_TRANSLATE_Y = -SCREEN_HEIGHT * 0.8;

interface DayDetailSheetProps {
  day: BsDay | null;
}

export function DayDetailSheet({ day }: DayDetailSheetProps) {
  const { colors } = useAppState();
  const translateY = useSharedValue(0);
  const context = useSharedValue({ y: 0 });

  const gesture = Gesture.Pan()
    .onStart(() => {
      context.value = { y: translateY.value };
    })
    .onUpdate((event) => {
      translateY.value = event.translationY + context.value.y;
      // Limit upward movement
      translateY.value = Math.max(translateY.value, MAX_TRANSLATE_Y);
    })
    .onEnd(() => {
      if (translateY.value < -SCREEN_HEIGHT / 4) {
        translateY.value = withSpring(MAX_TRANSLATE_Y);
      } else {
        translateY.value = withSpring(0);
      }
    });

  const rBottomSheetStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    };
  });

  if (!day) return null;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[styles.bottomSheetContainer, rBottomSheetStyle, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.lineWrapper}>
            <View style={[styles.line, { backgroundColor: colors.textSecondary }]} />
        </View>
        
        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 100 }}>
            <NothingText variant="h2" style={{ marginBottom: 8 }}>
                {day.bsYear} / {day.bsMonth} / {day.bsDay}
            </NothingText>
            <NothingText style={{ color: colors.textSecondary, marginBottom: 16 }}>
                {new Date(day.adDateISO).toDateString()}
            </NothingText>

            {day.tithiRom && (
                <View style={styles.row}>
                    <NothingText style={{ fontWeight: 'bold', width: 100 }}>Tithi:</NothingText>
                    <NothingText>{day.tithiRom}</NothingText>
                </View>
            )}

            {day.extraDetails && (
                <>
                    {day.extraDetails.sunrise && (
                        <View style={styles.row}>
                            <NothingText style={{ fontWeight: 'bold', width: 100 }}>Sunrise:</NothingText>
                            <NothingText>{day.extraDetails.sunrise}</NothingText>
                        </View>
                    )}
                    {day.extraDetails.sunset && (
                        <View style={styles.row}>
                            <NothingText style={{ fontWeight: 'bold', width: 100 }}>Sunset:</NothingText>
                            <NothingText>{day.extraDetails.sunset}</NothingText>
                        </View>
                    )}
                    {day.extraDetails.nakshatra && (
                        <View style={styles.row}>
                            <NothingText style={{ fontWeight: 'bold', width: 100 }}>Nakshatra:</NothingText>
                            <NothingText>{day.extraDetails.nakshatra}</NothingText>
                        </View>
                    )}
                     {day.extraDetails.yog && (
                        <View style={styles.row}>
                            <NothingText style={{ fontWeight: 'bold', width: 100 }}>Yog:</NothingText>
                            <NothingText>{day.extraDetails.yog}</NothingText>
                        </View>
                    )}
                     {day.extraDetails.karan && (
                        <View style={styles.row}>
                            <NothingText style={{ fontWeight: 'bold', width: 100 }}>Karan:</NothingText>
                            <NothingText>{day.extraDetails.karan}</NothingText>
                        </View>
                    )}
                     {day.extraDetails.ritu && (
                        <View style={styles.row}>
                            <NothingText style={{ fontWeight: 'bold', width: 100 }}>Ritu:</NothingText>
                            <NothingText>{day.extraDetails.ritu}</NothingText>
                        </View>
                    )}
                </>
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
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  bottomSheetContainer: {
    height: SCREEN_HEIGHT,
    width: '100%',
    position: 'absolute',
    top: SCREEN_HEIGHT - 100, // Peek height
    borderRadius: 25,
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  lineWrapper: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  line: {
    width: 75,
    height: 4,
    borderRadius: 2,
  },
  content: {
    padding: 20,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 8,
  }
});
