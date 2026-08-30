import { getBsMonthName } from '@/src/domain/calendar/labels';
import { BsDay, CalendarMode } from '@/src/domain/calendar/types';
import { NothingText } from '@/src/ui/core/NothingText';
import { ThemeColors } from '@/src/ui/theme/hundred';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface DayCellProps {
  day: BsDay;
  mode: CalendarMode;
  isSelected: boolean;
  isToday: boolean;
  hasEvents: boolean;
  colors: ThemeColors;
  onSelectDay: (day: BsDay) => void;
}

const CELL_RADIUS = 14;

// Memoized, and takes colors as a prop instead of consuming the app context:
// consuming context here re-rendered all ~32 cells (plus a spring each) on any
// state change, which stuttered day selection on low-end devices.
export const DayCell = React.memo(function DayCell({ day, mode, isSelected, isToday, hasEvents, colors, onSelectDay }: DayCellProps) {
  const isHoliday = !!day.holidayNameRom;
  const hasApiEvents = (day.events && day.events.length > 0);
  const isSaturday = day.weekday === 6; // 0-6, 6 is Saturday

  // Animation for selection
  const scale = useSharedValue(isSelected ? 1 : 0);

  useEffect(() => {
    scale.value = withSpring(isSelected ? 1 : 0, { damping: 15, stiffness: 150 });
  }, [isSelected, scale]);

  const rStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: scale.value,
    };
  });

  // Primary number is based on mode
  const primaryNum = mode === 'BS' ? day.bsDay : new Date(day.adDateISO).getDate();
  const secondaryNum = mode === 'BS' ? new Date(day.adDateISO).getDate() : day.bsDay;

  const textColor = (isHoliday || isSaturday) ? colors.accent : colors.text;
  const primaryColor = isSelected ? colors.onAccent : textColor;
  const secondaryColor = isSelected ? colors.onAccent : colors.textSecondary;
  const dotColor = isSelected ? colors.onAccent : colors.teal;

  const a11yLabel = [
    `${getBsMonthName(day.bsMonth)} ${day.bsDay}, ${day.bsYear}`,
    isToday ? 'today' : null,
    isHoliday ? day.holidayNameRom : null,
    (hasEvents || hasApiEvents) ? 'has events' : null,
  ].filter(Boolean).join(', ');

  return (
    <Pressable
      onPress={() => onSelectDay(day)}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityState={{ selected: isSelected }}
      style={[
        styles.container,
        // Today indicator: marigold ring, always visible (even when selected)
        isToday && {
          borderWidth: 2,
          borderColor: colors.marigold,
        },
      ]}
    >
      {/* Animated Selection Background */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.accent, borderRadius: CELL_RADIUS - 2 },
          rStyle
        ]}
      />

      <View style={styles.content}>
        <NothingText
          style={[styles.primaryText]}
          color={primaryColor}
        >
          {primaryNum}
        </NothingText>

        {(hasEvents || hasApiEvents) && (
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
        )}

        <NothingText
          variant="caption"
          style={{ marginTop: 2, fontSize: 9, letterSpacing: 0 }}
          color={secondaryColor}
        >
          {secondaryNum}
        </NothingText>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    aspectRatio: 1, // Square cells
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: CELL_RADIUS,
    overflow: 'hidden',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1, // Ensure text is above background
  },
  primaryText: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 1.5,
    marginTop: 3,
  },
});
