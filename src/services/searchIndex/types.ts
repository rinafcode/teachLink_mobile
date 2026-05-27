/**
 * Document accepted by the search index. Adapters (e.g. courseAdapter)
 * convert domain types into this shape.
 */
export interface IndexableDoc {
  id: string;
  type: 'course' | 'user';
  fields: {
    title: string;
    body?: string;
    category?: string;
    level?: string;
    extra?: string;
  };
  payload?: Record<string, unknown>;
}

export interface SearchHit {
  id: string;
  type: 'course' | 'user';
  score: number;
  doc: IndexableDoc;
}

export interface SearchOptions {
  limit?: number;
  filters?: { category?: string; level?: string; type?: 'course' | 'user' };
}

export interface IndexSnapshot {
  version: number;
  hash: string;
  builtAt: number;
  docs: IndexableDoc[];
  postings?: Record<string, string[]>;
}

export const FIELD_WEIGHTS = {
  title: 5,
  category: 3,
  level: 2,
  body: 1,
  extra: 1,
} as const;

export const INDEX_VERSION = 1;
