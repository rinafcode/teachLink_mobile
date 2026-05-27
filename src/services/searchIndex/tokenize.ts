export const STOPWORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'that',
  'the',
  'to',
  'was',
  'were',
  'will',
  'with',
]);

const NON_ALNUM = /[^\p{L}\p{N}]+/gu;

export function normalize(text: string): string {
  return text.toLowerCase().normalize('NFKD').replace(/\p{M}/gu, '');
}

export function tokenize(text: string): string[] {
  if (!text) return [];
  const normalized = normalize(text).replace(NON_ALNUM, ' ');
  const tokens: string[] = [];
  for (const raw of normalized.split(' ')) {
    if (raw.length < 2) continue;
    if (STOPWORDS.has(raw)) continue;
    tokens.push(raw);
  }
  return tokens;
}

export function uniqueTokens(text: string): string[] {
  return Array.from(new Set(tokenize(text)));
}
