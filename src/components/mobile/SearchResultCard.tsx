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

export const SearchResultCard = React.memo(function SearchResultCard({
  item,
  onPress,
}: SearchResultCardProps) {
  const metaParts = [item.category, item.level].filter(Boolean);
  const metaText = metaParts.join(' · ');
  const screenReaderDescription = [item.title, item.description || item.subtitle, metaText]
    .filter(Boolean)
    .join('. ');

  return (
    <TouchableOpacity
      className="flex-row items-start bg-white rounded-xl p-3.5 mx-4 mb-2.5 border border-gray-200 shadow-sm shadow-black/5 elevation-1"
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={screenReaderDescription}
      accessibilityHint="Opens course details"
    >
      <View className="w-11 h-11 rounded-lg bg-sky-100 items-center justify-center mr-3">
        <BookOpen size={24} color="#19c3e6" />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="text-base font-semibold text-gray-900 mb-1" numberOfLines={2}>
          {item.title}
        </Text>
        {(item.description || item.subtitle) && (
          <Text className="text-[13px] text-gray-500 leading-[18px] mb-1.5" numberOfLines={2}>
            {item.description || item.subtitle}
          </Text>
        )}
        <View className="flex-row items-center flex-wrap gap-2">
          {metaText ? <Text className="text-xs text-gray-500 font-medium">{metaText}</Text> : null}
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
}, (prev, next) => {
  return prev.item.id === next.item.id
    && prev.item.title === next.item.title
    && prev.item.description === next.item.description
    && prev.item.subtitle === next.item.subtitle
    && prev.item.duration === next.item.duration
    && prev.item.category === next.item.category
    && prev.item.level === next.item.level;
});

