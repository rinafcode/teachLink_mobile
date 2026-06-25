import { InteractionManager } from 'react-native';

import { logger } from '../utils/logger';

class BackgroundTaskScheduler {
  private taskQueue: (() => Promise<void>)[] = [];
  private isProcessing = false;

  public runAfterUI(task: () => void) {
    InteractionManager.runAfterInteractions(() => {
      task();
    });
  }

  public enqueueLowPriorityTask(task: () => Promise<void>) {
    this.taskQueue.push(task);
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.taskQueue.length === 0) return;
    this.isProcessing = true;
    
    const task = this.taskQueue.shift();
    if (task) {
      try {
        await task();
      } catch (error) {
        logger.error('Background Task Failed', { error });
      }
    }

    this.isProcessing = false;
    InteractionManager.runAfterInteractions(() => this.processQueue());
  }
}

export const backgroundScheduler = new BackgroundTaskScheduler();
