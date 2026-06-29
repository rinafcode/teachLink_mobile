import { Tabs } from 'expo-router';
import React from 'react';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useTheme } from '@/store';

const HomeTabIcon = ({ color }: { color: string }) => (
  <IconSymbol size={28} name="house.fill" color={color} />
);

const SearchTabIcon = ({ color }: { color: string }) => (
  <IconSymbol size={28} name="magnifyingglass" color={color} />
);

const ProfileTabIcon = ({ color }: { color: string }) => (
  <IconSymbol size={28} name="person.fill" color={color} />
);

const DashboardTabIcon = ({ color }: { color: string }) => (
  <IconSymbol size={28} name="chart.bar.fill" color={color} />
);

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
            tabBarIcon: HomeTabIcon,
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: SearchTabIcon,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ProfileTabIcon,
          }}
        />
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: DashboardTabIcon,
          }}
        />
      </Tabs>
    </ErrorBoundary>
  );
};

export default TabLayout;
