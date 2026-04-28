import { Trash2 } from 'lucide-react-native';
import React from 'react';
import { FlatList, TouchableOpacity, View } from 'react-native';
import { useDownloads } from '../../hooks/useDownloads';
import { useDynamicFontSize } from '../../hooks/useDynamicFontSize';
import { AppText } from '../common/AppText';

export function DownloadQueue() {
  const { tasks, removeDownload } = useDownloads();
  const { scale } = useDynamicFontSize();

  const renderItem = ({ item }: { item: any }) => (
    <View className="flex-row items-center px-4 py-3 border-b border-gray-100 dark:border-gray-800">
      <View className="flex-1">
        <AppText className="font-medium text-gray-900 dark:text-white" numberOfLines={1}>
          {item.title}
        </AppText>
        <View className="flex-row items-center mt-1">
          <AppText className="text-xs text-gray-500 capitalize">{item.status}</AppText>
          {item.status === 'downloading' && (
            <AppText className="text-xs text-indigo-600 ml-2">
              • {Math.round(item.progress * 100)}%
            </AppText>
          )}
        </View>
        
        {item.status === 'downloading' && (
          <View className="h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
            <View 
              className="h-full bg-indigo-500" 
              style={{ width: `${item.progress * 100}%` }}
            />
          </View>
        )}
      </View>

      <View className="flex-row ml-4">
        <TouchableOpacity 
          onPress={() => removeDownload(item.id)}
          className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full"
        >
          <Trash2 size={scale(18)} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (tasks.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <AppText className="text-gray-500 text-center">No active or completed downloads.</AppText>
      </View>
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ paddingVertical: 8 }}
      ListHeaderComponent={() => (
        <AppText className="px-4 py-2 font-bold text-gray-400 text-xs uppercase tracking-wider">Queue & History</AppText>
      )}
    />
  );
}