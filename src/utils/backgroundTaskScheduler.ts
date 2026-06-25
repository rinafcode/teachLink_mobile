export class BackgroundTaskScheduler {
  private taskQueue: (() => Promise<void>)[] = [];
  private isProcessing = false;

  public runAfterUI(task: () => void): void {
    setTimeout(task, 0);
  }

  public enqueueLowPriorityTask(task: () => Promise<void>): void {
    this.taskQueue.push(task);
    void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const task = this.taskQueue.shift();

    try {
      if (task) {
        await task();
      }
    } catch {
      // ignore background task failures in the test/runtime shim
    } finally {
      this.isProcessing = false;
      if (this.taskQueue.length > 0) {
        void this.processQueue();
      }
    }
  }
}

export const backgroundScheduler = new BackgroundTaskScheduler();
export const _backgroundScheduler = backgroundScheduler;
