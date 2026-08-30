import { DayDetailSheet } from '@/src/components/calendar/DayDetailSheet';
import { MonthGrid } from '@/src/components/calendar/MonthGrid';
import { AddEventModal } from '@/src/components/events/AddEventModal';
import { convertAdToBs } from '@/src/domain/calendar/converter';
import { formatBsDateNepali, getBsMonthName } from '@/src/domain/calendar/labels';
import { BsDay } from '@/src/domain/calendar/types';
import { getAdMonth, getBsMonth } from '@/src/services/api/bsCalendarApi';
import { initNotifications } from '@/src/services/notifications';
import { updateTodayWidget } from '@/src/services/widget/widgetService';
import { useAppState } from '@/src/state/appState';
import { NothingButton } from '@/src/ui/core/NothingButton';
import { NothingText } from '@/src/ui/core/NothingText';
import { HundredTheme } from '@/src/ui/theme/hundred';
import { areDatesEqual, getTodayISO } from '@/src/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, LinearTransition, runOnJS } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CalendarScreen() {
  const { mode, setMode, selectedDateISO, setSelectedDateISO, events, setThemeMode, activeTheme, colors } = useAppState();

  // Local state for the *viewed* month (distinct from selected date)
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [isAddEventVisible, setIsAddEventVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<BsDay | null>(null);

  // Sync view with selected date or mode changes
  useEffect(() => {
    let mounted = true;
    const syncView = async () => {
      // Ensure we have a selected day object if it's missing (e.g. initial load)
      if (!selectedDay) {
        try {
          const res = await convertAdToBs(selectedDateISO);
          if (mounted && res.bs) {
            setSelectedDay(res.bs);
          }
        } catch (e) {
          // ignore
        }
      }

      if (mode === 'BS') {
        // Convert the anchor date (selectedDateISO) to BS to find the correct BS Year/Month
        try {
          const res = await convertAdToBs(selectedDateISO);
          if (mounted && res.bs) {
            setViewYear(res.bs.bsYear);
            setViewMonth(res.bs.bsMonth);
          } else if (mounted) {
            // Fallback if conversion fails or returns no BS day (e.g. out of range)
            // Approximate: AD Year + 57
            const adYear = new Date(selectedDateISO).getFullYear();
            if (adYear < 2000) {
               // If we somehow got a low year, don't trust it.
               setViewYear(new Date().getFullYear() + 57);
            } else {
               setViewYear(adYear + 57);
            }
          }
        } catch (e) {
          if (mounted) {
             const adYear = new Date(selectedDateISO).getFullYear();
             setViewYear(adYear + 57);
          }
        }
      } else {
        // AD Mode: Just use the AD date parts
        const date = new Date(selectedDateISO);
        setViewYear(date.getFullYear());
        setViewMonth(date.getMonth() + 1);
      }
    };
    syncView();
    return () => { mounted = false; };
  }, [mode, selectedDateISO]);

  useEffect(() => {
    initNotifications();

    const updateAllWidgets = async () => {
      try {
        const todayISO = getTodayISO();
        const result = await convertAdToBs(todayISO);
        if (result.bs) {
          const bsDate = `${result.bs.bsYear}/${result.bs.bsMonth}/${result.bs.bsDay}`;
          const monthData = await getBsMonth(result.bs.bsYear, result.bs.bsMonth);
          const todayData = monthData.days.find(d => d.adDateISO === todayISO);
          if (todayData) {
            // Include today's holiday/event — omitting it here overwrote the
            // seed from initializeAllWidgets and wiped the widget's event line.
            const todayEvent = todayData.holidayNameRom
              || (todayData.events && todayData.events.length > 0 ? todayData.events[0] : '');
            await updateTodayWidget(
              bsDate,
              todayData.tithiRom || 'N/A',
              todayData.extraDetails?.sunrise || '06:45',
              todayData.extraDetails?.sunset || '17:30',
              todayEvent,
              formatBsDateNepali(result.bs.bsYear, result.bs.bsMonth, result.bs.bsDay)
            );
          }
        }
      } catch (e) {
        console.error('Failed to update widgets:', e);
      }
    };
    // Defer briefly so the first month grid paint wins the network.
    const timer = setTimeout(updateAllWidgets, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Prefetch the adjacent months in the background once the current view is
  // settled, so swiping to the previous/next month feels instant.
  useEffect(() => {
    const timer = setTimeout(() => {
      const prev = viewMonth === 1
        ? { y: viewYear - 1, m: 12 }
        : { y: viewYear, m: viewMonth - 1 };
      const next = viewMonth === 12
        ? { y: viewYear + 1, m: 1 }
        : { y: viewYear, m: viewMonth + 1 };
      const fetchFn = mode === 'BS' ? getBsMonth : getAdMonth;
      fetchFn(prev.y, prev.m).catch(() => {});
      fetchFn(next.y, next.m).catch(() => {});
    }, 700);
    return () => clearTimeout(timer);
  }, [viewYear, viewMonth, mode]);

  // Handle Android Back Button. Scoped to focus: tab screens stay mounted when
  // unfocused, so a plain useEffect would swallow back presses on other tabs.
  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        if (selectedDay) {
          setSelectedDay(null);
          return true; // Prevent default behavior (exit)
        }
        return false; // Let default behavior happen
      };

      const backHandler = BackHandler.addEventListener(
        'hardwareBackPress',
        backAction,
      );

      return () => backHandler.remove();
    }, [selectedDay]),
  );

  const handlePrevMonth = () => {
    if (viewMonth === 1) {
      setViewMonth(12);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 12) {
      setViewMonth(1);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
  };

  // Swipe Gesture
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-50, 50]) // Only activate on horizontal movement
    .onEnd((e) => {
      if (e.translationX < -50) {
        // Swipe Left -> Next Month
        runOnJS(handleNextMonth)();
      } else if (e.translationX > 50) {
        // Swipe Right -> Prev Month
        runOnJS(handlePrevMonth)();
      }
    });

  const handleToday = async () => {
    const nowISO = getTodayISO();
    setSelectedDateISO(nowISO);

    // Also update the selectedDay object immediately
    const res = await convertAdToBs(nowISO);
    if (res.bs) {
      setSelectedDay(res.bs);
      if (mode === 'BS') {
        setViewYear(res.bs.bsYear);
        setViewMonth(res.bs.bsMonth);
      }
    }

    if (mode !== 'BS') {
      const d = new Date(nowISO);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth() + 1);
    }
  };

  const title = mode === 'BS'
    ? `${getBsMonthName(viewMonth)} ${viewYear}`
    : `${new Date(viewYear, viewMonth - 1).toLocaleString('default', { month: 'long' })} ${viewYear}`;

  // Stable identity so the memoized DayCells don't all re-render per selection.
  const handleSelectDay = useCallback((day: BsDay) => {
    setSelectedDateISO(day.adDateISO);
    setSelectedDay(day);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <View style={styles.brandRow}>
            <View style={[styles.brandTick, { backgroundColor: colors.accent }]} />
            <NothingText variant="caption" color={colors.accent}>Calendar</NothingText>
          </View>
          <NothingText variant="h1" style={styles.title}>{title}</NothingText>
        </View>
        <View style={styles.controls}>
          <Pressable
            onPress={() => setThemeMode(activeTheme === 'dark' ? 'light' : 'dark')}
            style={[styles.modeToggle, { borderColor: colors.border, backgroundColor: colors.card, marginRight: 8 }]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={activeTheme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
          >
            <Ionicons
              name={activeTheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
              size={22}
              color={colors.text}
            />
          </Pressable>
          <Pressable
            onPress={() => setMode(mode === 'BS' ? 'AD' : 'BS')}
            style={[styles.modeToggle, { borderColor: colors.border, backgroundColor: colors.card }]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={mode === 'BS' ? 'Switch to English calendar' : 'Switch to Nepali calendar'}
          >
            <NothingText variant="dot" style={{ fontSize: 15 }} color={colors.accent}>{mode}</NothingText>
          </Pressable>
        </View>
      </View>

      <View style={styles.navRow}>
        <Pressable
          onPress={handlePrevMonth}
          style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
        >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Pressable
          onPress={handleNextMonth}
          style={[styles.iconBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Next month"
        >
            <Ionicons name="chevron-forward" size={22} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <NothingButton title="TODAY" onPress={handleToday} variant="primary" />
      </View>

      <GestureDetector gesture={swipeGesture}>
        {/* Extra bottom padding while a day is selected so the last event rows
            can scroll clear of the 90px sheet peek that overlays the bottom. */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={{ paddingBottom: selectedDay ? 130 : 24 }}
        >
            <Animated.View
            key={`${viewYear}-${viewMonth}-${mode}`}
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(300)}
            layout={LinearTransition}
            >
            <MonthGrid
                year={viewYear}
                month={viewMonth}
                mode={mode}
                onSelectDay={handleSelectDay}
            />
            </Animated.View>

            {selectedDay && (
            <Animated.View
                entering={FadeIn.duration(400).delay(100)}
                style={styles.eventList}
            >
                <NothingText variant="h2" style={{ marginTop: 16, marginBottom: 4 }}>
                {mode === 'BS'
                    ? `${getBsMonthName(selectedDay.bsMonth)} ${selectedDay.bsDay}, ${selectedDay.bsYear}`
                    : new Date(selectedDay.adDateISO).toDateString()}
                </NothingText>

                {/* Tithi / Panchanga */}
                {selectedDay.tithiRom && (
                <NothingText variant="caption" style={{ marginBottom: 12 }} color={colors.marigold}>
                    {selectedDay.tithiRom}
                </NothingText>
                )}

                {/* Combined Events List */}
                {(() => {
                const apiEvents = selectedDay.events || [];
                const customEvents = events.filter(e => areDatesEqual(e.adDateISO, selectedDay.adDateISO));
                const hasAnyEvents = apiEvents.length > 0 || customEvents.length > 0;

                if (!hasAnyEvents) {
                    return <NothingText style={{ color: colors.textSecondary, marginTop: 8 }}>No events</NothingText>;
                }

                return (
                    <View style={{ marginTop: 8, gap: 8 }}>
                    {apiEvents.map((evt, i) => (
                        <View key={`api-${i}`} style={[styles.eventItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.eventDot, { backgroundColor: colors.accent }]} />
                        <NothingText style={{ flex: 1, fontSize: 14.5 }}>{evt}</NothingText>
                        </View>
                    ))}
                    {customEvents.map((evt) => (
                        <View key={`custom-${evt.id}`} style={[styles.eventItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                        <View style={[styles.eventDot, { backgroundColor: colors.teal }]} />
                        <View style={{ flex: 1 }}>
                            <NothingText style={{ fontWeight: '500', fontSize: 14.5 }}>{evt.title}</NothingText>
                            {evt.description && <NothingText variant="caption" style={{ marginTop: 2, textTransform: 'none', letterSpacing: 0 }}>{evt.description}</NothingText>}
                        </View>
                        </View>
                    ))}
                    </View>
                );
                })()}
            </Animated.View>
            )}
        </ScrollView>
      </GestureDetector>

      <Pressable
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => setIsAddEventVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Add event"
      >
        <Ionicons name="add" size={30} color={colors.onAccent} />
      </Pressable>

      <AddEventModal
        visible={isAddEventVisible}
        onClose={() => setIsAddEventVisible(false)}
      />

      <DayDetailSheet day={selectedDay} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: HundredTheme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  title: {
    fontSize: 32,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeToggle: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: HundredTheme.radius.md,
  },
  navRow: {
    flexDirection: 'row',
    paddingHorizontal: HundredTheme.spacing.md,
    marginBottom: HundredTheme.spacing.md,
    gap: 8,
    alignItems: 'center',
  },
  iconBtn: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: HundredTheme.radius.round,
  },
  content: {
    flex: 1,
    paddingHorizontal: HundredTheme.spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
  eventList: {
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: HundredTheme.radius.md,
    borderWidth: 1,
    gap: 10,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
});
