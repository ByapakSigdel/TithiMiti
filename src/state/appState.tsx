import { CalendarMode, EventItem, LanguageMode } from '@/src/domain/calendar/types';
import { getAllEvents } from '@/src/services/events/eventsStore';
import { HundredColors as NothingColors, ThemeColors } from '@/src/ui/theme/hundred';
import { getTodayISO } from '@/src/utils/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_MODE_KEY = 'app-theme-mode';
const CALENDAR_MODE_KEY = 'app-calendar-mode';

type AppState = {
  mode: CalendarMode;
  setMode: (m: CalendarMode) => void;
  lang: LanguageMode;
  setLang: (l: LanguageMode) => void;
  selectedDateISO: string; // Anchor ISO (AD)
  setSelectedDateISO: (iso: string) => void;
  events: EventItem[];
  refreshEvents: () => Promise<void>;
  themeMode: ThemeMode;
  setThemeMode: (t: ThemeMode) => void;
  activeTheme: 'light' | 'dark'; // The actual resolved theme
  colors: ThemeColors;
};

const StateCtx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<CalendarMode>('BS');
  const [lang, setLang] = useState<LanguageMode>('np-rom');
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  // Local-time today: toISOString() is UTC and would anchor on yesterday
  // between 00:00 and 05:45 in Nepal (UTC+5:45).
  const [selectedDateISO, setSelectedDateISO] = useState<string>(getTodayISO());
  const [events, setEvents] = useState<EventItem[]>([]);

  // Hydrate persisted preferences once at startup
  useEffect(() => {
    (async () => {
      try {
        const [savedTheme, savedMode] = await Promise.all([
          AsyncStorage.getItem(THEME_MODE_KEY),
          AsyncStorage.getItem(CALENDAR_MODE_KEY),
        ]);
        if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
          setThemeModeState(savedTheme);
        }
        if (savedMode === 'BS' || savedMode === 'AD') {
          setModeState(savedMode);
        }
      } catch {
        // best-effort — fall back to defaults
      }
    })();
  }, []);

  const setThemeMode = (t: ThemeMode) => {
    setThemeModeState(t);
    AsyncStorage.setItem(THEME_MODE_KEY, t).catch(() => {});
  };

  const setMode = (m: CalendarMode) => {
    setModeState(m);
    AsyncStorage.setItem(CALENDAR_MODE_KEY, m).catch(() => {});
  };

  // Calculate active theme (resolved from themeMode and system preference)
  const activeTheme: 'light' | 'dark' = useMemo(() => {
    return themeMode === 'system' ? (systemScheme || 'light') : themeMode;
  }, [themeMode, systemScheme]);

  const colors = useMemo(() => {
    return activeTheme === 'dark' ? NothingColors.dark : NothingColors.light;
  }, [activeTheme]);

  const refreshEvents = async () => {
    const all = await getAllEvents();
    setEvents(all);
  };

  useEffect(() => {
    refreshEvents();
  }, []);

  const value = useMemo(
    () => ({
      mode, setMode,
      lang, setLang,
      selectedDateISO, setSelectedDateISO,
      events, refreshEvents,
      themeMode, setThemeMode,
      activeTheme,
      colors
    }),
     
    [mode, lang, selectedDateISO, events, themeMode, activeTheme, colors],
  );
  return <StateCtx.Provider value={value}>{children}</StateCtx.Provider>;
}

export function useAppState() {
  const ctx = useContext(StateCtx);
  if (!ctx) throw new Error('AppStateProvider missing');
  return ctx;
}
