import { BsDay, CalendarMode } from '@/src/domain/calendar/types';
import { useAppState } from '@/src/state/appState';
import { NothingText } from '@/src/ui/core/NothingText';
import { NothingTheme } from '@/src/ui/theme/nothing';
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface DayCellProps {
  day: BsDay;
  mode: CalendarMode;
  isSelected: boolean;
  isToday: boolean;
  hasEvents: boolean;
  onPress: () => void;
}

export function DayCell({ day, mode, isSelected, isToday, hasEvents, onPress }: DayCellProps) {
  const { colors } = useAppState();
  const isHoliday = !!day.holidayNameRom;
  const hasApiEvents = (day.events && day.events.length > 0);
  const isSaturday = day.weekday === 6; // 0-6, 6 is Saturday
  
  // Animation for selection
  const scale = useSharedValue(isSelected ? 1 : 0);
  
  useEffect(() => {
    scale.value = withSpring(isSelected ? 1 : 0, { damping: 15, stiffness: 150 });
  }, [isSelected]);

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
  const primaryColor = isSelected ? colors.background : textColor;
  const secondaryColor = isSelected ? colors.textSecondary : colors.textSecondary;

  // Today border color - ensure it's always visible
  const todayBorderColor = isSelected ? colors.background : colors.text;

  return (
    <Pressable 
      onPress={onPress} 
      style={[
        styles.container, 
        // Today indicator - always show when it's today, even when selected
        isToday && { 
          borderWidth: 2, 
          borderColor: todayBorderColor,
        }
      ]}
    >
      {/* Animated Selection Background */}
      <Animated.View 
        style={[
          StyleSheet.absoluteFill, 
          { backgroundColor: colors.text, borderRadius: NothingTheme.radius.round },
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
          <View style={[styles.dot, { backgroundColor: colors.accent }]} />
        )}
        
        <NothingText 
          variant="caption" 
          style={{ marginTop: 2, fontSize: 10 }}
          color={secondaryColor}
        >
          {secondaryNum}
        </NothingText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    aspectRatio: 1, // Square cells
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: NothingTheme.radius.round, // Circular selection
    overflow: 'hidden', // Ensure background doesn't spill
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1, // Ensure text is above background
  },
  primaryText: {
    fontSize: 16,
    fontFamily: NothingTheme.font.dotMatrix,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 4,
  },
});
