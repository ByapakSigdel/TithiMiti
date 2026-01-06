import { convertAdToBs } from '@/src/domain/calendar/converter';
import { BsDay, BsMonth } from '@/src/domain/calendar/types';
import { getBsMonth } from '@/src/services/api/bsCalendarApi';
import { useAppState } from '@/src/state/appState';
import { NothingText } from '@/src/ui/core/NothingText';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EventsScreen() {
  const { colors, events: userEvents } = useAppState();
  const [data, setData] = useState<BsMonth | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCurrentMonthEvents();
  }, []);

  const loadCurrentMonthEvents = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
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

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  // Combine calendar events and user events
  const allEvents: { date: string; title: string; isUserEvent: boolean; day: BsDay }[] = [];

  if (data) {
    data.days.forEach(day => {
      // Calendar events
      if (day.events && day.events.length > 0) {
        day.events.forEach(evt => {
          allEvents.push({
            date: `${day.bsYear}/${day.bsMonth}/${day.bsDay}`,
            title: evt,
            isUserEvent: false,
            day: day
          });
        });
      }
      // Holiday
      if (day.holidayNameRom) {
         // Avoid duplicates if holiday is also in events
         const exists = day.events?.includes(day.holidayNameRom);
         if (!exists) {
            allEvents.push({
                date: `${day.bsYear}/${day.bsMonth}/${day.bsDay}`,
                title: day.holidayNameRom,
                isUserEvent: false,
                day: day
            });
         }
      }

      // User events for this day
      const dayUserEvents = userEvents.filter(ue => ue.adDateISO === day.adDateISO);
      dayUserEvents.forEach(ue => {
        allEvents.push({
            date: `${day.bsYear}/${day.bsMonth}/${day.bsDay}`,
            title: ue.title,
            isUserEvent: true,
            day: day
        });
      });
    });
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <NothingText variant="h1">Events</NothingText>
        {data && <NothingText style={{ color: colors.textSecondary }}>{data.bsMonthNameRom} {data.bsYear}</NothingText>}
      </View>

      <FlatList
        data={allEvents}
        keyExtractor={(item, index) => `${item.date}-${index}`}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={[styles.eventItem, { borderColor: colors.border }]}>
            <View style={styles.dateBox}>
                <NothingText variant="h3">{item.day.bsDay}</NothingText>
                <NothingText variant="caption" style={{ color: colors.textSecondary }}>{item.day.weekday === 6 ? 'Sat' : 'Day'}</NothingText>
            </View>
            <View style={styles.eventContent}>
                <NothingText style={{ fontWeight: item.isUserEvent ? 'bold' : 'normal' }}>{item.title}</NothingText>
                <NothingText variant="caption" style={{ color: colors.textSecondary }}>
                    {new Date(item.day.adDateISO).toDateString()}
                </NothingText>
            </View>
            {item.isUserEvent && (
                <View style={[styles.dot, { backgroundColor: colors.accent }]} />
            )}
          </View>
        )}
        ListEmptyComponent={
            <NothingText style={{ textAlign: 'center', marginTop: 20, color: colors.textSecondary }}>No events this month</NothingText>
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
