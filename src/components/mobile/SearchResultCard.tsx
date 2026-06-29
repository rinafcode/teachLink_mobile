import { BookOpen, Clock } from 'lucide-react-native';
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export interface SearchResultItem {
  id: string;
  title: string;
  description?: string;
  subtitle?: string;
  meta?: string;
  duration?: number;
  category?: string;
  level?: string;
  thumbnail?: string;
}

export interface SearchResultCardProps {
  item: SearchResultItem;
  onPress: () => void;
}

export const SearchResultCard = React.memo(
  function SearchResultCard({ item, onPress }: SearchResultCardProps) {
    const metaParts = [item.category, item.level].filter(Boolean);
    const metaText = metaParts.join(' · ');
    const screenReaderDescription = [item.title, item.description || item.subtitle, metaText]
      .filter(Boolean)
      .join('. ');

    return (
      <TouchableOpacity
        className="elevation-1 mx-4 mb-2.5 flex-row items-start rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm shadow-black/5"
        onPress={onPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={screenReaderDescription}
        accessibilityHint="Opens course details"
      >
        <View className="mr-3 h-11 w-11 items-center justify-center rounded-lg bg-sky-100">
          <BookOpen size={24} color="#19c3e6" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="mb-1 text-base font-semibold text-gray-900" numberOfLines={2}>
            {item.title}
          </Text>
          {(item.description || item.subtitle) && (
            <Text className="mb-1.5 text-[13px] leading-[18px] text-gray-500" numberOfLines={2}>
              {item.description || item.subtitle}
            </Text>
          )}
          <View className="flex-row flex-wrap items-center gap-2">
            {metaText ? (
              <Text className="text-xs font-medium text-gray-500">{metaText}</Text>
            ) : null}
            {item.duration != null && item.duration > 0 && (
              <View className="flex-row items-center gap-1">
                <Clock size={12} color="#6B7280" />
                <Text className="text-xs text-gray-500">{item.duration} min</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) => {
    return (
      prev.item.id === next.item.id &&
      prev.item.title === next.item.title &&
      prev.item.description === next.item.description &&
      prev.item.subtitle === next.item.subtitle &&
      prev.item.duration === next.item.duration &&
      prev.item.category === next.item.category &&
      prev.item.level === next.item.level
    );
  }
);
