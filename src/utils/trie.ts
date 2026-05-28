/**
 * Trie (prefix tree) for efficient prefix-based autocomplete.
 *
 * #410 — Trie-based instant autocomplete
 *
 * Complexity:
 *   insert:   O(k)  where k = word length
 *   search:   O(k)
 *   autocomplete: O(k + n) where n = number of matching results
 *
 * Designed for offline, <10ms autocomplete on 10 000+ items.
 */

interface TrieNode {
  children: Map<string, TrieNode>;
  /** Words that end at this node (stores original-cased strings). */
  words: string[];
  isEnd: boolean;
}

function createNode(): TrieNode {
  return { children: new Map(), words: [], isEnd: false };
}

export class Trie {
  private root: TrieNode = createNode();
  private size = 0;

  /** Number of words stored in the trie. */
  get wordCount(): number {
    return this.size;
  }

  /**
   * Insert a word into the trie.
   * Lookup is case-insensitive; the original casing is preserved in results.
   */
  insert(word: string): void {
    const normalized = word.trim();
    if (!normalized) return;

    let node = this.root;
    const lower = normalized.toLowerCase();

    for (const char of lower) {
      if (!node.children.has(char)) {
        node.children.set(char, createNode());
      }
      node = node.children.get(char)!;
    }

    if (!node.isEnd) {
      node.isEnd = true;
      this.size++;
    }
    // Store original word at the terminal node (avoid duplicates)
    if (!node.words.includes(normalized)) {
      node.words.push(normalized);
    }
  }

  /**
   * Insert multiple words at once.
   */
  insertMany(words: string[]): void {
    for (const word of words) {
      this.insert(word);
    }
  }

  /**
   * Returns true if the exact word exists in the trie.
   */
  search(word: string): boolean {
    const node = this._traverse(word.trim().toLowerCase());
    return node !== null && node.isEnd;
  }

  /**
   * Returns true if any word in the trie starts with the given prefix.
   */
  startsWith(prefix: string): boolean {
    return this._traverse(prefix.trim().toLowerCase()) !== null;
  }

  /**
   * Returns up to `limit` words that start with `prefix`.
   * Results are returned in insertion order.
   *
   * @param prefix - The prefix to search for (case-insensitive).
   * @param limit  - Maximum number of results (default 10).
   */
  autocomplete(prefix: string, limit = 10): string[] {
    const trimmed = prefix.trim();
    if (!trimmed) return this._collectAll(this.root, limit);

    const node = this._traverse(trimmed.toLowerCase());
    if (!node) return [];

    const results: string[] = [];
    this._collect(node, results, limit);
    return results;
  }

  /**
   * Remove all words from the trie.
   */
  clear(): void {
    this.root = createNode();
    this.size = 0;
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private _traverse(lower: string): TrieNode | null {
    let node = this.root;
    for (const char of lower) {
      const next = node.children.get(char);
      if (!next) return null;
      node = next;
    }
    return node;
  }

  private _collect(node: TrieNode, results: string[], limit: number): void {
    if (results.length >= limit) return;

    if (node.isEnd) {
      for (const w of node.words) {
        if (results.length >= limit) return;
        results.push(w);
      }
    }

    for (const child of node.children.values()) {
      if (results.length >= limit) return;
      this._collect(child, results, limit);
    }
  }

  private _collectAll(node: TrieNode, limit: number): string[] {
    const results: string[] = [];
    this._collect(node, results, limit);
    return results;
  }
}

/**
 * Build a Trie from an array of strings.
 * Convenience factory used by MobileSearch.
 */
export function buildTrie(words: string[]): Trie {
  const trie = new Trie();
  trie.insertMany(words);
  return trie;
}
