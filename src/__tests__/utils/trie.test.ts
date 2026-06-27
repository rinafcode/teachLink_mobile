/**
 * Tests for the Trie data structure (#410).
 *
 * Covers:
 *  - Basic insert / search / startsWith
 *  - Case-insensitive lookup
 *  - autocomplete with prefix and limit
 *  - insertMany / clear
 *  - Performance: 10 000+ items in <10 ms
 *  - Edge cases: empty strings, duplicates, single-char prefixes
 */

import { buildTrie, Trie } from '@/utils/trie';

describe('Trie', () => {
  // ─── insert & search ──────────────────────────────────────────────────────

  describe('insert / search', () => {
    it('finds an inserted word', () => {
      const trie = new Trie();
      trie.insert('hello');
      expect(trie.search('hello')).toBe(true);
    });

    it('returns false for a word that was not inserted', () => {
      const trie = new Trie();
      trie.insert('hello');
      expect(trie.search('world')).toBe(false);
    });

    it('is case-insensitive for search', () => {
      const trie = new Trie();
      trie.insert('React Native');
      expect(trie.search('react native')).toBe(true);
      expect(trie.search('REACT NATIVE')).toBe(true);
    });

    it('ignores empty / whitespace-only inserts', () => {
      const trie = new Trie();
      trie.insert('');
      trie.insert('   ');
      expect(trie.wordCount).toBe(0);
    });

    it('does not double-count duplicate inserts', () => {
      const trie = new Trie();
      trie.insert('expo');
      trie.insert('expo');
      expect(trie.wordCount).toBe(1);
    });

    it('tracks wordCount correctly', () => {
      const trie = new Trie();
      trie.insert('a');
      trie.insert('b');
      trie.insert('c');
      expect(trie.wordCount).toBe(3);
    });
  });

  // ─── startsWith ───────────────────────────────────────────────────────────

  describe('startsWith', () => {
    it('returns true when a word with the prefix exists', () => {
      const trie = new Trie();
      trie.insert('JavaScript');
      expect(trie.startsWith('java')).toBe(true);
      expect(trie.startsWith('Java')).toBe(true);
    });

    it('returns false when no word starts with the prefix', () => {
      const trie = new Trie();
      trie.insert('Python');
      expect(trie.startsWith('java')).toBe(false);
    });

    it('returns true for a single-character prefix', () => {
      const trie = new Trie();
      trie.insert('Expo');
      expect(trie.startsWith('e')).toBe(true);
    });
  });

  // ─── autocomplete ─────────────────────────────────────────────────────────

  describe('autocomplete', () => {
    const words = [
      'React Native',
      'React',
      'React Router',
      'Redux',
      'Relay',
      'JavaScript',
      'TypeScript',
    ];

    it('returns words matching the prefix', () => {
      const trie = buildTrie(words);
      const results = trie.autocomplete('re');
      expect(results).toContain('React Native');
      expect(results).toContain('React');
      expect(results).toContain('React Router');
      expect(results).toContain('Redux');
      expect(results).toContain('Relay');
    });

    it('respects the limit parameter', () => {
      const trie = buildTrie(words);
      const results = trie.autocomplete('re', 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('returns an empty array when no word matches the prefix', () => {
      const trie = buildTrie(words);
      expect(trie.autocomplete('xyz')).toEqual([]);
    });

    it('returns up to `limit` words when prefix is empty', () => {
      const trie = buildTrie(words);
      const results = trie.autocomplete('', 4);
      expect(results.length).toBeLessThanOrEqual(4);
    });

    it('preserves original casing in results', () => {
      const trie = new Trie();
      trie.insert('React Native');
      const results = trie.autocomplete('react');
      expect(results).toContain('React Native');
    });

    it('is case-insensitive for the prefix', () => {
      const trie = buildTrie(words);
      const lower = trie.autocomplete('react');
      const upper = trie.autocomplete('REACT');
      expect(lower).toEqual(upper);
    });

    it('returns exact match when prefix equals the full word', () => {
      const trie = buildTrie(words);
      const results = trie.autocomplete('JavaScript');
      expect(results).toContain('JavaScript');
    });
  });

  // ─── insertMany ───────────────────────────────────────────────────────────

  describe('insertMany', () => {
    it('inserts all words', () => {
      const trie = new Trie();
      trie.insertMany(['alpha', 'beta', 'gamma']);
      expect(trie.search('alpha')).toBe(true);
      expect(trie.search('beta')).toBe(true);
      expect(trie.search('gamma')).toBe(true);
      expect(trie.wordCount).toBe(3);
    });

    it('handles an empty array without error', () => {
      const trie = new Trie();
      expect(() => trie.insertMany([])).not.toThrow();
      expect(trie.wordCount).toBe(0);
    });
  });

  // ─── clear ────────────────────────────────────────────────────────────────

  describe('clear', () => {
    it('removes all words', () => {
      const trie = buildTrie(['hello', 'world']);
      trie.clear();
      expect(trie.wordCount).toBe(0);
      expect(trie.search('hello')).toBe(false);
      expect(trie.autocomplete('h')).toEqual([]);
    });

    it('allows re-insertion after clear', () => {
      const trie = buildTrie(['hello']);
      trie.clear();
      trie.insert('world');
      expect(trie.search('world')).toBe(true);
      expect(trie.wordCount).toBe(1);
    });
  });

  // ─── buildTrie factory ────────────────────────────────────────────────────

  describe('buildTrie', () => {
    it('creates a populated trie from an array', () => {
      const trie = buildTrie(['Expo', 'Expo Go', 'Expo Router']);
      expect(trie.wordCount).toBe(3);
      expect(trie.autocomplete('expo').length).toBe(3);
    });
  });

  // ─── Performance ──────────────────────────────────────────────────────────

  describe('performance', () => {
    it('builds a trie with 10 000 items and autocompletes in <10 ms', () => {
      const words = Array.from({ length: 10_000 }, (_, i) => `course-keyword-${i}`);

      const trie = buildTrie(words);

      expect(trie.wordCount).toBe(10_000);

      const queryStart = performance.now();
      const results = trie.autocomplete('course-keyword-9', 10);
      const queryEnd = performance.now();

      expect(results.length).toBeGreaterThan(0);
      // Autocomplete must complete in under 10 ms (acceptance criterion)
      expect(queryEnd - queryStart).toBeLessThan(10);
    });

    it('handles 10 000 unique prefixes without error', () => {
      const words = Array.from({ length: 10_000 }, (_, i) => `word${i}`);
      const trie = buildTrie(words);
      expect(() => trie.autocomplete('word', 50)).not.toThrow();
    });
  });
});
