import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Bell, Menu } from 'lucide-react-native';
import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';

import { useDynamicFontSize, usePendingRequests, useSafeArea } from '../../hooks';
import { AppText } from '../common/AppText';

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
  /** Whether to use sticky positioning for scroll performance */
  sticky?: boolean;
  /** Top offset for sticky positioning (default: 0) */
  stickyTop?: number;
}

export const MobileHeader = ({ title, showBack = false, rightAction, sticky = false, stickyTop = 0 }: MobileHeaderProps) => {
  const { top } = useSafeArea();
  const navigation = useNavigation<DrawerNavigationProp<any>>();
  const pendingCount = usePendingRequests();
  const { scale } = useDynamicFontSize();

  const headerStyle = sticky 
    ? [styles.header, styles.stickyHeader, { top: stickyTop }]
    : styles.header;

  return (
    <View
      style={headerStyle}
      className="flex-row items-center justify-between border-b border-gray-200 bg-white px-4 pb-3"
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
            <ArrowLeft color="#1F2937" size={scale(24)} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => navigation.openDrawer()}
            className="p-2"
            accessibilityRole="button"
            accessibilityLabel="Open navigation drawer"
          >
            <Menu color="#1F2937" size={scale(24)} />
          </TouchableOpacity>
        )}
        <AppText style={{ fontSize: scale(18) }} className="font-bold text-gray-900">
          {title}
        </AppText>
      </View>

      <View className="flex-row items-center">
        {rightAction || (
          <View className="relative">
            <TouchableOpacity
              className="p-2"
              accessibilityRole="button"
              accessibilityLabel="View notifications"
            >
              <Bell color="#4B5563" size={scale(20)} />
            </TouchableOpacity>
            {pendingCount > 0 && (
              <View className="absolute -right-1 -top-1 h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500">
                <AppText style={{ fontSize: 12 }} className="font-bold text-white">
                  {pendingCount > 99 ? '99+' : pendingCount}
                </AppText>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: 0, // Will be set dynamically via style prop
  },
  stickyHeader: {
    position: 'sticky' as const,
    zIndex: 1000,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
});