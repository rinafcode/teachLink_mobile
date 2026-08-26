// Fix for #959: Defer cache-status listener notifications to prevent re-entrant store updates

type Listener = (status: string) => void;

export class CacheStore {
  private listeners: Set<Listener> = new Set();
  private notifying = false;
  private pendingNotifications: string[] = [];

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * FIX: Notifications are deferred with setTimeout so they never fire
   * synchronously inside a revalidation cycle, preventing re-entrant updates.
   */
  private notify(status: string): void {
    if (this.notifying) {
      // Queue instead of calling synchronously during an active notification pass
      this.pendingNotifications.push(status);
      return;
    }

    this.notifying = true;
    try {
      this.listeners.forEach((listener) => listener(status));
    } finally {
      this.notifying = false;
    }

    // Drain any notifications that were queued during the pass above
    while (this.pendingNotifications.length > 0) {
      const next = this.pendingNotifications.shift()!;
      this.notify(next);
    }
  }

  revalidate(key: string): void {
    // ... revalidation logic ...
    // Notify after revalidation completes, deferred to next tick
    setTimeout(() => this.notify(`revalidated:${key}`), 0);
  }
}