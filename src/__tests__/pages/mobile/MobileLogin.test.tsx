import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { MobileLogin } from '../../../pages/mobile/MobileLogin';
import authService from '../../../services/mobileAuth';
import { appLogger } from '../../../utils/logger';

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

// Mock secureStorage - critical for useEffect
jest.mock('../../../services/secureStorage', () => ({
  isRememberMeEnabled: jest.fn().mockResolvedValue(false),
}));

jest.mock('../../../components/mobile/BiometricPrompt', () => ({
  __esModule: true,
  BiometricInlineButton: () => null,
  BiometricPrompt: () => null,
}));

// Mock lucide icons used in error banner and form
jest.mock('lucide-react-native', () => ({
  AlertCircle: 'AlertCircle',
  Lock: 'Lock',
  Mail: 'Mail',
  Eye: 'Eye',
  EyeOff: 'EyeOff',
  LogIn: 'LogIn',
  Chrome: 'Chrome',
  Apple: 'Apple',
  BookOpen: 'BookOpen',
}));

jest.mock('../../../hooks', () => ({
  __esModule: true,
  useBiometricAuth: () => ({
    isAvailable: false,
    isEnabled: false,
    biometricType: 'fingerprint',
    authenticate: jest.fn().mockResolvedValue(null),
    isLoading: false,
    error: null,
    clearError: jest.fn(),
  }),
  useDynamicFontSize: () => ({ scale: (value: number) => value }),
  useFormValidation: () => ({
    errors: {},
    onChangeText: jest.fn(),
    onBlur: jest.fn(),
    validateAll: jest.fn(() => true),
  }),
}));

const originalConsoleError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    originalConsoleError('CAPTURED ERROR:', ...args);
  };
});
afterAll(() => {
  console.error = originalConsoleError;
});

jest.mock('../../../services/mobileAuth', () => ({
  __esModule: true,
  default: {
    login: jest.fn(),
    getRememberedEmail: jest.fn().mockResolvedValue(null),
  },
}));

jest.mock('../../../utils/logger', () => ({
  __esModule: true,
  appLogger: {
    error: jest.fn(),
    errorSync: jest.fn(),
    warn: jest.fn(),
    warnSync: jest.fn(),
    info: jest.fn(),
    infoSync: jest.fn(),
    debug: jest.fn(),
    debugSync: jest.fn(),
  },
  default: {
    error: jest.fn(),
    errorSync: jest.fn(),
  },
}));

const mockAuthService = authService as jest.Mocked<typeof authService>;
const mockAppLogger = appLogger as jest.Mocked<typeof appLogger>;

describe('MobileLogin', () => {
  const defaultProps = {
    onLoginSuccess: jest.fn(),
    onForgotPassword: jest.fn(),
    onRegister: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const typeCredentials = (getByPlaceholderText: any, email: string, password: string) => {
    fireEvent.changeText(getByPlaceholderText('you@example.com'), email);
    fireEvent.changeText(getByPlaceholderText('Enter your password'), password);
  };

  const submitForm = (getByText: any) => {
    fireEvent.press(getByText('Sign In'));
  };

  it('renders friendly invalid_grant message and logs raw error', async () => {
    mockAuthService.login.mockRejectedValueOnce({
      response: { data: { error: 'invalid_grant' }, status: 400 },
    });

    const { getByPlaceholderText, getByText, queryByText } = render(
      <MobileLogin {...defaultProps} />
    );

    await act(async () => {
      typeCredentials(getByPlaceholderText, 'user@example.com', 'password123');
      submitForm(getByText);
    });

    await waitFor(() => {
      expect(
        getByText('Your login session has expired. Please sign in again to continue.')
      ).toBeTruthy();
    });

    expect(queryByText('invalid_grant')).toBeNull();
    expect(mockAppLogger.error).toHaveBeenCalled();
  });

  it('renders friendly access_denied message and logs raw error', async () => {
    mockAuthService.login.mockRejectedValueOnce({
      response: { data: { error: 'access_denied' }, status: 400 },
    });

    const { getByPlaceholderText, getByText, queryByText } = render(
      <MobileLogin {...defaultProps} />
    );

    await act(async () => {
      typeCredentials(getByPlaceholderText, 'user@example.com', 'password123');
      submitForm(getByText);
    });

    await waitFor(() => {
      expect(
        getByText('The email or password you entered is incorrect. Please try again.')
      ).toBeTruthy();
    });

    expect(queryByText('access_denied')).toBeNull();
    expect(mockAppLogger.error).toHaveBeenCalled();
  });

  it('renders generic fallback for unknown error codes', async () => {
    mockAuthService.login.mockRejectedValueOnce({
      response: { data: { error: 'unknown_code' }, status: 400 },
    });

    const { getByPlaceholderText, getByText } = render(<MobileLogin {...defaultProps} />);

    await act(async () => {
      typeCredentials(getByPlaceholderText, 'user@example.com', 'password123');
      submitForm(getByText);
    });

    await waitFor(() => {
      expect(
        getByText('Unable to sign in right now. Please check your credentials and try again.')
      ).toBeTruthy();
    });
    expect(mockAppLogger.error).toHaveBeenCalled();
  });

  it('renders generic fallback for network error without response', async () => {
    mockAuthService.login.mockRejectedValueOnce(new Error('Network Error'));

    const { getByPlaceholderText, getByText } = render(<MobileLogin {...defaultProps} />);

    await act(async () => {
      typeCredentials(getByPlaceholderText, 'user@example.com', 'password123');
      submitForm(getByText);
    });

    await waitFor(() => {
      expect(
        getByText('Unable to sign in right now. Please check your credentials and try again.')
      ).toBeTruthy();
    });
    expect(mockAppLogger.error).toHaveBeenCalled();
  });
});
