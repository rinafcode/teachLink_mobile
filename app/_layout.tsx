import { Stack } from "expo-router";
import React from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import "../global.css"; // NativeWind CSS
import { AnalyticsProvider } from "../src/components/mobile/AnalyticsProvider";
import { OfflineIndicatorProvider } from "../src/components/mobile/OfflineIndicatorProvider";

export default function RootLayout() {
  return (
    <AnalyticsProvider>
      <OfflineIndicatorProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="course-viewer"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="profile/[userId]"
              options={{ headerShown: false }}
            />
            <Stack.Screen name="search" options={{ headerShown: false }} />
            <Stack.Screen name="settings" options={{ headerShown: false }} />
            <Stack.Screen name="quiz" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: "modal" }} />
          </Stack>
        </GestureHandlerRootView>
      </OfflineIndicatorProvider>
    </AnalyticsProvider>
  );
}
