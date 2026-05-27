import { tokenize, uniqueTokens } from './tokenize';
import {
  FIELD_WEIGHTS,
  INDEX_VERSION,
  IndexSnapshot,
  IndexableDoc,
  SearchHit,
  SearchOptions,
} from './types';

const DEFAULT_LIMIT = 25;
const PREFIX_BONUS = 0.5;

function fieldText(doc: IndexableDoc): [keyof typeof FIELD_WEIGHTS, string][] {
  const f = doc.fields;
  const out: [keyof typeof FIELD_WEIGHTS, string][] = [];
  if (f.title) out.push(['title', f.title]);
  if (f.category) out.push(['category', f.category]);
  if (f.level) out.push(['level', f.level]);
  if (f.body) out.push(['body', f.body]);
  if (f.extra) out.push(['extra', f.extra]);
  return out;
}

function hashContent(docs: IndexableDoc[]): string {
  let h = 5381;
  for (const d of docs) {
    const s = `${d.id}|${d.fields.title}|${d.fields.category ?? ''}|${d.fields.level ?? ''}|${d.fields.body ?? ''}|${d.fields.extra ?? ''}`;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    }
  }
  return (h >>> 0).toString(36);
}

/**
 * In-memory inverted index for offline search.
 *
 * Postings: token → set of doc ids.
 * Token weights: token → docId → score contribution (sum of field weights).
 * Search intersects per-token posting lists (AND semantics) and ranks by summed
 * field weights with a bonus for prefix-only matches on the final query token.
 */
export class SearchIndex {
  private docs = new Map<string, IndexableDoc>();
  private postings = new Map<string, Set<string>>();
  private weights = new Map<string, Map<string, number>>();
  private contentHash = '';
  private builtAt = 0;

  build(docs: IndexableDoc[]): void {
    this.clear();
    for (const doc of docs) this.indexDoc(doc);
    this.contentHash = hashContent(Array.from(this.docs.values()));
    this.builtAt = Date.now();
  }

  update(doc: IndexableDoc): void {
    if (this.docs.has(doc.id)) this.removePostings(doc.id);
    this.indexDoc(doc);
    this.contentHash = hashContent(Array.from(this.docs.values()));
  }

  remove(id: string): void {
    if (!this.docs.has(id)) return;
    this.removePostings(id);
    this.docs.delete(id);
    this.contentHash = hashContent(Array.from(this.docs.values()));
  }

  clear(): void {
    this.docs.clear();
    this.postings.clear();
    this.weights.clear();
    this.contentHash = '';
    this.builtAt = 0;
  }

  size(): number {
    return this.docs.size;
  }

  isReady(): boolean {
    return this.docs.size > 0;
  }

  search(query: string, opts: SearchOptions = {}): SearchHit[] {
    const limit = opts.limit ?? DEFAULT_LIMIT;
    const tokens = uniqueTokens(query);
    if (tokens.length === 0) {
      return this.applyFilters(Array.from(this.docs.values()), opts)
        .slice(0, limit)
        .map(doc => ({ id: doc.id, type: doc.type, score: 0, doc }));
    }

    const candidates = this.collectCandidates(tokens);
    if (candidates.size === 0) return [];

    const scored: SearchHit[] = [];
    for (const id of candidates) {
      const doc = this.docs.get(id);
      if (!doc) continue;
      if (!this.matchesFilters(doc, opts)) continue;
      let score = 0;
      for (const t of tokens) {
        const w = this.weights.get(t)?.get(id) ?? 0;
        score += w;
        if (w === 0) {
          score += this.prefixScore(t, id);
        }
      }
      if (score > 0) scored.push({ id, type: doc.type, score, doc });
    }

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.doc.fields.title.localeCompare(b.doc.fields.title);
    });
    return scored.slice(0, limit);
  }

  serialize(): IndexSnapshot {
    return {
      version: INDEX_VERSION,
      hash: this.contentHash,
      builtAt: this.builtAt || Date.now(),
      docs: Array.from(this.docs.values()),
    };
  }

  hydrate(snapshot: IndexSnapshot): void {
    if (snapshot.version !== INDEX_VERSION) {
      this.clear();
      return;
    }
    this.build(snapshot.docs);
    this.builtAt = snapshot.builtAt;
  }

  getContentHash(): string {
    return this.contentHash;
  }

  private indexDoc(doc: IndexableDoc): void {
    this.docs.set(doc.id, doc);
    for (const [field, text] of fieldText(doc)) {
      const weight = FIELD_WEIGHTS[field];
      const seen = new Set<string>();
      for (const token of tokenize(text)) {
        let posting = this.postings.get(token);
        if (!posting) {
          posting = new Set();
          this.postings.set(token, posting);
        }
        posting.add(doc.id);

        let perToken = this.weights.get(token);
        if (!perToken) {
          perToken = new Map();
          this.weights.set(token, perToken);
        }
        const prior = perToken.get(doc.id) ?? 0;
        const bump = seen.has(token) ? Math.ceil(weight / 2) : weight;
        perToken.set(doc.id, prior + bump);
        seen.add(token);
      }
    }
  }

  private removePostings(id: string): void {
    for (const [token, set] of this.postings) {
      if (set.delete(id) && set.size === 0) this.postings.delete(token);
    }
    for (const [token, map] of this.weights) {
      if (map.delete(id) && map.size === 0) this.weights.delete(token);
    }
  }

  private collectCandidates(tokens: string[]): Set<string> {
    const lists: Set<string>[] = [];
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      const exact = this.postings.get(token);
      const isLast = i === tokens.length - 1;
      if (exact && exact.size) {
        lists.push(exact);
        continue;
      }
      if (isLast) {
        const prefixHits = this.prefixPosting(token);
        if (prefixHits.size === 0) return new Set();
        lists.push(prefixHits);
        continue;
      }
      return new Set();
    }
    lists.sort((a, b) => a.size - b.size);
    const [first, ...rest] = lists;
    const result = new Set<string>();
    for (const id of first) {
      if (rest.every(s => s.has(id))) result.add(id);
    }
    return result;
  }

  private prefixPosting(prefix: string): Set<string> {
    const out = new Set<string>();
    for (const [token, set] of this.postings) {
      if (token.startsWith(prefix)) {
        for (const id of set) out.add(id);
      }
    }
    return out;
  }

  private prefixScore(prefix: string, docId: string): number {
    let best = 0;
    for (const [token, perToken] of this.weights) {
      if (!token.startsWith(prefix)) continue;
      const w = perToken.get(docId);
      if (w && w > best) best = w;
    }
    return best > 0 ? best * PREFIX_BONUS : 0;
  }

  private matchesFilters(doc: IndexableDoc, opts: SearchOptions): boolean {
    const f = opts.filters;
    if (!f) return true;
    if (f.type && doc.type !== f.type) return false;
    if (f.category && doc.fields.category !== f.category) return false;
    if (f.level && doc.fields.level !== f.level) return false;
    return true;
  }

  private applyFilters(docs: IndexableDoc[], opts: SearchOptions): IndexableDoc[] {
    if (!opts.filters) return docs;
    return docs.filter(d => this.matchesFilters(d, opts));
  }
}

export const searchIndex = new SearchIndex();
