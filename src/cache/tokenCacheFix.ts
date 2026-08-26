// Fix for #966: TokenCache.get() must await this.persist() to avoid unhandled rejections

interface CacheEntry {
  token: string;
  expiresAt: number;
}

export class TokenCache {
  private store: Map<string, CacheEntry> = new Map();

  private async persist(): Promise<void> {
    // Persist cache state to storage (async I/O)
    // Implementation writes store contents to disk/DB
    await Promise.resolve(); // placeholder for real async persist
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      // FIX: was `this.persist()` — missing await caused unhandled rejection
      await this.persist();
      return null;
    }

    return entry.token;
  }

  set(key: string, token: string, ttlMs: number): void {
    this.store.set(key, { token, expiresAt: Date.now() + ttlMs });
  }
}