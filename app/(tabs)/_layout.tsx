import { Tabs } from 'expo-router';
import React from 'react';
import { MobileTabBar } from '../../src/components/mobile/MobileTabBar';
import { MobileHeader } from '../../src/components/mobile/MobileHeader';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <MobileTabBar {...props} />}
      screenOptions={{
        headerShown: true,
        header: ({ route, options }) => (
          <MobileHeader
            title={options.title || route.name}
            showBack={false}
          />
        ),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
    </Tabs>
  );
}
