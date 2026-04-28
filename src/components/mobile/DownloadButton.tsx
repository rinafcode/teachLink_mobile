import clsx from 'clsx';
import { CheckCircle2, Clock, Download, XCircle } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { useDownloads } from '../../hooks/useDownloads';
import { useDynamicFontSize } from '../../hooks/useDynamicFontSize';
import { AppText } from '../common/AppText';

interface DownloadButtonProps {
  id: string;
  title: string;
  url: string;
  size?: number;
  className?: string;
}

export function DownloadButton({ id, title, url, size, className }: DownloadButtonProps) {
  const { tasks, startDownload, removeDownload } = useDownloads();
  const { scale } = useDynamicFontSize();

  const task = tasks.find(t => t.id === id);

  const handlePress = async () => {
    if (!task) {
      try {
        await startDownload(id, title, url, size);
      } catch (e: any) {
        // Error handled in manager/toast
      }
    } else if (task.status === 'completed') {
      removeDownload(id);
    }
  };

  const renderIcon = () => {
    if (!task) return <Download size={scale(20)} color="#4B5563" />;

    switch (task.status) {
      case 'queued':
        return <Clock size={scale(20)} color="#9CA3AF" />;
      case 'downloading':
        return <ActivityIndicator size="small" color="#6366F1" />;
      case 'completed':
        return <CheckCircle2 size={scale(20)} color="#10B981" />;
      case 'failed':
        return <XCircle size={scale(20)} color="#EF4444" />;
      default:
        return <Download size={scale(20)} color="#4B5563" />;
    }
  };

  const getLabel = () => {
    if (!task) return 'Download';
    if (task.status === 'downloading') return `${Math.round(task.progress * 100)}%`;
    if (task.status === 'queued') return 'Queued';
    if (task.status === 'completed') return 'Offline';
    return 'Retry';
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      className={clsx(
        'flex-row items-center justify-center rounded-full border px-4 py-2',
        !task && 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800',
        task?.status === 'downloading' &&
          'border-indigo-200 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-900/30',
        task?.status === 'completed' &&
          'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-900/30',
        className
      )}
    >
      <View className="mr-2">{renderIcon()}</View>
      <AppText
        style={{ fontSize: 13 }}
        className={clsx(
          'font-semibold',
          task?.status === 'downloading' ? 'text-indigo-600' : 'text-gray-700 dark:text-gray-200'
        )}
      >
        {getLabel()}
      </AppText>
    </TouchableOpacity>
  );
}
