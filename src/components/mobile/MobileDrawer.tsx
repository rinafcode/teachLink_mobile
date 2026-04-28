import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { DrawerContentComponentProps, DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { useSafeArea } from '../../hooks';
import { Settings, LogOut, Sun, Moon } from 'lucide-react-native';

/**
 * Props for the MobileDrawer component
 */
export const MobileDrawer = (props: DrawerContentComponentProps) => {
    const { top, bottom } = useSafeArea();
    const [isDark, setIsDark] = React.useState(false);

    return (
        <View 
            style={{ flex: 1, backgroundColor: '#fff' }}
            accessibilityRole="menu"
            importantForAccessibility="yes"
        >
            <View 
                className="p-4 border-b border-gray-100 bg-gray-50 pt-12" 
                style={{ paddingTop: top + 16 }}
                accessibilityRole="header"
            >
                <View className="flex-row items-center gap-3 mb-2">
                    <View 
                        className="w-12 h-12 rounded-full bg-indigo-100 items-center justify-center"
                        accessibilityRole="image"
                        accessibilityLabel="User initials: JD"
                    >
                        <Text className="text-indigo-600 font-bold text-xl">JD</Text>
                    </View>
                    <View>
                        <Text className="text-lg font-bold text-gray-900">John Doe</Text>
                        <Text className="text-sm text-gray-500">@johndoe</Text>
                    </View>
                </View>
            </View>

            <DrawerContentScrollView {...props} contentContainerStyle={{ paddingTop: 0 }}>
                <DrawerItemList {...props} />

                <View className="mt-4 px-4 border-t border-gray-100 pt-4">
                    <TouchableOpacity 
                        className="flex-row items-center gap-3 py-3" 
                        onPress={() => { }}
                        accessibilityRole="menuitem"
                        accessibilityLabel="Settings"
                    >
                        <Settings size={20} color="#4B5563" />
                        <Text className="text-gray-700 font-medium">Settings</Text>
                    </TouchableOpacity>
                </View>
            </DrawerContentScrollView>

            <View 
                className="p-4 border-t border-gray-200 bg-gray-50" 
                style={{ paddingBottom: bottom + 16 }}
                accessibilityLabel="Drawer footer"
            >
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-sm text-gray-500">Dark Mode</Text>
                    <TouchableOpacity 
                        onPress={() => setIsDark(!isDark)}
                        accessibilityRole="switch"
                        accessibilityLabel={`Dark mode ${isDark ? 'enabled' : 'disabled'}`}
                        accessibilityHint="Double tap to toggle dark mode"
                    >
                        {isDark ? <Moon size={20} color="#4F46E5" /> : <Sun size={20} color="#6B7280" />}
                    </TouchableOpacity>
                </View>
                <TouchableOpacity 
                    className="flex-row items-center gap-3 py-2"
                    accessibilityRole="menuitem"
                    accessibilityLabel="Log Out"
                >
                    <LogOut size={20} color="#EF4444" />
                    <Text className="text-red-500 font-medium">Log Out</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};
