import AsyncStorage from '@react-native-async-storage/async-storage';

import { FilterValues } from '../components/mobile/FilterSheet';
import { SearchResultItem } from '../components/mobile/SearchResultCard';
import { Course } from '../types/course';
import { appLogger } from '../utils/logger';
import { buildTrie, Trie } from '../utils/trie';

const INDEX_STORAGE_KEY = '@teachlink_search_index';
// Bump this when the index schema changes to force a rebuild on existing installs.
const INDEX_VERSION = '1';
const MAX_INDEXED_COURSES = 1000;
const MAX_DESC_TOKENS = 60;

const FIELD_WEIGHTS = {
  title: 3.0,
  category: 2.0,
  instructor: 1.5,
  description: 1.0,
} as const;

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those',
  'it', 'its', 'you', 'your', 'we', 'our', 'they', 'their', 'he', 'she',
  'as', 'if', 'not', 'no', 'so', 'up', 'out', 'about', 'more', 'also',
]);

interface IndexEntry {
  docId: string;
  score: number;
}

interface PersistedSearchIndex {
  version: string;
  indexedAt: number;
  courseIds: string[];
  // token → scored doc entries, sorted descending by score
  entries: Record<string, IndexEntry[]>;
  // minimal course data needed to render a result card
  docs: Record<string, SearchResultItem>;
  // words/phrases fed into the autocomplete Trie
  suggestions: string[];
}

// ─── Tokenization ─────────────────────────────────────────────────────────────

function tokenize(text: string, maxTokens?: number): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !STOP_WORDS.has(t));
  return maxTokens !== undefined ? tokens.slice(0, maxTokens) : tokens;
}

// ─── Index construction ───────────────────────────────────────────────────────

function addEntry(
  entries: Record<string, IndexEntry[]>,
  token: string,
  docId: string,
  score: number,
): void {
  const list = (entries[token] ??= []);
  const existing = list.find(e => e.docId === docId);
  if (existing) {
    existing.score += score;
  } else {
    list.push({ docId, score });
  }
}

function courseToDoc(course: Course): SearchResultItem {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    category: course.category,
    level: course.level,
    duration: course.totalDuration,
    thumbnail: course.thumbnail,
  };
}

function buildIndex(courses: Course[]): PersistedSearchIndex {
  const entries: Record<string, IndexEntry[]> = {};
  const docs: Record<string, SearchResultItem> = {};
  const suggestionSet = new Set<string>();
  const courseIds: string[] = [];

  for (const course of courses.slice(0, MAX_INDEXED_COURSES)) {
    courseIds.push(course.id);
    docs[course.id] = courseToDoc(course);

    // Suggestions: full title and category phrases as well as individual words.
    suggestionSet.add(course.title);
    suggestionSet.add(course.category);
    for (const t of tokenize(course.title)) suggestionSet.add(t);

    // Title
    const titleTokens = tokenize(course.title);
    for (const token of titleTokens) {
      const tf = titleTokens.filter(t => t === token).length / titleTokens.length;
      addEntry(entries, token, course.id, FIELD_WEIGHTS.title * tf);
    }

    // Category
    for (const token of tokenize(course.category)) {
      addEntry(entries, token, course.id, FIELD_WEIGHTS.category);
    }

    // Instructor name
    for (const token of tokenize(course.instructor.name)) {
      addEntry(entries, token, course.id, FIELD_WEIGHTS.instructor);
    }

    // Description (length-capped)
    const descTokens = tokenize(course.description, MAX_DESC_TOKENS);
    for (const token of descTokens) {
      const tf = descTokens.filter(t => t === token).length / descTokens.length;
      addEntry(entries, token, course.id, FIELD_WEIGHTS.description * tf);
    }
  }

  // Pre-sort each posting list by score descending so top hits come first.
  for (const list of Object.values(entries)) {
    list.sort((a, b) => b.score - a.score);
  }

  return {
    version: INDEX_VERSION,
    indexedAt: Date.now(),
    courseIds,
    entries,
    docs,
    suggestions: Array.from(suggestionSet),
  };
}

// ─── Service ──────────────────────────────────────────────────────────────────

class SearchIndexService {
  private index: PersistedSearchIndex | null = null;
  // Trie over the index vocabulary (token strings) for fast prefix lookup.
  private tokenTrie: Trie | null = null;
  private _isReady = false;
  private initPromise: Promise<void> | null = null;

