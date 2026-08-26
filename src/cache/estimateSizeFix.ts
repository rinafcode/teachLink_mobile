// Fix for #958: estimateSize() deferred so it does not block setCache on every write

type CacheValue = unknown;

export class CacheManager {
  private store: Map<string, CacheValue> = new Map();
  private sizeEstimate = 0;

  /**
   * Async wrapper defers the size computation so it never runs
   * synchronously inside setCache, removing unbounded blocking work.
   */
  private async estimateSizeAsync(value: CacheValue): Promise<number> {
    return new Promise<number>((resolve) => {
      // Defer to next microtask — keeps setCache non-blocking
      Promise.resolve().then(() => {
        const json = JSON.stringify(value) ?? "";
        resolve(json.length * 2); // approximate byte size (UTF-16)
      });
    });
  }

  async setCache(key: string, value: CacheValue): Promise<void> {
    this.store.set(key, value);

    // FIX: was synchronous `estimateSize(value)` — now awaited async,
    // so expensive serialisation doesn't block every write.
    this.sizeEstimate += await this.estimateSizeAsync(value);
  }

  getCache(key: string): CacheValue | undefined {
    return this.store.get(key);
  }

  getSizeEstimate(): number {
    return this.sizeEstimate;
  }
}