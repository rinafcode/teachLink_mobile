import * as Network from 'expo-network';
import { useSettingsStore } from '../store/settingsStore';
import logger from '../utils/logger';
import { offlineStorage } from './offlineStorage';

export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';

export interface DownloadTask {
  id: string; // usually courseId or lessonId
  title: string;
  url: string;
  status: DownloadStatus;
  progress: number; // 0 to 1
  totalSize?: number; // in bytes
  downloadedSize: number; // in bytes
  localUri?: string;
  error?: string;
  quality: string;
}

class DownloadManager {
  private tasks: Map<string, DownloadTask> = new Map();
  private listeners: Set<(tasks: DownloadTask[]) => void> = new Set();
  private isProcessing: boolean = false;

  constructor() {
    this.loadPersistedTasks();
  }

  private async loadPersistedTasks() {
    try {
      const saved = await offlineStorage.retrieve<DownloadTask[]>('@teachlink_download_tasks');
      if (saved) {
        saved.forEach(task => {
          // Reset stuck 'downloading' tasks to 'queued' on restart
          if (task.status === 'downloading') task.status = 'queued';
          this.tasks.set(task.id, task);
        });
        this.notify();
      }
    } catch (e) {
      logger.error('DownloadManager: Failed to load tasks', e);
    }
  }

  private async persist() {
    await offlineStorage.store('@teachlink_download_tasks', Array.from(this.tasks.values()));
  }

  public subscribe(listener: (tasks: DownloadTask[]) => void) {
    this.listeners.add(listener);
    listener(Array.from(this.tasks.values()));
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const tasksArray = Array.from(this.tasks.values());
    this.listeners.forEach(l => l(tasksArray));
    this.persist();
  }

  public async addToQueue(id: string, title: string, url: string, size?: number) {
    if (this.tasks.has(id)) return;

    const settings = useSettingsStore.getState();
    
    // Check Storage Limit
    const currentSize = await this.getTotalDownloadedSize();
    const limitStr = settings.storageLimit; // e.g., "1GB"
    const limitBytes = this.parseStorageLimit(limitStr);
    
    if (size && limitBytes !== Infinity && (currentSize + size) > limitBytes) {
      throw new Error('Storage limit exceeded. Please clear space.');
    }

    const task: DownloadTask = {
      id,
      title,
      url,
      status: 'queued',
      progress: 0,
      totalSize: size,
      downloadedSize: 0,
      quality: settings.downloadQuality,
    };

    this.tasks.set(id, task);
    this.notify();
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing) return;

    const nextTask = Array.from(this.tasks.values()).find(t => t.status === 'queued');
    if (!nextTask) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;

    // Check WiFi Constraints
    const settings = useSettingsStore.getState();
    const netState = await Network.getNetworkStateAsync();
    
    if (settings.downloadOverWifiOnly && netState.type !== Network.NetworkStateType.WIFI) {
      logger.info('DownloadManager: Postponing download, WiFi required');
      this.isProcessing = false;
      return;
    }

    await this.executeDownload(nextTask.id);
    this.isProcessing = false;
    this.processQueue();
  }

  private async executeDownload(id: string) {
    const task = this.tasks.get(id);
    if (!task) return;

    task.status = 'downloading';
    this.notify();

    try {
      // Mocking the download progress logic
      // In a real implementation, use expo-file-system createDownloadResumable
      for (let i = 0; i <= 10; i++) {
        const currentTask = this.tasks.get(id);
        if (!currentTask || currentTask.status !== 'downloading') break;

        currentTask.progress = i / 10;
        currentTask.downloadedSize = (currentTask.totalSize || 1024 * 1024 * 10) * currentTask.progress;
        this.notify();
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (this.tasks.get(id)?.status === 'downloading') {
        task.status = 'completed';
        task.localUri = `file:///mock/path/${id}.mp4`;
        logger.info(`DownloadManager: Completed ${task.title}`);
      }
    } catch (error: any) {
      task.status = 'failed';
      task.error = error.message;
      logger.error(`DownloadManager: Failed ${task.title}`, error);
    } finally {
      this.notify();
    }
  }

  public cancelDownload(id: string) {
    const task = this.tasks.get(id);
    if (task) {
      task.status = 'paused'; // Simple toggle for this mock
      this.notify();
    }
  }

  public async removeDownload(id: string) {
    // In real app: await FileSystem.deleteAsync(task.localUri)
    this.tasks.delete(id);
    this.notify();
    this.processQueue();
  }

  public async clearAll() {
    this.tasks.clear();
    this.notify();
  }

  public async getTotalDownloadedSize(): Promise<number> {
    return Array.from(this.tasks.values())
      .reduce((acc, task) => acc + task.downloadedSize, 0);
  }

  private parseStorageLimit(limit: string): number {
    if (limit === 'unlimited') return Infinity;
    const val = parseInt(limit);
    if (limit.includes('GB')) return val * 1024 * 1024 * 1024;
    return val * 1024 * 1024;
  }

  public getTask(id: string) {
    return this.tasks.get(id);
  }
}

export const downloadManager = new DownloadManager();
export default downloadManager;