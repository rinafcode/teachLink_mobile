import { NavigationContainer } from "@react-navigation/native";
import {
  createNativeStackNavigator,
  NativeStackScreenProps,
} from "@react-navigation/native-stack";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import CourseViewerScreen from "../screens/CourseViewerScreen";
import HomeScreen from "../screens/HomeScreen";
import ProfileScreen from "../screens/ProfileScreen";
import QuizScreen from "../screens/QuizScreen";
import SearchScreen from "../screens/SearchScreen";
import SettingsScreen from "../screens/SettingsScreen";
import { AuthGuard } from "./AuthGuard";
import { RootStackParamList } from "./types";

// ── Stack navigator typed against RootStackParamList ────────────────────────
/**
 * `Stack` is fully typed via the generic parameter — no `any` required.
 * TypeScript will enforce that every `Stack.Screen name` is a valid key of
 * `RootStackParamList` and that the corresponding `component` prop receives the
 * correct route and navigation props.
 */
const Stack = createNativeStackNavigator<RootStackParamList>();

// Auth-guarded profile screen - receives navigation props from React Navigation
function ProtectedProfileScreen(
  props: NativeStackScreenProps<RootStackParamList, "Profile">,
) {
  return (
    <AuthGuard>
      <ProfileScreen route={props.route} navigation={props.navigation} />
    </AuthGuard>
  );
}

// Auth-guarded settings screen
function ProtectedSettingsScreen(
  props: NativeStackScreenProps<RootStackParamList, "Settings">,
) {
  return (
    <AuthGuard>
      <SettingsScreen />
    </AuthGuard>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <SafeAreaView style={{ flex: 1 }}>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: "TeachLink" }}
          />
          <Stack.Screen
            name="Search"
            component={SearchScreen}
            options={{ title: "Search" }}
          />
          <Stack.Screen name="Profile" component={ProtectedProfileScreen} />
          <Stack.Screen name="Settings" component={ProtectedSettingsScreen} />
          <Stack.Screen
            name="CourseViewer"
            component={CourseViewerScreen}
            options={{ title: "Course", headerShown: false }}
          />
          <Stack.Screen
            name="Quiz"
            component={QuizScreen}
            options={{ title: "Quiz", headerShown: false }}
          />
        </Stack.Navigator>
      </SafeAreaView>
    </NavigationContainer>
  );
}
