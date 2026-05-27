import {
  tokenize,
  normalize,
  uniqueTokens,
  STOPWORDS,
} from '../../../services/searchIndex/tokenize';

describe('searchIndex/tokenize', () => {
  describe('normalize', () => {
    it('lowercases input', () => {
      expect(normalize('React Native')).toBe('react native');
    });

    it('strips diacritics', () => {
      expect(normalize('Café')).toBe('cafe');
      expect(normalize('Año')).toBe('ano');
    });
  });

  describe('tokenize', () => {
    it('returns an empty array for empty input', () => {
      expect(tokenize('')).toEqual([]);
    });

    it('splits on whitespace and punctuation', () => {
      expect(tokenize('React-Native: A primer.')).toEqual(['react', 'native', 'primer']);
    });

    it('drops single-character tokens', () => {
      expect(tokenize('a b cc dd')).toEqual(['cc', 'dd']);
    });

    it('drops stopwords', () => {
      const tokens = tokenize('Learn the basics of mobile development');
      expect(tokens).not.toContain('the');
      expect(tokens).not.toContain('of');
      expect(tokens).toEqual(expect.arrayContaining(['learn', 'basics', 'mobile', 'development']));
    });

    it('keeps numerics', () => {
      expect(tokenize('iOS 17 release notes')).toEqual(
        expect.arrayContaining(['ios', '17', 'release', 'notes'])
      );
    });
  });

  describe('uniqueTokens', () => {
    it('deduplicates tokens', () => {
      expect(uniqueTokens('react react native react')).toEqual(['react', 'native']);
    });
  });

  describe('STOPWORDS', () => {
    it('contains common English stopwords', () => {
      expect(STOPWORDS.has('the')).toBe(true);
      expect(STOPWORDS.has('and')).toBe(true);
      expect(STOPWORDS.has('with')).toBe(true);
    });
  });
});
