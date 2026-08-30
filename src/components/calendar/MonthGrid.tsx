import { BsDay, BsMonth, CalendarMode } from '@/src/domain/calendar/types';
import { getAdMonth, getBsMonth } from '@/src/services/api/bsCalendarApi';
import { useAppState } from '@/src/state/appState';
import { NothingText } from '@/src/ui/core/NothingText';
import { HundredTheme } from '@/src/ui/theme/hundred';
import { areDatesEqual, getTodayISO, normalizeDateISO } from '@/src/utils/dateUtils';
import React, { useEffect, useMemo, useState } from 'react';
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

  // One pass over the events instead of a filter per cell per render.
  const eventDates = useMemo(
    () => new Set(events.map((e) => normalizeDateISO(e.adDateISO))),
    [events],
  );

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
        console.error(`[MonthGrid] Error:`, err);
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
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <View style={[styles.errorCard, { backgroundColor: colors.accentSoft }]}>
          <NothingText variant="h3" color={colors.accent}>Couldn&apos;t load this month</NothingText>
          <NothingText variant="caption" style={{ marginTop: 6, textTransform: 'none', letterSpacing: 0 }}>
            {error} — check your connection and try again.
          </NothingText>
        </View>
      </View>
    );
  }

  if (!data) return null;

  // Calculate empty slots for start of month
  // data.days[0].weekday is 0-6 (Sun-Sat)
  const startOffset = data.days[0]?.weekday || 0;
  const emptySlots = Array(startOffset).fill(null);

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <View style={styles.container}>
      {/* Weekday Header */}
      <View style={[styles.headerRow, { borderColor: colors.border }]}>
        {weekDays.map((d, i) => (
          <View key={i} style={styles.headerCell}>
            <NothingText
              variant="dot"
              style={styles.headerText}
              color={i === 6 ? colors.accent : colors.textSecondary}
            >
              {d}
            </NothingText>
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

          return (
            <View key={day.adDateISO} style={styles.cellWrapper}>
              <DayCell
                day={day}
                mode={mode}
                isSelected={isSelected}
                isToday={isToday}
                hasEvents={eventDates.has(normalizeDateISO(day.adDateISO)) || ((day.events?.length ?? 0) > 0)}
                colors={colors}
                onSelectDay={onSelectDay}
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
  errorCard: {
    borderRadius: HundredTheme.radius.lg,
    padding: 20,
    marginHorizontal: 12,
    alignItems: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingBottom: 10,
    marginBottom: 8,
  },
  headerCell: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 11,
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
