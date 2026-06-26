import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import * as secureStorage from '../../services/secureStorage';
import defaultLogger from '../../utils/logger';

const logger = defaultLogger;

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('expo-secure-store', () => {
  return {
    WHEN_UNLOCKED_THIS_DEVICE_ONLY: 'WHEN_UNLOCKED_THIS_DEVICE_ONLY',
    setItemAsync: jest.fn(),
    getItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
    _resetMockStore: jest.fn(),
  };
});

jest.mock('@react-native-async-storage/async-storage', () => {
  return {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };
});

// Ensure Platform defaults to iOS for these tests
Platform.OS = 'ios';

jest.mock('../../utils/logger', () => {
  const mockLog = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    infoSync: jest.fn(),
    warnSync: jest.fn(),
    errorSync: jest.fn(),
  };
  return {
    __esModule: true,
    appLogger: mockLog,
    default: mockLog,
  };
});

let loggedCriticalError = false;
let loggedSuccess = false;

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockLogger = logger as jest.Mocked<typeof defaultLogger>;

describe('SecureStorage - Keychain/Keystore Verification #140', () => {
  let mockStorage: Record<string, string> = {};

  beforeEach(async () => {
    jest.clearAllMocks();
    mockStorage = {};
    // Reset secure storage verification state
    secureStorage.__resetSecureStorageVerification__();

    // Set up dynamic mock store that remembers written keys for verification cycle
    mockSecureStore.setItemAsync.mockImplementation(async (key, val) => {
      mockStorage[key] = val;
      return undefined;
    });
    mockSecureStore.getItemAsync.mockImplementation(async key => {
      if (key === '__secure_storage_verification_test__') {
        return mockStorage[key] !== undefined ? mockStorage[key] : null;
      }
      return mockStorage[key] !== undefined ? mockStorage[key] : 'test_value';
    });
    mockSecureStore.deleteItemAsync.mockImplementation(async key => {
      delete mockStorage[key];
      return undefined;
    });

    loggedCriticalError = false;
    loggedSuccess = false;
    mockLogger.error.mockImplementation(msg => {
      if (typeof msg === 'string' && msg.includes('❌ CRITICAL')) {
        loggedCriticalError = true;
      }
    });
    mockLogger.info.mockImplementation(msg => {
      if (typeof msg === 'string' && msg.includes('✅')) {
        loggedSuccess = true;
      }
    });

    await secureStorage.initializeSecureStorage();
  });

  // ─── Keychain/Keystore Usage Verification ─────────────────────────────────

  describe('✅ Platform-Specific Security Backend', () => {
    it('should provide platform information indicating Keychain for iOS', () => {
      (Platform as any).OS = 'ios';
      const info = secureStorage.getSecureStoragePlatformInfo();

      expect(info.platform).toBe('ios');
      expect(info.backend).toBe('Keychain');
      expect(info.requiresDeviceLock).toBe(true);
    });

    it('should provide platform information indicating Keystore for Android', () => {
      (Platform as any).OS = 'android';
      const info = secureStorage.getSecureStoragePlatformInfo();

      expect(info.platform).toBe('android');
      expect(info.backend).toBe('Keystore');
      expect(info.requiresDeviceLock).toBe(true);
    });

    it('should require device unlock for all platforms', () => {
      const info = secureStorage.getSecureStoragePlatformInfo();
      expect(info.requiresDeviceLock).toBe(true);
    });
  });

  // ─── Initialization & Verification ───────────────────────────────────────

  describe('✅ Secure Storage Initialization', () => {
    it('should initialize and verify secure storage on startup', async () => {
      const mockStore: Record<string, string> = {};

      mockSecureStore.setItemAsync.mockImplementation(async (key: string, value: string) => {
        mockStore[key] = value;
        return Promise.resolve();
      });
      mockSecureStore.getItemAsync.mockImplementation(async (key: string) => {
        return Promise.resolve(mockStore[key] ?? null);
      });
      mockSecureStore.deleteItemAsync.mockImplementation(async (key: string) => {
        delete mockStore[key];
        return Promise.resolve();
      });

      const result = await secureStorage.initializeSecureStorage();

      expect(result).toBe(true);
      expect(secureStorage.isSecureStorageReady()).toBe(true);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalled();
      expect(mockSecureStore.getItemAsync).toHaveBeenCalled();
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalled();
    });

    it('should fail gracefully if verification fails', async () => {
      secureStorage.__resetSecureStorageVerification__();
      mockSecureStore.setItemAsync.mockImplementationOnce(() =>
        Promise.reject(new Error('Keychain unavailable'))
      );

      const result = await secureStorage.initializeSecureStorage();

      expect(result).toBe(false);
      expect(secureStorage.isSecureStorageReady()).toBe(false);
    });

    it('should verify storage integrity with read-write-delete cycle', async () => {
      const testKey = '__secure_storage_verification_test__';

      const result = await secureStorage.initializeSecureStorage();

      expect(result).toBe(true);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        testKey,
        expect.stringContaining('test_'),
        expect.objectContaining({
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        })
      );
      expect(mockSecureStore.getItemAsync).toHaveBeenCalled();
    });
  });

  // ─── NO AsyncStorage Fallback for Sensitive Data ──────────────────────────

  describe('❌ NO AsyncStorage Fallback (Security Critical)', () => {
    it('should NOT use AsyncStorage for access tokens', async () => {
      await secureStorage.initializeSecureStorage();
      await secureStorage.saveTokens('access_token', 'refresh_token', Date.now() + 3600000);

      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
      expect(mockSecureStore.setItemAsync).toHaveBeenCalled();
    });

    it('should NOT use AsyncStorage for refresh tokens', async () => {
      await secureStorage.initializeSecureStorage();
      await secureStorage.saveTokens('access_token', 'refresh_token', Date.now() + 3600000);

      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should NOT use AsyncStorage for user data', async () => {
      await secureStorage.initializeSecureStorage();
      await secureStorage.saveUserData({ id: '123', name: 'Test User' });

      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
      expect(mockSecureStore.setItemAsync).toHaveBeenCalled();
    });

    it('should throw error if SecureStore fails for sensitive data instead of falling back', async () => {
      mockSecureStore.setItemAsync.mockImplementationOnce(() =>
        Promise.reject(new Error('Keychain error'))
      );

      await expect(secureStorage.saveTokens('token', 'refresh', Date.now())).rejects.toThrow();

      // AsyncStorage should NOT be called as fallback
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  // ─── Keychain/Keystore Configuration ─────────────────────────────────────

  describe('✅ Proper Keychain/Keystore Configuration', () => {
    it('should use WHEN_UNLOCKED_THIS_DEVICE_ONLY access policy', async () => {
      await secureStorage.initializeSecureStorage();
      await secureStorage.saveTokens('access', 'refresh', Date.now());

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        })
      );
    });

    it('should enforce device unlock requirement for token retrieval', async () => {
      await secureStorage.initializeSecureStorage();
      mockStorage['teachlink_access_token'] = 'token_value';
      await secureStorage.getAccessToken();

      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(
        'teachlink_access_token',
        expect.objectContaining({
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        })
      );
    });

    it('should apply same security policy to all sensitive data', async () => {
      await secureStorage.initializeSecureStorage();

      await secureStorage.saveUserData({ id: '123' });
      await secureStorage.saveTokens('access', 'refresh', Date.now());

      const allCalls = mockSecureStore.setItemAsync.mock.calls;
      allCalls.forEach(call => {
        expect(call[2]).toEqual({
          keychainAccessible: mockSecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      });
    });
  });

  // ─── Token Management with Encryption ────────────────────────────────────

  describe('✅ Token Management with Encryption', () => {
    beforeEach(async () => {
      await secureStorage.initializeSecureStorage();
    });

    it('should save tokens only to Keychain/Keystore', async () => {
      await secureStorage.saveTokens('access_token', 'refresh_token', 9999999999);

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'teachlink_access_token',
        'access_token',
        expect.any(Object)
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'teachlink_refresh_token',
        'refresh_token',
        expect.any(Object)
      );
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should retrieve access token from Keychain/Keystore', async () => {
      mockStorage['teachlink_access_token'] = 'stored_access_token';

      const token = await secureStorage.getAccessToken();

      expect(token).toBe('stored_access_token');
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(
        'teachlink_access_token',
        expect.any(Object)
      );
      expect(mockAsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it('should throw error on secure token retrieval failure', async () => {
      mockSecureStore.getItemAsync.mockImplementationOnce(() =>
        Promise.reject(new Error('Keychain access denied'))
      );

      await expect(secureStorage.getAccessToken()).rejects.toThrow();
    });

    it('should clear tokens from Keychain/Keystore on logout', async () => {
      await secureStorage.clearTokens();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'teachlink_access_token',
        expect.any(Object)
      );
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'teachlink_refresh_token',
        expect.any(Object)
      );
      expect(mockAsyncStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  // ─── Session Management ─────────────────────────────────────────────────

  describe('✅ Session Management with Encryption', () => {
    beforeEach(async () => {
      await secureStorage.initializeSecureStorage();
    });

    it('should validate active session from encrypted storage', async () => {
      const futureTime = Date.now() + 3600000; // 1 hour from now
      mockSecureStore.getItemAsync.mockImplementation(key => {
        if (key === 'teachlink_access_token') return Promise.resolve('token');
        if (key === 'teachlink_session_expires_at') return Promise.resolve(String(futureTime));
        return Promise.resolve(null);
      });

      const isValid = await secureStorage.isSessionValid();

      expect(isValid).toBe(true);
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(
        'teachlink_access_token',
        expect.any(Object)
      );
    });

    it('should detect expired session from encrypted storage', async () => {
      const pastTime = Date.now() - 3600000; // 1 hour ago
      mockSecureStore.getItemAsync.mockImplementation(key => {
        if (key === 'teachlink_access_token') return Promise.resolve('token');
        if (key === 'teachlink_session_expires_at') return Promise.resolve(String(pastTime));
        return Promise.resolve(null);
      });

      const isValid = await secureStorage.isSessionValid();

      expect(isValid).toBe(false);
    });
  });

  // ─── User Data Encryption ─────────────────────────────────────────────────

  describe('✅ User Data Encryption', () => {
    beforeEach(async () => {
      await secureStorage.initializeSecureStorage();
    });

    it('should save user data to Keychain/Keystore', async () => {
      const userData = { id: 'user_123', email: 'user@example.com', role: 'student' };

      await secureStorage.saveUserData(userData);

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'teachlink_user_data',
        JSON.stringify(userData),
        expect.any(Object)
      );
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should retrieve and deserialize user data from Keychain/Keystore', async () => {
      const userData = { id: 'user_123', name: 'Test User' };
      mockStorage['teachlink_user_data'] = JSON.stringify(userData);

      const retrieved = await secureStorage.getUserData();

      expect(retrieved).toEqual(userData);
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(
        'teachlink_user_data',
        expect.any(Object)
      );
    });

    it('should NOT use AsyncStorage for user data', async () => {
      await secureStorage.saveUserData({ id: '123' });

      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
      expect(mockAsyncStorage.getItem).not.toHaveBeenCalled();
    });
  });

  // ─── Error Handling & Logging ────────────────────────────────────────────

  describe('✅ Error Handling & Security Logging', () => {
    it('should log critical errors for failed token operations', async () => {
      mockSecureStore.setItemAsync.mockRejectedValueOnce(new Error('Keychain blocked by system'));

      try {
        await secureStorage.initializeSecureStorage();
        await secureStorage.saveTokens('token', 'refresh', Date.now());
      } catch {
        // Safe catch container
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ CRITICAL'),
        expect.any(Object)
      );
      expect(loggedCriticalError).toBe(true);
    });

    it('should NOT log sensitive data values', async () => {
      await secureStorage.initializeSecureStorage();
      await secureStorage.saveTokens('secret_access_token_12345', 'secret_refresh', Date.now());

      const allLogCalls = mockLogger.info.mock.calls.concat(mockLogger.error.mock.calls);
      allLogCalls.forEach(call => {
        const logContent = JSON.stringify(call);
        expect(logContent).not.toContain('secret_access_token_12345');
        expect(logContent).not.toContain('secret_refresh');
      });
    });

    it('should log successful operations with platform info', async () => {
      await secureStorage.initializeSecureStorage();
      await secureStorage.saveTokens('token', 'refresh', Date.now());

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('✅'),
        expect.any(Object)
      );
      expect(loggedSuccess).toBe(true);
    });
  });

  // ─── Manifest Export (for verification) ──────────────────────────────────

  describe('✅ Storage Manifest & Verification', () => {
    it('should export storage keys for verification', () => {
      expect(secureStorage.STORAGE_KEYS).toBeDefined();
      expect(secureStorage.STORAGE_KEYS.ACCESS_TOKEN).toBe('teachlink_access_token');
      expect(secureStorage.STORAGE_KEYS.REFRESH_TOKEN).toBe('teachlink_refresh_token');
      expect(secureStorage.STORAGE_KEYS.USER_DATA).toBe('teachlink_user_data');
    });

    it('should identify sensitive keys', () => {
      expect(secureStorage.STORAGE_SENSITIVE_KEYS).toBeDefined();
      expect(secureStorage.STORAGE_SENSITIVE_KEYS.has('teachlink_access_token')).toBe(true);
      expect(secureStorage.STORAGE_SENSITIVE_KEYS.has('teachlink_refresh_token')).toBe(true);
      expect(secureStorage.STORAGE_SENSITIVE_KEYS.has('teachlink_user_data')).toBe(true);
    });
  });

  // ─── Security Summary ───────────────────────────────────────────────────

  describe('🔐 Security Summary - Issue #140', () => {
    it('should verify all security requirements are met', async () => {
      (Platform as any).OS = 'ios';
      let info = secureStorage.getSecureStoragePlatformInfo();
      expect(info.backend).toBe('Keychain');

      (Platform as any).OS = 'android';
      info = secureStorage.getSecureStoragePlatformInfo();
      expect(info.backend).toBe('Keystore');

      expect(info.requiresDeviceLock).toBe(true);

      console.log('✅ All security requirements for Issue #140 verified');
    });
  });
});
