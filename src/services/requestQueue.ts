type RequestTask = {
  id: string;
  execute: () => Promise<void>;
  priority: number;
};

class RequestQueue {
  private queue: RequestTask[] = [];
  private isProcessing = false;
  private maxConcurrent: number;

  constructor(maxConcurrent = 3) {
    this.maxConcurrent = maxConcurrent;
  }

  enqueue(task: RequestTask): void {
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);
    this.process();
  }

  startMonitoring(_client: unknown): void {
    if (this.isProcessing) return;
    this.process();
  }

  private async process(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const batch = this.queue.splice(0, this.maxConcurrent);
    await Promise.allSettled(batch.map(task => task.execute()));

    this.isProcessing = false;
    if (this.queue.length > 0) {
      this.process();
    }
  }

  getPendingCount(): number {
    return this.queue.length;
  }
}

export const requestQueue = new RequestQueue();
