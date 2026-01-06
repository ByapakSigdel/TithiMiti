import { CalendarMode, EventItem, LanguageMode } from '@/src/domain/calendar/types';
import { getAllEvents } from '@/src/services/events/eventsStore';
import { NothingColors, ThemeColors } from '@/src/ui/theme/nothing';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'light' | 'dark' | 'system';

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
  colors: ThemeColors;
};

const StateCtx = createContext<AppState | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<CalendarMode>('BS');
  const [lang, setLang] = useState<LanguageMode>('np-rom');
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [selectedDateISO, setSelectedDateISO] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [events, setEvents] = useState<EventItem[]>([]);

  const colors = useMemo(() => {
    const active = themeMode === 'system' ? (systemScheme || 'light') : themeMode;
    return active === 'dark' ? NothingColors.dark : NothingColors.light;
  }, [themeMode, systemScheme]);

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
      colors
    }),
    [mode, lang, selectedDateISO, events, themeMode, colors],
  );
  return <StateCtx.Provider value={value}>{children}</StateCtx.Provider>;
}

export function useAppState() {
  const ctx = useContext(StateCtx);
  if (!ctx) throw new Error('AppStateProvider missing');
  return ctx;
}
