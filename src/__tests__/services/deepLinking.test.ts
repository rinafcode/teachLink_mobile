import * as Sentry from '@sentry/react-native';

import { validateDeepLink, sanitizeDeepLink } from '../../services/deepLinking';
import { useDeepLinkStore } from '../../store/deepLinkStore';
import { appLogger } from '../../utils/logger';

jest.mock('../../store/deepLinkStore', () => {
  const setDeepLinkErrorMock = jest.fn();
  return {
    useDeepLinkStore: {
      getState: jest.fn(() => ({
        setDeepLinkError: setDeepLinkErrorMock,
      })),
    },
  };
});

jest.mock('@sentry/react-native', () => ({
  captureMessage: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn(),
}));

describe('deepLinking security validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateDeepLink', () => {
    it('allows valid paths', () => {
      const allowedUrls = [
        'teachlink://course/123',
        'https://teachlink.com/profile/me',
        'teachlink://settings',
        'https://www.teachlink.com/search?q=math',
        'teachlink://messages/456',
      ];

      allowedUrls.forEach(url => {
        expect(validateDeepLink(url)).toBe(true);
      });

      expect(appLogger.warn).not.toHaveBeenCalled();
      expect(Sentry.captureMessage).not.toHaveBeenCalled();
    });

    it('blocks unauthorized paths', () => {
      const blockedUrls = [
        'teachlink://admin/dashboard',
        'https://teachlink.com/payments/checkout',
        'teachlink://debug/settings',
        'https://www.teachlink.com/internal-api/keys',
        'teachlink://unrecognized-path',
      ];

      blockedUrls.forEach(url => {
        expect(validateDeepLink(url)).toBe(false);
      });

      expect(appLogger.warn).toHaveBeenCalledTimes(5);
      expect(Sentry.captureMessage).toHaveBeenCalledTimes(5);

      const storeMock = useDeepLinkStore.getState();
      expect(storeMock.setDeepLinkError).toHaveBeenCalledWith(
        'This link is invalid or not supported.'
      );
    });

    it('blocks malformed URLs', () => {
      expect(validateDeepLink('not-a-url')).toBe(false);
      expect(appLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Malformed deep link'));

      const storeMock = useDeepLinkStore.getState();
      expect(storeMock.setDeepLinkError).toHaveBeenCalledWith('The link is malformed.');
    });
  });

  describe('sanitizeDeepLink', () => {
    it('strips unexpected query parameters while keeping allowed ones', () => {
      const input =
        'teachlink://course/123?utm_source=twitter&malicious=script&utm_medium=social&tracker=id';
      const result = sanitizeDeepLink(input);

      // Some URL parsers might reorder query params or append trailing slash,
      // but in this case let's check it preserves exact params.
      expect(result).toContain('utm_source=twitter');
      expect(result).toContain('utm_medium=social');
      expect(result).not.toContain('malicious');
      expect(result).not.toContain('tracker');
    });

    it('handles web urls with unexpected query parameters', () => {
      const input = 'https://teachlink.com/profile?deferred=true&session=steal';
      const result = sanitizeDeepLink(input);
      expect(result).toContain('deferred=true');
      expect(result).not.toContain('session');
    });

    it('returns the sanitized url for URLs without parameters', () => {
      const input = 'teachlink://settings';
      const result = sanitizeDeepLink(input);
      expect(result.replace(/\/$/, '')).toBe('teachlink://settings');
    });
  });
});
