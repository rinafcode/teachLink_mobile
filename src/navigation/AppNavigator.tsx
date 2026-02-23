import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { SafeAreaView } from 'react-native-safe-area-context';

// Import screens
import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SettingsScreen from '../screens/SettingsScreen';
import CourseViewerScreen from '../screens/CourseViewerScreen';
import QuizScreen from '../screens/QuizScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
    return (
        <NavigationContainer>
            <SafeAreaView style={{ flex: 1 }}>
                <Stack.Navigator initialRouteName="Home" screenOptions={{ headerShown: false }}>
                    <Stack.Screen
                        name="Home"
                        component={HomeScreen}
                        options={{ title: 'TeachLink' }}
                    />
                    <Stack.Screen
                        name="Search"
                        component={SearchScreen}
                        options={{ title: 'Search' }}
                    />
                    <Stack.Screen name="Profile" component={ProfileScreen} />
                    <Stack.Screen name="Settings" component={SettingsScreen} />
                    <Stack.Screen
                        name="CourseViewer"
                        component={CourseViewerScreen}
                        options={{ title: 'Course', headerShown: false }}
                    />
                    <Stack.Screen
                        name="Quiz"
                        component={QuizScreen}
                        options={{ title: 'Quiz', headerShown: false }}
                    />
                </Stack.Navigator>
            </SafeAreaView>
        </NavigationContainer>
    );
}