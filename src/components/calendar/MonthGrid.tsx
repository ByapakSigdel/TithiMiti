import { BsDay, BsMonth, CalendarMode } from '@/src/domain/calendar/types';
import { getAdMonth, getBsMonth } from '@/src/services/api/bsCalendarApi';
import { useAppState } from '@/src/state/appState';
import { NothingText } from '@/src/ui/core/NothingText';
import { NothingTheme } from '@/src/ui/theme/nothing';
import { areDatesEqual, getTodayISO } from '@/src/utils/dateUtils';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { DayCell } from './DayCell';

interface MonthGridProps {
  year: number;
  month: number;
  mode: CalendarMode;
  onSelectDay: (day: BsDay) => void;
}

export function MonthGrid({ year, month, mode, onSelectDay }: MonthGridProps) {
  const { selectedDateISO, events, colors } = useAppState();
  const [data, setData] = useState<BsMonth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const todayISO = getTodayISO();

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    
    const fetchFn = mode === 'BS' ? getBsMonth : getAdMonth;

    fetchFn(year, month)
      .then(res => {
        if (mounted) setData(res);
      })
      .catch(err => {
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
  }, [year, month, mode]);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={NothingTheme.colors.red} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <NothingText color={NothingTheme.colors.red}>Failed to load calendar</NothingText>
        <NothingText variant="caption">{error}</NothingText>
      </View>
    );
  }

  if (!data) return null;

  // Calculate empty slots for start of month
  // data.days[0].weekday is 0-6 (Sun-Sat)
  const startOffset = data.days[0]?.weekday || 0;
  const emptySlots = Array(startOffset).fill(null);

  const weekDays = mode === 'BS' 
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View style={styles.container}>
      {/* Weekday Header */}
      <View style={[styles.headerRow, { borderColor: colors.border }]}>
        {weekDays.map((d, i) => (
          <View key={i} style={styles.headerCell}>
            <NothingText variant="dot" style={styles.headerText} color={colors.text}>{d}</NothingText>
          </View>
        ))}
      </View>

      {/* Grid */}
      <View style={styles.grid}>
        {emptySlots.map((_, i) => (
          <View key={`empty-${i}`} style={styles.emptyCell} />
        ))}
        {data.days.map((day) => {
          const isSelected = areDatesEqual(day.adDateISO, selectedDateISO);
          const isToday = areDatesEqual(day.adDateISO, todayISO);
          const dayEvents = events.filter(e => areDatesEqual(e.adDateISO, day.adDateISO));
          
          return (
            <View key={day.adDateISO} style={styles.cellWrapper}>
              <DayCell
                day={day}
                mode={mode}
                isSelected={isSelected}
                isToday={isToday}
                hasEvents={dayEvents.length > 0 || ((day.events?.length ?? 0) > 0)}
                onPress={() => onSelectDay(day)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: NothingTheme.colors.black,
    paddingBottom: 8,
    marginBottom: 8,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cellWrapper: {
    width: '14.28%', // 100% / 7
    aspectRatio: 1,
  },
  emptyCell: {
    width: '14.28%',
    aspectRatio: 1,
  },
});
