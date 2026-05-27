import { SearchIndex } from '../../../services/searchIndex/SearchIndex';
import { IndexableDoc } from '../../../services/searchIndex/types';

function doc(
  id: string,
  title: string,
  body = '',
  category = '',
  level: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
): IndexableDoc {
  return { id, type: 'course', fields: { title, body, category, level } };
}

describe('SearchIndex', () => {
  let index: SearchIndex;

  beforeEach(() => {
    index = new SearchIndex();
  });

  describe('build / size / clear', () => {
    it('reports size after build', () => {
      index.build([doc('1', 'A'), doc('2', 'B')]);
      expect(index.size()).toBe(2);
      expect(index.isReady()).toBe(true);
    });

    it('clear empties the index', () => {
      index.build([doc('1', 'A')]);
      index.clear();
      expect(index.size()).toBe(0);
      expect(index.isReady()).toBe(false);
    });
  });

  describe('search', () => {
    beforeEach(() => {
      index.build([
        doc('1', 'React Native Fundamentals', 'Learn mobile development', 'Mobile Development'),
        doc('2', 'Advanced JavaScript', 'Closures and prototypes', 'Web Development', 'advanced'),
        doc('3', 'Mobile UI Design', 'Design beautiful interfaces', 'Design'),
        doc('4', 'React Hooks Deep Dive', 'useState useEffect useMemo', 'Web Development'),
        doc('5', 'Native Modules in Expo', 'Bridging native code', 'Mobile Development'),
      ]);
    });

    it('returns empty when no token matches', () => {
      expect(index.search('nonsensequery')).toEqual([]);
    });

    it('finds title matches', () => {
      const hits = index.search('react');
      const ids = hits.map(h => h.id);
      expect(ids).toEqual(expect.arrayContaining(['1', '4']));
    });

    it('intersects multi-token queries (AND)', () => {
      const hits = index.search('react native');
      expect(hits.map(h => h.id)).toEqual(['1']);
    });

    it('matches across body and category', () => {
      const hits = index.search('design');
      expect(hits.map(h => h.id)).toEqual(expect.arrayContaining(['3']));
    });

    it('supports prefix match on the trailing token', () => {
      const hits = index.search('rea');
      const ids = hits.map(h => h.id);
      expect(ids).toEqual(expect.arrayContaining(['1', '4']));
    });

    it('ranks title hits above body-only hits', () => {
      const fresh = new SearchIndex();
      fresh.build([
        doc('a', 'Body Only', 'this lesson covers expo deeply', 'Web Development'),
        doc('b', 'Expo Deep Dive', 'introductory material', 'Mobile Development'),
      ]);
      const hits = fresh.search('expo');
      expect(hits[0].id).toBe('b');
    });

    it('applies category filters', () => {
      const hits = index.search('mobile', { filters: { category: 'Mobile Development' } });
      expect(hits.every(h => h.doc.fields.category === 'Mobile Development')).toBe(true);
    });

    it('applies level filters', () => {
      const hits = index.search('javascript', { filters: { level: 'advanced' } });
      expect(hits.map(h => h.id)).toEqual(['2']);
    });

    it('respects the limit option', () => {
      const hits = index.search('react', { limit: 1 });
      expect(hits).toHaveLength(1);
    });

    it('returns filtered docs when query is empty', () => {
      const hits = index.search('', { filters: { category: 'Design' }, limit: 10 });
      expect(hits.map(h => h.id)).toEqual(['3']);
    });
  });

  describe('update / remove', () => {
    it('update inserts a new doc', () => {
      index.build([doc('1', 'A')]);
      index.update(doc('2', 'Beta'));
      expect(index.size()).toBe(2);
      expect(index.search('beta').map(h => h.id)).toEqual(['2']);
    });

    it('update replaces an existing doc', () => {
      index.build([doc('1', 'Old Title')]);
      index.update(doc('1', 'New Title'));
      expect(index.search('old')).toEqual([]);
      expect(index.search('new').map(h => h.id)).toEqual(['1']);
    });

    it('remove drops a doc and its postings', () => {
      index.build([doc('1', 'Alpha'), doc('2', 'Beta')]);
      index.remove('1');
      expect(index.size()).toBe(1);
      expect(index.search('alpha')).toEqual([]);
    });
  });

  describe('serialize / hydrate', () => {
    it('round-trips through a snapshot', () => {
      index.build([doc('1', 'Alpha'), doc('2', 'Beta')]);
      const snap = index.serialize();
      const fresh = new SearchIndex();
      fresh.hydrate(snap);
      expect(fresh.size()).toBe(2);
      expect(fresh.search('alpha').map(h => h.id)).toEqual(['1']);
    });

    it('rejects snapshots with mismatched version', () => {
      index.build([doc('1', 'Alpha')]);
      const snap = index.serialize();
      const fresh = new SearchIndex();
      fresh.hydrate({ ...snap, version: 999 });
      expect(fresh.size()).toBe(0);
    });
  });

  describe('performance', () => {
    it('searches 500 docs in under 100ms', () => {
      const docs: IndexableDoc[] = [];
      const categories = ['Mobile Development', 'Web Development', 'Design', 'Data'];
      const wordPool = [
        'react',
        'native',
        'expo',
        'javascript',
        'typescript',
        'design',
        'mobile',
        'web',
        'animation',
        'navigation',
        'hooks',
        'modules',
        'performance',
        'testing',
        'analytics',
        'data',
        'rendering',
      ];
      for (let i = 0; i < 500; i++) {
        const w1 = wordPool[i % wordPool.length];
        const w2 = wordPool[(i * 3) % wordPool.length];
        const w3 = wordPool[(i * 7) % wordPool.length];
        docs.push({
          id: `c${i}`,
          type: 'course',
          fields: {
            title: `${w1} ${w2} course ${i}`,
            body: `An in-depth look at ${w1} and ${w3}, covering practical examples.`,
            category: categories[i % categories.length],
            level: 'beginner',
          },
        });
      }
      index.build(docs);

      const start = Date.now();
      for (let i = 0; i < 10; i++) {
        index.search('react native', { limit: 25 });
      }
      const elapsed = Date.now() - start;
      const perCall = elapsed / 10;
      expect(perCall).toBeLessThan(100);
    });
  });
});
