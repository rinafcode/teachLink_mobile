import { Tabs } from 'expo-router';
import React from 'react';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/store';

const TabLayout = () => {
  const theme = useTheme();

  return (
    <ErrorBoundary boundaryName="TabsLayout">
      <Tabs
        // Keep all tab screens mounted so state and scroll positions survive tab switches
        detachInactiveScreens={false}
        screenOptions={{
          tabBarActiveTintColor: Colors[theme].tint,
          headerShown: false,
          tabBarButton: HapticTab,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ color }) => (
              <IconSymbol size={28} name="magnifyingglass" color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <IconSymbol size={28} name="person.fill" color={color} />,
          }}
        />
      </Tabs>
    </ErrorBoundary>
  );
};

export default TabLayout;
