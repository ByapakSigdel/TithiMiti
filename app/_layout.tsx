import {
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

import { initializeAllWidgets } from '@/src/services/widget/widgetService';
import { AppStateProvider, useAppState } from '@/src/state/appState';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

// Navigation chrome, themed from the app's resolved theme (honours the in-app
// dark toggle) so headers, the status bar, and screen backgrounds all match
// the Hundred Studios palette.
function ThemedNavigation() {
  const { activeTheme, colors, hydrated } = useAppState();
  const isDark = activeTheme === 'dark';

  // Fonts are ready (the parent gates on them); also wait for the persisted
  // theme/calendar mode before lifting the splash, or a dark-theme AD-mode
  // user watches the app flash light/BS and then snap over every launch.
  useEffect(() => {
    if (hydrated) {
      SplashScreen.hideAsync();
      return;
    }
    // Safety valve: never let a wedged storage read hold the splash hostage.
    const timer = setTimeout(() => SplashScreen.hideAsync(), 2000);
    return () => clearTimeout(timer);
  }, [hydrated]);

  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.card,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };
  return (
    <ThemeProvider value={navTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // Load fonts including icon fonts
  const [fontsLoaded, fontError] = useFonts({
    // Display serif: Fraunces, used for headlines and large numerals.
    Fraunces_600SemiBold,
    Fraunces_700Bold,
    // UI sans: Inter, used across all body/label text via NothingText.
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    // Preload @expo/vector-icons fonts that are used in the app
    'Ionicons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
  });

  // Seed all widgets at app startup (best-effort; runs regardless of starting
  // tab). Deferred a few seconds so its network calls (BS month, gold prices,
  // horoscope art) don't compete with the first calendar paint.
  useEffect(() => {
    const timer = setTimeout(() => {
      initializeAllWidgets();
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppStateProvider>
        <ThemedNavigation />
      </AppStateProvider>
    </GestureHandlerRootView>
  );
}
