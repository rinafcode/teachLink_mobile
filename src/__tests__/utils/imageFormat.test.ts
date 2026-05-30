import { Platform } from 'react-native';

import {
  applyFormatParam,
  buildImageAcceptHeader,
  getNegotiatedImageUrl,
  isImageUrl,
  isWebPSupported,
} from '../../utils/imageFormat';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setPlatform(os: string) {
  Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('imageFormat utility (#267)', () => {
  // ─── isWebPSupported ────────────────────────────────────────────────────────

  describe('isWebPSupported', () => {
    it('returns true on android', () => {
      setPlatform('android');
      expect(isWebPSupported()).toBe(true);
    });

    it('returns true on ios', () => {
      setPlatform('ios');
      expect(isWebPSupported()).toBe(true);
    });

    it('returns true on web', () => {
      setPlatform('web');
      expect(isWebPSupported()).toBe(true);
    });
  });

  // ─── buildImageAcceptHeader ─────────────────────────────────────────────────

  describe('buildImageAcceptHeader', () => {
    it('includes image/webp when WebP is supported', () => {
      setPlatform('android');
      const header = buildImageAcceptHeader();
      expect(header).toContain('image/webp');
    });

    it('lists webp before png (higher preference)', () => {
      setPlatform('ios');
      const header = buildImageAcceptHeader();
      expect(header.indexOf('image/webp')).toBeLessThan(header.indexOf('image/png'));
    });

    it('always includes a wildcard fallback', () => {
      const header = buildImageAcceptHeader();
      expect(header).toContain('image/*');
    });
  });

  // ─── isImageUrl ─────────────────────────────────────────────────────────────

  describe('isImageUrl', () => {
    it.each([
      'https://cdn.example.com/photo.jpg',
      'https://cdn.example.com/photo.jpeg',
      'https://cdn.example.com/photo.png',
      'https://cdn.example.com/photo.webp',
      'https://cdn.example.com/photo.gif',
      'https://cdn.example.com/photo.avif',
      'https://cdn.example.com/photo.svg',
    ])('returns true for %s', url => {
      expect(isImageUrl(url)).toBe(true);
    });

    it('returns true for CDN URLs with ?format param', () => {
      expect(isImageUrl('https://cdn.example.com/asset?format=webp')).toBe(true);
    });

    it('returns true for /images/ path segment', () => {
      expect(isImageUrl('https://api.example.com/images/avatar/123')).toBe(true);
    });

    it('returns false for non-image URLs', () => {
      expect(isImageUrl('https://api.example.com/users/123')).toBe(false);
      expect(isImageUrl('https://api.example.com/courses')).toBe(false);
    });

    it('handles malformed URLs gracefully', () => {
      expect(isImageUrl('not-a-url.png')).toBe(true);
      expect(isImageUrl('not-a-url')).toBe(false);
    });
  });

  // ─── applyFormatParam ───────────────────────────────────────────────────────

  describe('applyFormatParam', () => {
    it('appends format param to a plain image URL', () => {
      const result = applyFormatParam('https://cdn.example.com/photo.jpg', 'webp');
      expect(result).toContain('format=webp');
    });

    it('replaces an existing format param', () => {
      const result = applyFormatParam('https://cdn.example.com/photo.jpg?format=png', 'webp');
      expect(result).toContain('format=webp');
      expect(result).not.toContain('format=png');
    });

    it('preserves other query params', () => {
      const result = applyFormatParam('https://cdn.example.com/photo.jpg?w=200&h=200', 'webp');
      expect(result).toContain('w=200');
      expect(result).toContain('h=200');
      expect(result).toContain('format=webp');
    });

    it('passes non-image URLs through unchanged', () => {
      const url = 'https://api.example.com/users/123';
      expect(applyFormatParam(url, 'webp')).toBe(url);
    });

    it('handles relative URLs without throwing', () => {
      const result = applyFormatParam('/assets/photo.png', 'webp');
      expect(result).toContain('format=webp');
    });
  });

  // ─── getNegotiatedImageUrl ──────────────────────────────────────────────────

  describe('getNegotiatedImageUrl', () => {
    it('appends format=webp on WebP-capable platforms', () => {
      setPlatform('android');
      const result = getNegotiatedImageUrl('https://cdn.example.com/photo.jpg');
      expect(result).toContain('format=webp');
    });

    it('returns the original URL unchanged for non-image URLs', () => {
      setPlatform('android');
      const url = 'https://api.example.com/courses';
      expect(getNegotiatedImageUrl(url)).toBe(url);
    });

    it('returns empty string unchanged', () => {
      expect(getNegotiatedImageUrl('')).toBe('');
    });

    it('does not double-append format param on repeated calls', () => {
      setPlatform('ios');
      const url = 'https://cdn.example.com/photo.png';
      const once = getNegotiatedImageUrl(url);
      const twice = getNegotiatedImageUrl(once);
      // format= should appear exactly once
      expect((twice.match(/format=/g) ?? []).length).toBe(1);
    });
  });
});
