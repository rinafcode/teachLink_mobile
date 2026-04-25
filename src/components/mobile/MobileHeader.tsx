import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Bell, Menu } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { usePendingRequests } from '../../hooks/usePendingRequests';
import { useSafeArea } from '../../hooks/useSafeArea';

/**
 * Props for the MobileHeader component
 */
interface MobileHeaderProps {
    /** Title to display in the header */
    title: string;
    /** Whether to show the back button */
    showBack?: boolean;
    /** Optional custom right action component */
    rightAction?: React.ReactNode;
}

export const MobileHeader = ({ title, showBack = false, rightAction }: MobileHeaderProps) => {
    const { top } = useSafeArea();
    const navigation = useNavigation<DrawerNavigationProp<any>>();
    const pendingCount = usePendingRequests();

    return (
        <View
            className="bg-white border-b border-gray-200 flex-row items-center justify-between px-4 pb-3"
            style={{ paddingTop: top }}
            accessibilityRole="header"
        >
            <View className="flex-row items-center gap-3">
                {showBack ? (
                    <TouchableOpacity 
                        onPress={() => navigation.goBack()} 
                        className="p-2"
                        accessibilityRole="button"
                        accessibilityLabel="Go back"
                    >
                        <ArrowLeft color="#1F2937" size={24} />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity 
                        onPress={() => navigation.openDrawer()} 
                        className="p-2"
                        accessibilityRole="button"
                        accessibilityLabel="Open navigation drawer"
                    >
                        <Menu color="#1F2937" size={24} />
                    </TouchableOpacity>
                )}
                <Text className="text-lg font-bold text-gray-900">{title}</Text>
            </View>

            <View className="flex-row items-center">
                {rightAction || (
                    <View className="relative">
                        <TouchableOpacity 
                            className="p-2"
                            accessibilityRole="button"
                            accessibilityLabel="View notifications"
                        >
                            <Bell color="#4B5563" size={20} />
                        </TouchableOpacity>
                        {pendingCount > 0 && (
                            <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center">
                                <Text className="text-white text-xs font-bold">
                                    {pendingCount > 99 ? '99+' : pendingCount}
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </View>
    );
};
