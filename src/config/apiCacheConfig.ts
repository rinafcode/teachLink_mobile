/**
 * Defines which cache keys to invalidate after a successful mutation.
 * Keys are matched against the request URL using the provided RegExp patterns.
 */
export const MUTATION_INVALIDATION_MAP: Array<{
  urlPattern: RegExp;
  methods: string[];
  invalidatePatterns: RegExp[];
}> = [
  {
    urlPattern: /\/api\/courses\/[^/]+$/,
    methods: ['PUT', 'PATCH', 'DELETE'],
    invalidatePatterns: [/\/api\/courses/],
  },
  {
    urlPattern: /\/api\/courses$/,
    methods: ['POST'],
    invalidatePatterns: [/\/api\/courses/],
  },
  {
    urlPattern: /\/api\/users\/[^/]+$/,
    methods: ['PUT', 'PATCH', 'DELETE'],
    invalidatePatterns: [/\/api\/users/],
  },
  {
    urlPattern: /\/api\/users$/,
    methods: ['POST'],
    invalidatePatterns: [/\/api\/users/],
  },
  {
    urlPattern: /\/api\/lessons\/[^/]+$/,
    methods: ['PUT', 'PATCH', 'DELETE'],
    invalidatePatterns: [/\/api\/lessons/],
  },
  {
    urlPattern: /\/api\/lessons$/,
    methods: ['POST'],
    invalidatePatterns: [/\/api\/lessons/],
  },
];
