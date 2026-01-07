import { convertAdToBs } from '@/src/domain/calendar/converter';
import { BS_MONTHS_ROMANIZED } from '@/src/domain/calendar/labels';
import { BsDay, BsMonth } from '@/src/domain/calendar/types';
import { getBsMonth } from '@/src/services/api/bsCalendarApi';
import { updateEventsWidget } from '@/src/services/widget/widgetService';
import { useAppState } from '@/src/state/appState';
import { NothingText } from '@/src/ui/core/NothingText';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
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
  const [todayISO, setTodayISO] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const [sortedEvents, setSortedEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    loadCurrentMonthEvents();
  }, []);

  const loadCurrentMonthEvents = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      setTodayISO(today);
      const conversionResult = await convertAdToBs(today);
      
      if (conversionResult.bs) {
        const { bsYear, bsMonth } = conversionResult.bs;
        const monthData = await getBsMonth(bsYear, bsMonth);
        setData(monthData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

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
    // Sort events chronologically
    const sorted = Array.from(eventsByDay.values()).sort((a, b) => a.adDateISO.localeCompare(b.adDateISO));
    setSortedEvents(sorted);

    // Update events widget with today's events
    const todayEvents = sorted.find(e => e.isToday);
    if (todayEvents) {
      updateEventsWidget(todayEvents.titles);
    } else {
      updateEventsWidget([]);
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

  // Check if there are events today
  const hasEventsToday = sortedEvents.some(e => e.isToday);

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
        <NothingText variant="h1">Events</NothingText>
        {data && <NothingText style={{ color: colors.textSecondary }}>{data.bsMonthNameRom} {data.bsYear}</NothingText>}
      </View>

      <FlatList
        ref={flatListRef}
        data={sortedEvents}
        keyExtractor={(item, index) => `${item.date}-${index}`}
        contentContainerStyle={{ padding: 16 }}
        onScrollToIndexFailed={() => {}}
        renderItem={({ item }) => (
          <View style={[
            styles.eventItem,
            { borderColor: colors.border },
            item.isToday && { backgroundColor: colors.card, borderLeftWidth: 3, borderLeftColor: '#FF0000' }
          ]}>
            <View style={styles.dateBox}>
                <NothingText variant="h3" style={{ color: item.isToday ? '#FF0000' : colors.text }}>
                  {item.day.bsDay}
                </NothingText>
                <NothingText variant="caption" style={{ color: colors.textSecondary }}>
                  {BS_MONTHS_ROMANIZED[(item.day.bsMonth - 1) % 12]?.substring(0, 3)}
                </NothingText>
            </View>
            <View style={styles.eventContent}>
                {item.titles.map((title, idx) => (
                  <NothingText key={idx} style={{ 
                    color: colors.text,
                    marginBottom: idx < item.titles.length - 1 ? 4 : 0
                  }}>
                    • {title}
                  </NothingText>
                ))}
                <NothingText variant="caption" style={{ color: colors.textSecondary, marginTop: 4 }}>
                    {item.day.bsYear}/{item.day.bsMonth}/{item.day.bsDay}
                    {item.isToday && ' • Today'}
                </NothingText>
            </View>
            {item.hasUserEvent && (
                <View style={[styles.dot, { backgroundColor: '#FF0000' }]} />
            )}
          </View>
        )}
        ListEmptyComponent={
            <NothingText style={{ textAlign: 'center', marginTop: 20, color: colors.textSecondary }}>
              {!hasEventsToday && todayISO ? 'No events today' : 'No events this month'}
            </NothingText>
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
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 16,
  },
  dateBox: {
    alignItems: 'center',
    width: 40,
  },
  eventContent: {
    flex: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  }
});
