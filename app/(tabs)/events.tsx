import { convertAdToBs } from '@/src/domain/calendar/converter';
import { BS_MONTHS_ROMANIZED } from '@/src/domain/calendar/labels';
import { BsDay, BsMonth } from '@/src/domain/calendar/types';
import { getBsMonth } from '@/src/services/api/bsCalendarApi';
import { updateUserEventsWidget } from '@/src/services/widget/widgetService';
import { useAppState } from '@/src/state/appState';
import { NothingText } from '@/src/ui/core/NothingText';
import { HundredTheme } from '@/src/ui/theme/hundred';
import { getTodayISO } from '@/src/utils/dateUtils';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface EventItem {
  date: string;
  adDateISO: string;
  titles: string[];
  hasUserEvent: boolean;
  day: BsDay;
  isToday: boolean;
}

export default function EventsScreen() {
  const { colors, events: userEvents } = useAppState();
  const [data, setData] = useState<BsMonth | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [todayISO, setTodayISO] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [sortedEvents, setSortedEvents] = useState<EventItem[]>([]);

  const loadCurrentMonthEvents = useCallback(async () => {
    try {
      setLoadError(false);
      // Local-time today: toISOString() is UTC and marks yesterday as "Today"
      // between 00:00 and 05:45 in Nepal.
      const today = getTodayISO();
      setTodayISO(today);
      const conversionResult = await convertAdToBs(today);

      if (conversionResult.bs) {
        const { bsYear, bsMonth } = conversionResult.bs;
        const monthData = await getBsMonth(bsYear, bsMonth);
        setData(monthData);
      } else {
        setLoadError(true);
      }
    } catch (e) {
      console.error(e);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload whenever the tab gains focus so the list survives midnight/month
  // rollovers and recovers after a failed first load (tab screens stay mounted,
  // so a mount-only effect would never rerun).
  useFocusEffect(
    useCallback(() => {
      loadCurrentMonthEvents();
    }, [loadCurrentMonthEvents]),
  );

  // Process events when data changes
  useEffect(() => {
    if (!data) {
      setSortedEvents([]);
      return;
    }

    // Group events by day
    const eventsByDay = new Map<string, EventItem>();

    data.days.forEach(day => {
      const isToday = day.adDateISO === todayISO;
      const dateKey = day.adDateISO;
      const titles: string[] = [];
      let hasUserEvent = false;

      // Calendar events
      if (day.events && day.events.length > 0) {
        titles.push(...day.events);
      }
      // Holiday
      if (day.holidayNameRom) {
         const exists = day.events?.includes(day.holidayNameRom);
         if (!exists) {
            titles.push(day.holidayNameRom);
         }
      }

      // User events for this day
      const dayUserEvents = userEvents.filter(ue => ue.adDateISO === day.adDateISO);
      if (dayUserEvents.length > 0) {
        hasUserEvent = true;
        titles.push(...dayUserEvents.map(ue => ue.title));
      }

      // Only add if there are events
      if (titles.length > 0) {
        eventsByDay.set(dateKey, {
          date: `${day.bsYear}/${day.bsMonth}/${day.bsDay}`,
          adDateISO: day.adDateISO,
          titles,
          hasUserEvent,
          day,
          isToday
        });
      }
    });

    // Sort events chronologically
    const sorted = Array.from(eventsByDay.values()).sort((a, b) => a.adDateISO.localeCompare(b.adDateISO));
    setSortedEvents(sorted);

    // Update user events widget with custom events only
    if (userEvents.length > 0) {
      const sortedUserEvents = userEvents.map(e => ({
        title: e.title,
        date: e.adDateISO,
        adDateISO: e.adDateISO,
      }));
      updateUserEventsWidget(sortedUserEvents);
    } else {
      updateUserEventsWidget([]);
    }

    // Auto-scroll to today
    const todayIndex = sorted.findIndex(e => e.isToday);
    if (todayIndex >= 0 && flatListRef.current) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: todayIndex,
          animated: true,
          viewPosition: 0.2
        });
      }, 300);
    }
  }, [data, todayISO, userEvents]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <View style={[styles.brandTick, { backgroundColor: colors.accent }]} />
          <NothingText variant="caption" color={colors.accent}>This Month</NothingText>
        </View>
        <NothingText variant="h1">Events</NothingText>
        {data && (
          <NothingText style={{ color: colors.textSecondary, marginTop: 2 }}>
            {data.bsMonthNameRom} {data.bsYear}
          </NothingText>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={sortedEvents}
        keyExtractor={(item) => item.adDateISO}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        onScrollToIndexFailed={(info) => {
          // Rows have variable height, so FlatList can't jump to unrendered
          // indices directly: scroll near the target, then retry precisely.
          flatListRef.current?.scrollToOffset({
            offset: info.averageItemLength * info.index,
            animated: false,
          });
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: true,
              viewPosition: 0.2,
            });
          }, 100);
        }}
        renderItem={({ item }) => (
          <View style={[
            styles.eventItem,
            { backgroundColor: colors.card, borderColor: colors.border },
            item.isToday && { backgroundColor: colors.accentSoft, borderColor: colors.accentSoft },
          ]}>
            <View style={[styles.dateBox, { backgroundColor: item.isToday ? colors.card : colors.surface }]}>
                <NothingText variant="h2" style={{ fontSize: 20 }} color={item.isToday ? colors.accent : colors.text}>
                  {item.day.bsDay}
                </NothingText>
                <NothingText variant="caption" style={{ fontSize: 9 }}>
                  {BS_MONTHS_ROMANIZED[(item.day.bsMonth - 1) % 12]?.substring(0, 3)}
                </NothingText>
            </View>
            <View style={styles.eventContent}>
                {item.titles.map((title: string, idx: number) => (
                  <NothingText key={idx} style={{
                    fontSize: 14.5,
                    marginBottom: idx < item.titles.length - 1 ? 4 : 0
                  }}>
                    {title}
                  </NothingText>
                ))}
                <NothingText variant="caption" style={{ marginTop: 6 }} color={item.isToday ? colors.accent : colors.textSecondary}>
                    {item.day.bsYear}/{item.day.bsMonth}/{item.day.bsDay}
                    {item.isToday && '  ·  Today'}
                </NothingText>
            </View>
            {item.hasUserEvent && (
                <View style={[styles.dot, { backgroundColor: colors.teal }]} />
            )}
          </View>
        )}
        ListEmptyComponent={
          loadError && !data ? (
            <View style={{ alignItems: 'center', marginTop: 20 }}>
              <NothingText style={{ textAlign: 'center', color: colors.textSecondary }}>
                Couldn&apos;t load this month&apos;s events. Check your connection.
              </NothingText>
              <Pressable
                style={[styles.retryButton, { backgroundColor: colors.accent }]}
                onPress={() => { setLoading(true); loadCurrentMonthEvents(); }}
                accessibilityRole="button"
                accessibilityLabel="Retry loading events"
              >
                <NothingText variant="dot" style={{ fontSize: 11 }} color={colors.onAccent}>RETRY</NothingText>
              </Pressable>
            </View>
          ) : (
            <NothingText style={{ textAlign: 'center', marginTop: 20, color: colors.textSecondary }}>
              No events this month
            </NothingText>
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  brandTick: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
    borderRadius: HundredTheme.radius.lg,
    borderWidth: 1,
    gap: 14,
  },
  dateBox: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 48,
    height: 52,
    borderRadius: HundredTheme.radius.md,
  },
  eventContent: {
    flex: 1,
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: HundredTheme.radius.round,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 2,
    alignSelf: 'flex-start',
    marginTop: 6,
  }
});
