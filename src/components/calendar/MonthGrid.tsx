import { getLocalAdMonthSkeleton, getLocalBsMonthSkeleton } from '@/src/domain/calendar/localBsCalendar';
import { BsDay, BsMonth, CalendarMode } from '@/src/domain/calendar/types';
import { getAdMonth, getBsMonth } from '@/src/services/api/bsCalendarApi';
import { useAppState } from '@/src/state/appState';
import { NothingText } from '@/src/ui/core/NothingText';
import { HundredTheme } from '@/src/ui/theme/hundred';
import { areDatesEqual, getTodayISO, normalizeDateISO } from '@/src/utils/dateUtils';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { DayCell } from './DayCell';

interface MonthGridProps {
  year: number;
  month: number;
  mode: CalendarMode;
  onSelectDay: (day: BsDay) => void;
  // Fired when the detailed (network) month lands, so the parent can refresh
  // any day object it captured from the instant skeleton.
  onMonthData?: (month: BsMonth) => void;
}

export function MonthGrid({ year, month, mode, onSelectDay, onMonthData }: MonthGridProps) {
  const { selectedDateISO, events, colors } = useAppState();
  // Instant, offline grid: correct dates/weekdays from the bundled table.
  // Tithi/events hydrate into it when the fetch below resolves. The parent
  // remounts this component per (year, month, mode) via a key, so per-mount
  // initial state is safe.
  const skeleton = useMemo(
    () => (mode === 'BS' ? getLocalBsMonthSkeleton(year, month) : getLocalAdMonthSkeleton(year, month)),
    [year, month, mode],
  );
  const [full, setFull] = useState<BsMonth | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const todayISO = getTodayISO();

  const data = full ?? skeleton;

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
        if (mounted) {
          setFull(res);
          onMonthData?.(res);
        }
      })
      .catch(err => {
        console.error(`[MonthGrid] Error:`, err);
        if (mounted) setError(err.message);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month, mode, attempt]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);

  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.center}>
        <View style={[styles.errorCard, { backgroundColor: colors.accentSoft }]}>
          <NothingText variant="h3" color={colors.accent}>Couldn&apos;t load this month</NothingText>
          <NothingText variant="caption" style={{ marginTop: 6, textTransform: 'none', letterSpacing: 0 }}>
            {error} — check your connection and try again.
          </NothingText>
          <Pressable
            onPress={retry}
            style={[styles.retryBtn, { backgroundColor: colors.accent }]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading this month"
          >
            <NothingText variant="dot" style={{ fontSize: 11 }} color={colors.onAccent}>RETRY</NothingText>
          </Pressable>
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
      {/* Dates render instantly from the bundled table; if the details fetch
          failed, the grid stays usable and only the event/tithi layer is
          missing — say so inline instead of blanking the month. */}
      {error && !full && (
        <Pressable
          onPress={retry}
          style={[styles.noticeBar, { backgroundColor: colors.accentSoft }]}
          accessibilityRole="button"
          accessibilityLabel="Events did not load. Tap to retry"
        >
          <NothingText variant="caption" style={{ textTransform: 'none', letterSpacing: 0 }} color={colors.accent}>
            Events didn&apos;t load — tap to retry
          </NothingText>
        </Pressable>
      )}

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
  retryBtn: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: HundredTheme.radius.round,
  },
  noticeBar: {
    borderRadius: HundredTheme.radius.md,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 10,
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