  get ready(): boolean {
    return this._isReady;
  }

  get indexedCount(): number {
    return this.index?.courseIds.length ?? 0;
  }

  getSuggestions(): string[] {
    return this.index?.suggestions ?? [];
  }

  /**
   * Load the persisted index (if any) from AsyncStorage.
   * Idempotent — subsequent calls return the same promise.
   */
  initialize(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      const persisted = await this._load();
      if (persisted) {
        this._mount(persisted);
      }
    } catch (e) {
      appLogger.errorSync('[SearchIndex] load error', e as Error);
    }
  }

  /**
   * (Re)build the index from a fresh list of courses and persist it.
   */
  async buildFromCourses(courses: Course[]): Promise<void> {
    const start = Date.now();
    const idx = buildIndex(courses);
    this._mount(idx);
    appLogger.infoSync(
      `[SearchIndex] built ${idx.courseIds.length} docs in ${Date.now() - start}ms`,
    );
    await this._persist(idx);
  }

  /**
   * Search the in-memory index and return ranked results in <100 ms.
   *
   * Algorithm:
   *  1. Tokenise the query.
   *  2. For each query token, use the vocabulary Trie to collect all
   *     index tokens that *start with* it (prefix match) or equal it (exact).
   *  3. Accumulate per-doc scores (exact hits score full weight; prefix hits
   *     score 70 %).
   *  4. Keep only docs that satisfied every query token (AND semantics).
   *  5. Apply category / level filters, sort by score, return top results.
   */
  search(query: string, filters: FilterValues = {}, maxResults = 50): SearchResultItem[] {
    if (!this.index || !this.tokenTrie) return [];

    const tokens = tokenize(query);
    if (tokens.length === 0) return [];

    const scoreMap = new Map<string, number>();
    // Track which query tokens each doc has matched (for AND gate).
    const matchedTokens = new Map<string, Set<string>>();

    for (const qToken of tokens) {
      // O(k + n) prefix lookup via vocabulary Trie.
      const vocabMatches = this.tokenTrie.autocomplete(qToken, 30);

      for (const vocabToken of vocabMatches) {
        const isExact = vocabToken === qToken;
        const multiplier = isExact ? 1.0 : 0.7;
        const posting = this.index.entries[vocabToken];
        if (!posting) continue;

        for (const entry of posting) {
          scoreMap.set(entry.docId, (scoreMap.get(entry.docId) ?? 0) + entry.score * multiplier);
          if (!matchedTokens.has(entry.docId)) {
            matchedTokens.set(entry.docId, new Set());
          }
          matchedTokens.get(entry.docId)!.add(qToken);
        }
      }
    }

    const results: { item: SearchResultItem; score: number }[] = [];

    for (const [docId, matched] of matchedTokens) {
      // AND gate — every query token must be satisfied.
      if (!tokens.every(t => matched.has(t))) continue;

      const item = this.index.docs[docId];
      if (!item) continue;

      // Apply sidebar filters.
      if (filters.category && item.category !== filters.category) continue;
      if (filters.level && item.level !== filters.level) continue;

      results.push({ item, score: scoreMap.get(docId) ?? 0 });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults).map(r => r.item);
  }

  /** Drop the in-memory index and remove the persisted copy. */
  async invalidate(): Promise<void> {
    this.index = null;
    this.tokenTrie = null;
    this._isReady = false;
    this.initPromise = null;
    await AsyncStorage.removeItem(INDEX_STORAGE_KEY).catch(() => undefined);
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private _mount(idx: PersistedSearchIndex): void {
    this.index = idx;
    this.tokenTrie = buildTrie(Object.keys(idx.entries));
    this._isReady = true;
  }

  private async _load(): Promise<PersistedSearchIndex | null> {
    const raw = await AsyncStorage.getItem(INDEX_STORAGE_KEY);
    if (!raw) return null;
    const parsed: PersistedSearchIndex = JSON.parse(raw);
    if (parsed.version !== INDEX_VERSION) return null;
    return parsed;
  }

  private async _persist(idx: PersistedSearchIndex): Promise<void> {
    try {
      await AsyncStorage.setItem(INDEX_STORAGE_KEY, JSON.stringify(idx));
    } catch (e) {
      appLogger.errorSync('[SearchIndex] persist error', e as Error);
    }
  }
}

export const searchIndexService = new SearchIndexService();
