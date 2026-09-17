import { AxiosError, AxiosResponse } from 'axios';

import {
  SESSION_EXPIRED_CODE,
  buildSanitizedApiError,
  buildSessionExpiredError,
} from '../sessionExpiredError';

describe('sessionExpiredError service', () => {
  describe('SESSION_EXPIRED_CODE', () => {
    it('should export the expected session expired constant', () => {
      expect(SESSION_EXPIRED_CODE).toBe('SESSION_EXPIRED');
    });
  });

  describe('buildSanitizedApiError', () => {
    it('sanitizes an AxiosError with structured response data and status', () => {
      const mockResponse = {
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: {} as any,
        data: {
          code: 'TOKEN_EXPIRED',
          message: 'Your access token has expired.',
        },
      } as AxiosResponse;

      const axiosError = new AxiosError(
        'Request failed with status code 401',
        'ERR_BAD_REQUEST',
        {} as any,
        {},
        mockResponse
      );

      const result = buildSanitizedApiError(axiosError);

      expect(result).toEqual({
        code: 'TOKEN_EXPIRED',
        message: 'Your access token has expired.',
        status: 401,
      });
    });

    it('falls back to AxiosError code when response data has no code', () => {
      const mockResponse = {
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
        data: {
          message: 'Malformed parameter.',
        },
      } as AxiosResponse;

      const axiosError = new AxiosError(
        'Request failed with status code 400',
        'ERR_NETWORK',
        {} as any,
        {},
        mockResponse
      );

      const result = buildSanitizedApiError(axiosError);

      expect(result).toEqual({
        code: 'ERR_NETWORK',
        message: 'Malformed parameter.',
        status: 400,
      });
    });

    it('falls back to API_ERROR and default message when AxiosError has no details', () => {
      const axiosError = new AxiosError('Network Error');

      const result = buildSanitizedApiError(axiosError);

      expect(result).toEqual({
        code: 'API_ERROR',
        message: 'An unexpected error occurred.',
        status: undefined,
      });
    });

    it('handles standard Error instances by returning UNKNOWN_ERROR', () => {
      const standardError = new Error('Database connection failed');

      const result = buildSanitizedApiError(standardError);

      expect(result).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
      });
    });

    it('handles non-error objects, primitives, null, and undefined gracefully', () => {
      expect(buildSanitizedApiError('string error')).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
      });

      expect(buildSanitizedApiError({ error: 'custom' })).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
      });

      expect(buildSanitizedApiError(null)).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
      });

      expect(buildSanitizedApiError(undefined)).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
      });

      expect(buildSanitizedApiError(500)).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
      });
    });
  });

  describe('buildSessionExpiredError', () => {
    it('returns a sanitized error object for session expiration', () => {
      const result = buildSessionExpiredError();

      expect(result).toBeDefined();
      expect(typeof result.code).toBe('string');
      expect(typeof result.message).toBe('string');
      expect(result).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred.',
      });
    });
  });
});
