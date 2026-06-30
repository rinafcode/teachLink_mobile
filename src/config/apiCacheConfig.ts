/**
 * Per-endpoint stale-while-revalidate TTL configuration (Issue #597).
 *
 * A single global TTL meant volatile data (balance, subscription status, active
 * quiz sessions) shared the same freshness window as static catalog data, so a
 * user could see a stale "Free" subscription status for minutes after upgrading.
 *
 * `ttl` is the freshness window (ms); `staleTtl` is the stale-while-revalidate
 * window (ms) after which the entry is evicted entirely. For critical endpoints
 * `staleTtl === ttl` so nothing older than `ttl` is ever served.
 */
export interface EndpointTtl {
  /** Time (ms) before the entry is considered stale. */
  ttl: number;
  /** Time (ms) before the entry is evicted (stale-while-revalidate window). */
  staleTtl: number;
}

const SECONDS = 1_000;
const MINUTES = 60 * SECONDS;

/** Global fallback used when an endpoint is not listed in {@link ENDPOINT_TTL_MAP}. */
export const DEFAULT_ENDPOINT_TTL: EndpointTtl = {
  ttl: 60 * SECONDS,
  staleTtl: 5 * MINUTES,
};

/** Critical, fast-changing endpoints: 30 s, with no stale window. */
const CRITICAL_TTL: EndpointTtl = { ttl: 30 * SECONDS, staleTtl: 30 * SECONDS };

/** Static, slow-changing endpoints: 5 min fresh, 10 min stale window. */
const STATIC_TTL: EndpointTtl = { ttl: 5 * MINUTES, staleTtl: 10 * MINUTES };

/**
 * Maps a normalized endpoint path (prefix) to its TTL configuration.
 * The most specific (longest) matching key wins; see {@link resolveEndpointTtl}.
 */
export const ENDPOINT_TTL_MAP: Record<string, EndpointTtl> = {
  '/auth/me': CRITICAL_TTL,
  '/subscriptions': CRITICAL_TTL,
  '/payments': CRITICAL_TTL,
  '/courses': STATIC_TTL,
  '/categories': STATIC_TTL,
};

/**
 * Normalize a request URL or cache key to a leading-slash path:
 * strips an `api:` cache-key prefix, the origin, a query string, and an
 * `/api` segment, so `api:/api/subscriptions?x=1` -> `/subscriptions`.
 */
function normalizeEndpointPath(urlOrKey: string): string {
  let value = urlOrKey.replace(/^api:/, '');
  // Drop query string or cache-key param suffix.
  value = value.split('?')[0];

  let path = value;
  try {
    path = new URL(value, 'https://teachlink.local').pathname;
  } catch {
    /* value was already a bare path */
  }

  path = path.replace(/^\/api(?=\/|$)/, '');
  if (!path.startsWith('/')) {
    path = `/${path}`;
  }
  return path.replace(/\/+$/, '') || '/';
}

/**
 * Resolve the TTL configuration for a request URL (or cache key), falling back
 * to {@link DEFAULT_ENDPOINT_TTL} when the endpoint is not configured.
 *
 * Matching is by longest path prefix, so `/subscriptions/123` inherits the
 * `/subscriptions` configuration.
 */
export function resolveEndpointTtl(urlOrKey: string): EndpointTtl {
  const path = normalizeEndpointPath(urlOrKey);

  const match = Object.keys(ENDPOINT_TTL_MAP)
    .filter(key => path === key || path.startsWith(`${key}/`))
    .sort((a, b) => b.length - a.length)[0];

  return match ? ENDPOINT_TTL_MAP[match] : DEFAULT_ENDPOINT_TTL;
}

/**
 * Defines which cache keys to invalidate after a successful mutation.
 * Keys are matched against the request URL using the provided RegExp patterns.
 */
export const MUTATION_INVALIDATION_MAP: {
  urlPattern: RegExp;
  methods: string[];
  invalidatePatterns: RegExp[];
}[] = [
  {
    // A subscription change must immediately refresh subscription status and the
    // /auth/me snapshot that embeds it (Issue #597).
    urlPattern: /\/subscriptions(\/[^/]+)?$/,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
    invalidatePatterns: [/\/subscriptions/, /\/auth\/me/],
  },
  {
    // Payments can change subscription / entitlement state.
    urlPattern: /\/payments(\/[^/]+)?$/,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
    invalidatePatterns: [/\/payments/, /\/subscriptions/, /\/auth\/me/],
  },
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
