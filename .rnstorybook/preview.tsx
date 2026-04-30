import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnalyticsProvider, OfflineIndicatorProvider } from '../src/components';
import { AuthProvider } from '../src/hooks';

import type { Preview } from '@storybook/react-native';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
  decorators: [
    (Story) => (
      <SafeAreaProvider>
        <AuthProvider>
          <AnalyticsProvider>
            <OfflineIndicatorProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <Story />
              </GestureHandlerRootView>
            </OfflineIndicatorProvider>
          </AnalyticsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    ),
  ],
};

export default preview;
