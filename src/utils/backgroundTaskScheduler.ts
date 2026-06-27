import { logger } from './logger';

const BACKGROUND_TASK_TIMEOUT_MS = 25_000;

interface TimeoutResult {
  timedOut: true;
}

function timeoutPromise(ms: number): Promise<TimeoutResult> {
  return new Promise(resolve => setTimeout(() => resolve({ timedOut: true }), ms));
}

export class BackgroundTaskScheduler {
  private taskQueue: Array<{ fn: () => Promise<void>; name: string }> = [];
  private isProcessing = false;

  public runAfterUI(task: () => void): void {
    setTimeout(task, 0);
  }

  public enqueueLowPriorityTask(task: () => Promise<void>, name = 'unknown'): void {
    this.taskQueue.push({ fn: task, name });
    void this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.taskQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const item = this.taskQueue.shift();

    try {
      if (item) {
        await this.runWithTimeout(item.fn, item.name);
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

  public async runWithTimeout(
    taskFn: () => Promise<void>,
    taskName: string,
    timeoutMs = BACKGROUND_TASK_TIMEOUT_MS
  ): Promise<{ timedOut: boolean; taskDurationMs: number }> {
    const startedAt = Date.now();
    const result = await Promise.race([
      taskFn().then(() => ({ timedOut: false } as TimeoutResult | { timedOut: false })),
      timeoutPromise(timeoutMs),
    ]);

    const taskDurationMs = Date.now() - startedAt;

    if ((result as TimeoutResult).timedOut) {
      logger.warn(`Background task timed out`, { taskName, taskDurationMs, timeoutMs });
      return { timedOut: true, taskDurationMs };
    }

    return { timedOut: false, taskDurationMs };
  }
}

export const backgroundScheduler = new BackgroundTaskScheduler();
export const _backgroundScheduler = backgroundScheduler;
