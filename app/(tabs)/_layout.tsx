import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { SvgIcon } from '@/components/svg-icon';
import { useAppState } from '@/src/state/appState';

export default function TabLayout() {
  // Use the app's resolved theme (which honours the in-app dark toggle), not the
  // raw system scheme, so the tab bar matches the rest of the app.
  const { colors } = useAppState();
  // The app runs edge-to-edge, so the bar must absorb the bottom system inset
  // (gesture bar / home indicator) or icons get clipped and sit under it.
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 62 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 11,
          letterSpacing: 0.4,
        },
        sceneStyle: { backgroundColor: colors.background },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>

      <Tabs.Screen
        name="converter"
        options={{
          title: 'Tools',
          tabBarIcon: ({ color }) => <SvgIcon name="stat" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <SvgIcon name="calendar-add" size={26} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color }) => <SvgIcon name="chat-duotone" size={26} color={color} />,
        }}
      />
    </Tabs>
  );
}
