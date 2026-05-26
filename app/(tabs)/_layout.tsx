import { Tabs } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { SvgIcon } from '@/components/svg-icon';
import { Colors } from '@/constants/theme';
import { useAppState } from '@/src/state/appState';

export default function TabLayout() {
  // Use the app's resolved theme (which honours the in-app dark toggle), not the
  // raw system scheme, so the tab bar matches the rest of the app.
  const { colors, activeTheme } = useAppState();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[activeTheme].tint,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        sceneStyle: { backgroundColor: colors.background },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      
      <Tabs.Screen
        name="converter"
        options={{
          title: 'Tools',
          tabBarIcon: ({ color }) => <SvgIcon name="stat" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Calendar',
          tabBarIcon: ({ color }) => <SvgIcon name="calendar-add" size={28} color={color} />,
        }}
      />
      <Tabs.Screen
        name="events"
        options={{
          title: 'Events',
          tabBarIcon: ({ color }) => <SvgIcon name="chat-duotone" size={28} color={color} />,
        }}
      />
    </Tabs>
  );
}
