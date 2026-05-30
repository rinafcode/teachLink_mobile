import { Asset } from 'expo-asset';

import {
  getCDNAssetUrl,
  getCDNFontUrl,
  isCDNUrl,
  CDN_BASE_URL,
  APP_VERSION,
} from '../../utils/cdn';

jest.mock('expo-asset', () => ({
  Asset: {
    fromModule: jest.fn((module: number) => ({
      uri: `assets/resolved-module-uri-${module}.png`,
    })),
  },
}));

describe('CDN Asset Utility', () => {
  describe('isCDNUrl', () => {
    it('should return true for URLs starting with the CDN base URL', () => {
      expect(isCDNUrl(`${CDN_BASE_URL}/image.png`)).toBe(true);
      expect(isCDNUrl(`${CDN_BASE_URL}/sub/path/icon.png?v=1.0.0`)).toBe(true);
    });

    it('should return false for absolute non-CDN URLs', () => {
      expect(isCDNUrl('https://otherdomain.com/image.png')).toBe(false);
      expect(isCDNUrl('https://teachlink.com/assets/logo.png')).toBe(false);
    });

    it('should return false for relative paths or invalid types', () => {
      expect(isCDNUrl('/assets/images/logo.png')).toBe(false);
      expect(isCDNUrl('')).toBe(false);
      expect(isCDNUrl(null as any)).toBe(false);
    });
  });

  describe('getCDNAssetUrl', () => {
    it('should return empty string for null, undefined, or empty values', () => {
      expect(getCDNAssetUrl(null)).toBe('');
      expect(getCDNAssetUrl(undefined)).toBe('');
      expect(getCDNAssetUrl('')).toBe('');
    });

    it('should preserve absolute HTTP/HTTPS non-CDN URLs', () => {
      const externalUrl = 'https://some-bucket.s3.amazonaws.com/course-thumbnails/pic.png';
      expect(getCDNAssetUrl(externalUrl)).toBe(externalUrl);
    });

    it('should append or update the version query parameter for existing CDN URLs', () => {
      const initialCdnUrl = `${CDN_BASE_URL}/images/avatar.png`;
      const versionedUrl = `${CDN_BASE_URL}/images/avatar.png?v=${APP_VERSION}`;
      expect(getCDNAssetUrl(initialCdnUrl)).toBe(versionedUrl);

      const alreadyParamUrl = `${CDN_BASE_URL}/images/avatar.png?v=0.9.0&param=test`;
      expect(getCDNAssetUrl(alreadyParamUrl)).toContain(`v=${APP_VERSION}`);
    });

    it('should map clean relative paths to the CDN base URL with version query', () => {
      expect(getCDNAssetUrl('images/hero.jpg')).toBe(
        `${CDN_BASE_URL}/images/hero.jpg?v=${APP_VERSION}`
      );
    });

    it('should sanitize leading slashes from relative paths', () => {
      expect(getCDNAssetUrl('/images/logo.png')).toBe(
        `${CDN_BASE_URL}/images/logo.png?v=${APP_VERSION}`
      );
      expect(getCDNAssetUrl('///images/logo.png')).toBe(
        `${CDN_BASE_URL}/images/logo.png?v=${APP_VERSION}`
      );
    });

    it('should strip "assets/" prefix from relative paths', () => {
      expect(getCDNAssetUrl('assets/images/favicon.ico')).toBe(
        `${CDN_BASE_URL}/images/favicon.ico?v=${APP_VERSION}`
      );
      expect(getCDNAssetUrl('/assets/images/favicon.ico')).toBe(
        `${CDN_BASE_URL}/images/favicon.ico?v=${APP_VERSION}`
      );
    });

    it('should resolve and map a required asset module ID (number)', () => {
      const mockModuleId = 42;

      const result = getCDNAssetUrl(mockModuleId);

      expect(Asset.fromModule).toHaveBeenCalledWith(mockModuleId);
      // "assets/" prefix is stripped by getCDNAssetUrl:
      expect(result).toBe(
        `${CDN_BASE_URL}/resolved-module-uri-${mockModuleId}.png?v=${APP_VERSION}`
      );
    });

    it('should return empty string if required asset resolution fails or returns null uri', () => {
      (Asset.fromModule as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Module resolution failed');
      });
      expect(getCDNAssetUrl(999)).toBe('');
    });
  });

  describe('getCDNFontUrl', () => {
    it('should return empty string for empty input', () => {
      expect(getCDNFontUrl('')).toBe('');
      expect(getCDNFontUrl(null as any)).toBe('');
    });

    it('should wrap a plain font filename in fonts/ path and point to CDN', () => {
      expect(getCDNFontUrl('Inter-Bold.ttf')).toBe(
        `${CDN_BASE_URL}/fonts/Inter-Bold.ttf?v=${APP_VERSION}`
      );
    });

    it('should sanitize leading slashes and prevent double fonts/ prefixes', () => {
      expect(getCDNFontUrl('/fonts/Inter-Regular.ttf')).toBe(
        `${CDN_BASE_URL}/fonts/Inter-Regular.ttf?v=${APP_VERSION}`
      );
      expect(getCDNFontUrl('fonts/Inter-Regular.ttf')).toBe(
        `${CDN_BASE_URL}/fonts/Inter-Regular.ttf?v=${APP_VERSION}`
      );
    });
  });
});
