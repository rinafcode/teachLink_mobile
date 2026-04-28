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
    <View className="flex-row items-center border-b border-gray-100 px-4 py-3 dark:border-gray-800">
      <View className="flex-1">
        <AppText className="font-medium text-gray-900 dark:text-white" numberOfLines={1}>
          {item.title}
        </AppText>
        <View className="mt-1 flex-row items-center">
          <AppText className="text-xs capitalize text-gray-500">{item.status}</AppText>
          {item.status === 'downloading' && (
            <AppText className="ml-2 text-xs text-indigo-600">
              • {Math.round(item.progress * 100)}%
            </AppText>
          )}
        </View>

        {item.status === 'downloading' && (
          <View className="mt-2 h-1 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            <View className="h-full bg-indigo-500" style={{ width: `${item.progress * 100}%` }} />
          </View>
        )}
      </View>

      <View className="ml-4 flex-row">
        <TouchableOpacity
          onPress={() => removeDownload(item.id)}
          className="rounded-full bg-gray-100 p-2 dark:bg-gray-800"
        >
          <Trash2 size={scale(18)} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (tasks.length === 0) {
    return (
      <View className="flex-1 items-center justify-center p-8">
        <AppText className="text-center text-gray-500">No active or completed downloads.</AppText>
      </View>
    );
  }

  return (
    <FlatList
      data={tasks}
      keyExtractor={item => item.id}
      renderItem={renderItem}
      contentContainerStyle={{ paddingVertical: 8 }}
      ListHeaderComponent={() => (
        <AppText className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-gray-400">
          Queue & History
        </AppText>
      )}
    />
  );
}
