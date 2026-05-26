import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
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
// dark toggle) so headers, the status bar, and screen backgrounds all match.
function ThemedNavigation() {
  const { activeTheme } = useAppState();
  const isDark = activeTheme === 'dark';
  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Add Event' }} />
        <Stack.Screen name="converter" options={{ title: 'Converter' }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  // Load fonts including icon fonts
  const [fontsLoaded, fontError] = useFonts({
    // App typeface: Inter (clean modern sans), used across all text via NothingText.
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    // Preload @expo/vector-icons fonts that are used in the app
    'Ionicons': require('@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      // Hide the splash screen after fonts are loaded
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Seed all widgets at app startup (best-effort; runs regardless of starting tab)
  useEffect(() => {
    initializeAllWidgets();
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
