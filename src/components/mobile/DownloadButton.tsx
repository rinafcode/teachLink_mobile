import clsx from 'clsx';
import { CheckCircle2, Clock, Download, XCircle } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { useDownloads } from '../../hooks/useDownloads';
import { useDynamicFontSize } from '../../hooks/useDynamicFontSize';
import { AppText } from '../common/AppText';
import { createMemoizedIcon } from '../ui/MemoizedIcon';

// ─── Memoized Icons (Issue #361) ───────────────────────────────────────────
// Issue #361: SVG components wrapped with React.memo to prevent re-renders on parent updates

const MemoizedDownload = createMemoizedIcon(Download, 'MemoizedDownload');
const MemoizedClock = createMemoizedIcon(Clock, 'MemoizedClock');
const MemoizedCheckCircle2 = createMemoizedIcon(CheckCircle2, 'MemoizedCheckCircle2');
const MemoizedXCircle = createMemoizedIcon(XCircle, 'MemoizedXCircle');

interface DownloadButtonProps {
  id: string;
  title: string;
  url: string;
  size?: number;
  className?: string;
}

interface IconRendererProps {
  status?: string;
  progress?: number;
  scale: number;
}

// ─── Memoized Icon Renderer ────────────────────────────────────────────────

const DownloadIconRenderer = React.memo(
  ({ status, progress, scale }: IconRendererProps) => {
    if (!status) return <MemoizedDownload size={scale * 20} color="#4B5563" />;

    switch (status) {
      case 'queued':
        return <MemoizedClock size={scale * 20} color="#9CA3AF" />;
      case 'downloading':
        return <ActivityIndicator size="small" color="#6366F1" />;
      case 'completed':
        return <MemoizedCheckCircle2 size={scale * 20} color="#10B981" />;
      case 'failed':
        return <MemoizedXCircle size={scale * 20} color="#EF4444" />;
      default:
        return <MemoizedDownload size={scale * 20} color="#4B5563" />;
    }
  },
  (prevProps, nextProps) => {
    // Re-render only if status or progress change
    return prevProps.status === nextProps.status && prevProps.progress === nextProps.progress;
  }
);

DownloadIconRenderer.displayName = 'DownloadIconRenderer';

export function DownloadButton({ id, title, url, size, className }: DownloadButtonProps) {
  const { tasks, startDownload, removeDownload } = useDownloads();
  const { scale } = useDynamicFontSize();

  const task = useMemo(() => tasks.find(t => t.id === id), [tasks, id]);

  const handlePress = useCallback(async () => {
    if (!task) {
      try {
        await startDownload(id, title, url, size);
      } catch (e: any) {
        // Error handled in manager/toast
      }
    } else if (task.status === 'completed') {
      removeDownload(id);
    }
  }, [task, id, title, url, size, startDownload, removeDownload]);

  const getLabel = () => {
    if (!task) return 'Download';
    if (task.status === 'downloading') return `${Math.round(task.progress * 100)}%`;
    if (task.status === 'queued') return 'Queued';
    if (task.status === 'completed') return 'Offline';
    return 'Retry';
  }, [task]);

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
      <View className="mr-2">
        <DownloadIconRenderer status={task?.status} progress={task?.progress} scale={scale} />
      </View>
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
