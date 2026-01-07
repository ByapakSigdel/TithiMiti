import { DayDetailSheet } from '@/src/components/calendar/DayDetailSheet';
import { MonthGrid } from '@/src/components/calendar/MonthGrid';
import { AddEventModal } from '@/src/components/events/AddEventModal';
import { convertAdToBs } from '@/src/domain/calendar/converter';
import { getBsMonthName } from '@/src/domain/calendar/labels';
import { BsDay } from '@/src/domain/calendar/types';
import { initNotifications } from '@/src/services/notifications';
import { updateDateWidget } from '@/src/services/widget/widgetService';
import { useAppState } from '@/src/state/appState';
import { NothingButton } from '@/src/ui/core/NothingButton';
import { NothingText } from '@/src/ui/core/NothingText';
import { NothingTheme } from '@/src/ui/theme/nothing';
import { areDatesEqual, getTodayISO } from '@/src/utils/dateUtils';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, FadeOut, LinearTransition, runOnJS, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function CalendarScreen() {
  const router = useRouter();
  const { mode, setMode, selectedDateISO, setSelectedDateISO, events, themeMode, setThemeMode, activeTheme, colors } = useAppState();
  
  // Local state for the *viewed* month (distinct from selected date)
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [isAddEventVisible, setIsAddEventVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<BsDay | null>(null);
  
  // Control for the bottom sheet
  const sheetTranslateY = useSharedValue(0);
  const dayDetailSheetRef = useRef<any>(null);

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
    
    // Update date widget with today's BS date
    const updateTodayWidget = async () => {
      const todayISO = getTodayISO();
      const result = await convertAdToBs(todayISO);
      if (result.bs) {
        const bsDate = `${result.bs.bsYear}/${result.bs.bsMonth}/${result.bs.bsDay}`;
        await updateDateWidget(bsDate);
      }
    };
    updateTodayWidget();
  }, []);

  // Handle Android Back Button
  useEffect(() => {
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
  }, [selectedDay]);

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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <View>
          <NothingText variant="caption" style={{ letterSpacing: 2, marginBottom: 4 }}>CALENDAR</NothingText>
          <NothingText variant="h1" style={{ fontSize: 32 }}>{title.toUpperCase()}</NothingText>
        </View>
        <View style={styles.controls}>
          <Pressable 
            onPress={() => setThemeMode(activeTheme === 'dark' ? 'light' : 'dark')} 
            style={[styles.modeToggle, { borderColor: colors.border, marginRight: 8 }]}
            hitSlop={10}
          >
            <Ionicons 
              name={activeTheme === 'dark' ? 'sunny-outline' : 'moon-outline'} 
              size={24} 
              color={colors.text} 
            />
          </Pressable>
          <Pressable 
            onPress={() => setMode(mode === 'BS' ? 'AD' : 'BS')} 
            style={[styles.modeToggle, { borderColor: colors.border }]}
            hitSlop={10}
          >
            <NothingText variant="dot" style={{ fontSize: 24 }}>{mode}</NothingText>
          </Pressable>
        </View>
      </View>

      <View style={styles.navRow}>
        <Pressable onPress={handlePrevMonth} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Pressable onPress={handleNextMonth} style={styles.iconBtn} hitSlop={10}>
            <Ionicons name="chevron-forward" size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }} />
        <NothingButton title="TODAY" onPress={handleToday} variant="secondary" />
      </View>

      <GestureDetector gesture={swipeGesture}>
        <ScrollView style={styles.content}>
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
                onSelectDay={(day) => {
                setSelectedDateISO(day.adDateISO);
                setSelectedDay(day);
                }} 
            />
            </Animated.View>

            {selectedDay && (
            <Animated.View 
                entering={FadeIn.duration(400).delay(100)}
                style={styles.eventList}
            >
                <NothingText variant="h2" style={{ marginTop: 16, marginBottom: 8 }}>
                {mode === 'BS' 
                    ? `${getBsMonthName(selectedDay.bsMonth)} ${selectedDay.bsDay}, ${selectedDay.bsYear}`
                    : new Date(selectedDay.adDateISO).toDateString()}
                </NothingText>

                {/* Tithi / Panchanga */}
                {selectedDay.tithiRom && (
                <NothingText style={{ color: colors.textSecondary, marginBottom: 12, fontStyle: 'italic' }}>
                    {selectedDay.tithiRom}
                </NothingText>
                )}
                
                {/* Combined Events List */}
                {(() => {
                const apiEvents = selectedDay.events || [];
                const customEvents = events.filter(e => areDatesEqual(e.adDateISO, selectedDay.adDateISO));
                const hasAnyEvents = apiEvents.length > 0 || customEvents.length > 0;

                if (!hasAnyEvents) {
                    return <NothingText style={{ color: colors.textSecondary }}>No events</NothingText>;
                }

                return (
                    <>
                    {apiEvents.map((evt, i) => (
                        <View key={`api-${i}`} style={styles.eventItem}>
                        <View style={styles.eventDot} />
                        <NothingText>{evt}</NothingText>
                        </View>
                    ))}
                    {customEvents.map((evt) => (
                        <View key={`custom-${evt.id}`} style={styles.eventItem}>
                        <View style={[styles.eventDot, { backgroundColor: colors.text }]} />
                        <View>
                            <NothingText style={{ fontWeight: '500' }}>{evt.title}</NothingText>
                            {evt.description && <NothingText variant="caption">{evt.description}</NothingText>}
                        </View>
                        </View>
                    ))}
                    </>
                );
                })()}
            </Animated.View>
            )}
        </ScrollView>
      </GestureDetector>

      <Pressable style={styles.fab} onPress={() => setIsAddEventVisible(true)}>
        <NothingText style={{ fontSize: 32, color: NothingTheme.colors.white, lineHeight: 32 }}>+</NothingText>
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
    backgroundColor: NothingTheme.colors.white,
  },
  header: {
    padding: NothingTheme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modeToggle: {
    padding: 8,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: NothingTheme.colors.black,
  },
  navRow: {
    flexDirection: 'row',
    paddingHorizontal: NothingTheme.spacing.md,
    marginBottom: NothingTheme.spacing.md,
    gap: 8,
  },
  navBtn: {
    width: 40,
    height: 40,
    paddingHorizontal: 0,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
    borderRadius: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: NothingTheme.spacing.sm,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: NothingTheme.colors.red,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  eventList: {
    paddingVertical: 16,
  },
  eventItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: NothingTheme.colors.red,
    marginRight: 8,
  },
});
