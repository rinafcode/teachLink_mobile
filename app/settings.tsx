import { useAppStore } from '@/src/store';
import React from 'react';
import { Switch, View } from 'react-native';
import { AppText } from '@/src/components/common/AppText';

export default function SettingsScreen() {
    const { theme, setTheme } = useAppStore();
    const isDark = theme === 'dark';

    return (
        <View className="flex-1 bg-white dark:bg-gray-900 p-4">
            <AppText 
                style={{ fontSize: 24 }}
                className="font-bold text-gray-900 dark:text-white mb-6"
            >
                Settings
            </AppText>

            <View className="flex-row items-center justify-between mb-4">
                <AppText 
                    style={{ fontSize: 18 }}
                    className="text-gray-900 dark:text-white"
                >
                    Dark Mode
                </AppText>
                <Switch
                    value={isDark}
                    onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
                />
            </View>
        </View>
    );
}
