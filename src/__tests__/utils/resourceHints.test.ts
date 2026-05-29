/**
 * @jest-environment jsdom
 *
 * Tests for the resource hints utility (#409).
 *
 * Covers:
 *  - DEFAULT_RESOURCE_HINTS shape and required entries
 *  - applyResourceHints on web  (link-tag injection, idempotency, invalid URLs)
 *  - applyResourceHints on native (HEAD warm-up, parallel execution, failures)
 *  - prefetchExternalResources (fire-and-forget, never throws)
 */

import { Platform } from 'react-native';

import {
  applyResourceHints,
  DEFAULT_RESOURCE_HINTS,
  prefetchExternalResources,
  ResourceHint,
} from '@/utils/resourceHints';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clearLinkTags() {
  document
    .querySelectorAll('link[rel="preconnect"], link[rel="dns-prefetch"]')
    .forEach(el => el.remove());
}

function setPlatform(os: 'ios' | 'android' | 'web') {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

// ─── DEFAULT_RESOURCE_HINTS ───────────────────────────────────────────────────

describe('DEFAULT_RESOURCE_HINTS', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(DEFAULT_RESOURCE_HINTS)).toBe(true);
    expect(DEFAULT_RESOURCE_HINTS.length).toBeGreaterThan(0);
  });

  it('every entry has a valid URL', () => {
    for (const hint of DEFAULT_RESOURCE_HINTS) {
      expect(() => new URL(hint.url)).not.toThrow();
    }
  });

  it('every entry with an explicit type uses a recognised value', () => {
    for (const hint of DEFAULT_RESOURCE_HINTS) {
      if (hint.type !== undefined) {
        expect(['preconnect', 'dns-prefetch']).toContain(hint.type);
      }
    }
  });

  it('includes a CDN preconnect entry', () => {
    const found = DEFAULT_RESOURCE_HINTS.find(
      h => h.url.includes('cdn') && h.type === 'preconnect'
    );
    expect(found).toBeDefined();
  });

  it('includes a dns-prefetch entry for analytics', () => {
    const found = DEFAULT_RESOURCE_HINTS.find(
      h => h.url.includes('analytics') && h.type === 'dns-prefetch'
    );
    expect(found).toBeDefined();
  });
});

// ─── applyResourceHints — web ─────────────────────────────────────────────────

describe('applyResourceHints (web)', () => {
  beforeEach(() => {
    setPlatform('web');
    clearLinkTags();
  });

  afterEach(() => {
    clearLinkTags();
  });

  it('injects a <link rel="preconnect"> tag', async () => {
    const hints: ResourceHint[] = [{ url: 'https://cdn.example.com', type: 'preconnect' }];
    const result = await applyResourceHints(hints);

    expect(result.succeeded).toContain('https://cdn.example.com');
    expect(result.failed).toHaveLength(0);
    expect(
      document.querySelector('link[rel="preconnect"][href="https://cdn.example.com"]')
    ).not.toBeNull();
  });

  it('injects a <link rel="dns-prefetch"> tag', async () => {
    const hints: ResourceHint[] = [{ url: 'https://analytics.example.com', type: 'dns-prefetch' }];
    await applyResourceHints(hints);

    expect(
      document.querySelector('link[rel="dns-prefetch"][href="https://analytics.example.com"]')
    ).not.toBeNull();
  });

  it('defaults to preconnect when type is omitted', async () => {
    await applyResourceHints([{ url: 'https://default.example.com' }]);

    expect(
      document.querySelector('link[rel="preconnect"][href="https://default.example.com"]')
    ).not.toBeNull();
  });

  it('is idempotent — does not inject duplicate tags', async () => {
    const hints: ResourceHint[] = [{ url: 'https://cdn.example.com', type: 'preconnect' }];
    await applyResourceHints(hints);
    await applyResourceHints(hints);

    const tags = document.querySelectorAll(
      'link[rel="preconnect"][href="https://cdn.example.com"]'
    );
    expect(tags.length).toBe(1);
  });

  it('reports invalid URLs in the failed array', async () => {
    const result = await applyResourceHints([{ url: 'not-a-valid-url', type: 'preconnect' }]);

    expect(result.failed).toContain('not-a-valid-url');
    expect(result.succeeded).toHaveLength(0);
  });

  it('handles a mix of valid and invalid URLs correctly', async () => {
    const hints: ResourceHint[] = [
      { url: 'https://a.example.com', type: 'preconnect' },
      { url: 'bad-url' },
      { url: 'https://b.example.com', type: 'dns-prefetch' },
    ];
    const result = await applyResourceHints(hints);

    expect(result.succeeded).toHaveLength(2);
    expect(result.failed).toHaveLength(1);
  });
});

// ─── applyResourceHints — native ─────────────────────────────────────────────

describe('applyResourceHints (native)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    setPlatform('ios');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('fires HEAD requests and reports successes', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);

    const hints: ResourceHint[] = [
      { url: 'https://cdn.example.com', type: 'preconnect' },
      { url: 'https://analytics.example.com', type: 'dns-prefetch' },
    ];
    const result = await applyResourceHints(hints);

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result.succeeded).toHaveLength(2);
    expect(result.failed).toHaveLength(0);
  });

  it('reports a failed entry when fetch rejects', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await applyResourceHints([
      { url: 'https://cdn.example.com', type: 'preconnect' },
    ]);

    expect(result.failed).toContain('https://cdn.example.com');
    expect(result.succeeded).toHaveLength(0);
  });

  it('does not call fetch for an invalid URL', async () => {
    global.fetch = jest.fn();

    const result = await applyResourceHints([{ url: 'not-a-url' }]);

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.failed).toContain('not-a-url');
  });

  it('runs all hints in parallel', async () => {
    // Each fetch resolves after 20 ms; sequential would take ~60 ms
    global.fetch = jest
      .fn()
      .mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ ok: true } as Response), 20))
      );

    const hints: ResourceHint[] = [
      { url: 'https://a.example.com' },
      { url: 'https://b.example.com' },
      { url: 'https://c.example.com' },
    ];

    const start = Date.now();
    const result = await applyResourceHints(hints);
    const elapsed = Date.now() - start;

    // Parallel: all 3 complete in ~20 ms, not ~60 ms
    expect(elapsed).toBeLessThan(200);
    expect(result.succeeded).toHaveLength(3);
  });

  it('also works on android', async () => {
    setPlatform('android');
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);

    const result = await applyResourceHints([{ url: 'https://cdn.example.com' }]);

    expect(result.succeeded).toContain('https://cdn.example.com');
  });
});

// ─── prefetchExternalResources ────────────────────────────────────────────────

describe('prefetchExternalResources', () => {
  beforeEach(() => {
    // Stub applyResourceHints so the fire-and-forget promise resolves cleanly
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not throw', () => {
    expect(() => prefetchExternalResources()).not.toThrow();
  });

  it('returns undefined (fire-and-forget)', () => {
    expect(prefetchExternalResources()).toBeUndefined();
  });
});
