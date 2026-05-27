export { SearchIndex, searchIndex } from './SearchIndex';
export { courseToIndexable } from './courseAdapter';
export { loadSnapshot, saveSnapshot, clearSnapshot, SNAPSHOT_KEY } from './persistence';
export { tokenize, normalize, uniqueTokens, STOPWORDS } from './tokenize';
export type { IndexableDoc, SearchHit, SearchOptions, IndexSnapshot } from './types';
