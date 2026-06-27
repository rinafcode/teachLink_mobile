import { act, renderHook } from '@testing-library/react-native';
import React from 'react';

import { AuthProvider, useAuth } from '../../hooks/useAuth';
import mobileAuth from '../../services/mobileAuth';
import { appLogger } from '../../utils/logger';

jest.mock('../../services/mobileAuth', () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    loginWithBiometrics: jest.fn(),
    logout: jest.fn(),
    restoreSession: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  appLogger: {
    errorSync: jest.fn(),
    warnSync: jest.fn(),
    infoSync: jest.fn(),
    debugSync: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
  default: {
    errorSync: jest.fn(),
  },
}));

const mockMobileAuth = mobileAuth as jest.Mocked<typeof mobileAuth>;
const mockAppLogger = appLogger as jest.Mocked<typeof appLogger>;

describe('useAuth login error handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockMobileAuth.restoreSession.mockResolvedValue(null);
  });

  function renderAuthHook() {
    return renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });
  }

  const createAxiosError = (code: string) => ({
    response: {
      data: {
        error: code,
      },
    },
  });

  it('maps invalid_grant to a friendly message and logs raw error', async () => {
    mockMobileAuth.login.mockRejectedValueOnce(createAxiosError('invalid_grant'));

    const { result } = renderAuthHook();

    await act(async () => {
      await expect(
        result.current.login({ email: 'user@example.com', password: 'password123' })
      ).rejects.toThrow('Your login session has expired. Please sign in again to continue.');
    });

    expect(mockAppLogger.error).toHaveBeenCalledWith(
      'Auth login failed',
      expect.objectContaining({ response: { data: { error: 'invalid_grant' } } }),
      expect.any(Object)
    );
    expect(result.current.isLoading).toBe(false);
  });

  it('maps access_denied to a friendly message and logs raw error', async () => {
    mockMobileAuth.login.mockRejectedValueOnce(createAxiosError('access_denied'));

    const { result } = renderAuthHook();

    await act(async () => {
      await expect(
        result.current.login({ email: 'user@example.com', password: 'password123' })
      ).rejects.toThrow('The email or password you entered is incorrect. Please try again.');
    });

    expect(mockAppLogger.error).toHaveBeenCalledWith(
      'Auth login failed',
      expect.objectContaining({ response: { data: { error: 'access_denied' } } }),
      expect.any(Object)
    );
    expect(result.current.isLoading).toBe(false);
  });

  it('falls back to generic message for unknown error codes and logs raw error', async () => {
    mockMobileAuth.login.mockRejectedValueOnce(createAxiosError('unknown_code'));

    const { result } = renderAuthHook();

    await act(async () => {
      await expect(
        result.current.login({ email: 'user@example.com', password: 'password123' })
      ).rejects.toThrow(
        'Unable to sign in right now. Please check your credentials and try again.'
      );
    });

    expect(mockAppLogger.error).toHaveBeenCalledWith(
      'Auth login failed',
      expect.objectContaining({ response: { data: { error: 'unknown_code' } } }),
      expect.any(Object)
    );
    expect(result.current.isLoading).toBe(false);
  });
});
