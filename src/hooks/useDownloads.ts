import { useCallback, useEffect, useState } from 'react';
import downloadManager, { DownloadTask } from '../services/downloadManager';

/**
 * Hook for components to interact with the Download Manager
 */
export function useDownloads() {
  const [tasks, setTasks] = useState<DownloadTask[]>([]);
  const [totalSize, setTotalSize] = useState(0);

  useEffect(() => {
    const unsubscribe = downloadManager.subscribe((updatedTasks) => {
      setTasks(updatedTasks);
      const size = updatedTasks.reduce((acc, t) => acc + t.downloadedSize, 0);
      setTotalSize(size);
    });
    return unsubscribe;
  }, []);

  const startDownload = useCallback((id: string, title: string, url: string, size?: number) => {
    return downloadManager.addToQueue(id, title, url, size);
  }, []);

  const removeDownload = useCallback((id: string) => {
    return downloadManager.removeDownload(id);
  }, []);

  const clearAll = useCallback(() => {
    return downloadManager.clearAll();
  }, []);

  return {
    tasks,
    totalSize,
    activeTasks: tasks.filter(t => t.status === 'downloading' || t.status === 'queued'),
    completedTasks: tasks.filter(t => t.status === 'completed'),
    startDownload,
    removeDownload,
    clearAll,
  };
}