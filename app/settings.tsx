import React from 'react';
import { View, Text, Switch } from 'react-native';
import { useAppStore } from '../src/store';

export default function SettingsScreen() {
    const { theme, setTheme } = useAppStore();
    const isDark = theme === 'dark';

    return (
        <View className="flex-1 bg-white dark:bg-gray-900 p-4">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Settings
            </Text>

            <View className="flex-row items-center justify-between mb-4">
                <Text className="text-gray-900 dark:text-white text-lg">
                    Dark Mode
                </Text>
                <Switch
                    value={isDark}
                    onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
                />
            </View>
        </View>
    );
}
