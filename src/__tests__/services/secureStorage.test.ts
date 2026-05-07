import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import logger from '../../utils/logger';
import * as secureStorage from '../../services/secureStorage';

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));
jest.mock('../../utils/logger');

const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockLogger = logger as jest.Mocked<typeof logger>;

describe('SecureStorage - Keychain/Keystore Verification #140', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset secure storage verification state
    (secureStorage as any).isSecureStorageVerified = false;
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
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockSecureStore.getItemAsync.mockResolvedValue('test_value');
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);

      const result = await secureStorage.initializeSecureStorage();

      expect(result).toBe(true);
      expect(secureStorage.isSecureStorageReady()).toBe(true);
      // Verify verification test was performed
      expect(mockSecureStore.setItemAsync).toHaveBeenCalled();
      expect(mockSecureStore.getItemAsync).toHaveBeenCalled();
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalled();
    });

    it('should fail gracefully if verification fails', async () => {
      mockSecureStore.setItemAsync.mockRejectedValue(new Error('Keychain unavailable'));

      const result = await secureStorage.initializeSecureStorage();

      expect(result).toBe(false);
      expect(secureStorage.isSecureStorageReady()).toBe(false);
    });

    it('should verify storage integrity with read-write-delete cycle', async () => {
      const testKey = '__secure_storage_verification_test__';
      const testValue = `test_${Date.now()}`;

      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockSecureStore.getItemAsync.mockResolvedValue(testValue);
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);

      const result = await secureStorage.initializeSecureStorage();

      expect(result).toBe(true);
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        testKey,
        expect.stringContaining('test_'),
        expect.objectContaining({
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
      );
      expect(mockSecureStore.getItemAsync).toHaveBeenCalled();
    });
  });

  // ─── NO AsyncStorage Fallback for Sensitive Data ──────────────────────────

  describe('❌ NO AsyncStorage Fallback (Security Critical)', () => {
    it('should NOT use AsyncStorage for access tokens', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);

      await secureStorage.initializeSecureStorage();
      await secureStorage.saveTokens('access_token', 'refresh_token', Date.now() + 3600000);

      // Verify AsyncStorage was NOT used
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
      // Verify SecureStore was used instead
      expect(mockSecureStore.setItemAsync).toHaveBeenCalled();
    });

    it('should NOT use AsyncStorage for refresh tokens', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);

      await secureStorage.initializeSecureStorage();
      await secureStorage.saveTokens('access_token', 'refresh_token', Date.now() + 3600000);

      // Verify AsyncStorage was NOT used for any token
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should NOT use AsyncStorage for user data', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);

      await secureStorage.initializeSecureStorage();
      await secureStorage.saveUserData({ id: '123', name: 'Test User' });

      // Verify AsyncStorage was NOT used
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
      // Verify SecureStore was used
      expect(mockSecureStore.setItemAsync).toHaveBeenCalled();
    });

    it('should throw error if SecureStore fails for sensitive data instead of falling back', async () => {
      mockSecureStore.setItemAsync.mockRejectedValue(new Error('Keychain error'));

      await secureStorage.initializeSecureStorage();

      await expect(
        secureStorage.saveTokens('token', 'refresh', Date.now()),
      ).rejects.toThrow();

      // AsyncStorage should NOT be called as fallback
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });
  });

  // ─── Keychain/Keystore Configuration ─────────────────────────────────────

  describe('✅ Proper Keychain/Keystore Configuration', () => {
    it('should use WHEN_UNLOCKED_THIS_DEVICE_ONLY access policy', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);

      await secureStorage.initializeSecureStorage();
      await secureStorage.saveTokens('access', 'refresh', Date.now());

      // Verify correct access policy is used
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
      );
    });

    it('should enforce device unlock requirement for token retrieval', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('token_value');

      await secureStorage.initializeSecureStorage();
      await secureStorage.getAccessToken();

      // Verify options with device unlock requirement are used
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(
        'teachlink_access_token',
        expect.objectContaining({
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        }),
      );
    });

    it('should apply same security policy to all sensitive data', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockSecureStore.getItemAsync.mockResolvedValue('value');

      await secureStorage.initializeSecureStorage();

      // Save user data
      await secureStorage.saveUserData({ id: '123' });

      // Save tokens
      await secureStorage.saveTokens('access', 'refresh', Date.now());

      // All calls should use WHEN_UNLOCKED_THIS_DEVICE_ONLY
      const allCalls = mockSecureStore.setItemAsync.mock.calls;
      allCalls.forEach((call) => {
        expect(call[2]).toEqual({
          keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
        });
      });
    });
  });

  // ─── Token Management with Encryption ────────────────────────────────────

  describe('✅ Token Management with Encryption', () => {
    beforeEach(async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      await secureStorage.initializeSecureStorage();
    });

    it('should save tokens only to Keychain/Keystore', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);

      await secureStorage.saveTokens('access_token', 'refresh_token', 9999999999);

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'teachlink_access_token',
        'access_token',
        expect.any(Object),
      );
      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'teachlink_refresh_token',
        'refresh_token',
        expect.any(Object),
      );
      // Verify not saved to AsyncStorage
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should retrieve access token from Keychain/Keystore', async () => {
      mockSecureStore.getItemAsync.mockResolvedValue('stored_access_token');

      const token = await secureStorage.getAccessToken();

      expect(token).toBe('stored_access_token');
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(
        'teachlink_access_token',
        expect.any(Object),
      );
      expect(mockAsyncStorage.getItem).not.toHaveBeenCalled();
    });

    it('should throw error on secure token retrieval failure', async () => {
      mockSecureStore.getItemAsync.mockRejectedValue(new Error('Keychain access denied'));

      await expect(secureStorage.getAccessToken()).rejects.toThrow();
    });

    it('should clear tokens from Keychain/Keystore on logout', async () => {
      mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);

      await secureStorage.clearTokens();

      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'teachlink_access_token',
        expect.any(Object),
      );
      expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
        'teachlink_refresh_token',
        expect.any(Object),
      );
      expect(mockAsyncStorage.removeItem).not.toHaveBeenCalled();
    });
  });

  // ─── Session Management ─────────────────────────────────────────────────

  describe('✅ Session Management with Encryption', () => {
    beforeEach(async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      await secureStorage.initializeSecureStorage();
    });

    it('should validate active session from encrypted storage', async () => {
      const futureTime = Date.now() + 3600000; // 1 hour from now
      mockSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'teachlink_access_token') return Promise.resolve('token');
        if (key === 'teachlink_session_expires_at')
          return Promise.resolve(String(futureTime));
        return Promise.resolve(null);
      });

      const isValid = await secureStorage.isSessionValid();

      expect(isValid).toBe(true);
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(
        'teachlink_access_token',
        expect.any(Object),
      );
    });

    it('should detect expired session from encrypted storage', async () => {
      const pastTime = Date.now() - 3600000; // 1 hour ago
      mockSecureStore.getItemAsync.mockImplementation((key) => {
        if (key === 'teachlink_access_token') return Promise.resolve('token');
        if (key === 'teachlink_session_expires_at')
          return Promise.resolve(String(pastTime));
        return Promise.resolve(null);
      });

      const isValid = await secureStorage.isSessionValid();

      expect(isValid).toBe(false);
    });
  });

  // ─── User Data Encryption ─────────────────────────────────────────────────

  describe('✅ User Data Encryption', () => {
    beforeEach(async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      mockSecureStore.getItemAsync.mockResolvedValue(null);
      await secureStorage.initializeSecureStorage();
    });

    it('should save user data to Keychain/Keystore', async () => {
      const userData = { id: 'user_123', email: 'user@example.com', role: 'student' };

      await secureStorage.saveUserData(userData);

      expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
        'teachlink_user_data',
        JSON.stringify(userData),
        expect.any(Object),
      );
      expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    });

    it('should retrieve and deserialize user data from Keychain/Keystore', async () => {
      const userData = { id: 'user_123', name: 'Test User' };
      mockSecureStore.getItemAsync.mockResolvedValue(JSON.stringify(userData));

      const retrieved = await secureStorage.getUserData();

      expect(retrieved).toEqual(userData);
      expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith(
        'teachlink_user_data',
        expect.any(Object),
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
    beforeEach(async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);
      await secureStorage.initializeSecureStorage();
    });

    it('should log critical errors for failed token operations', async () => {
      mockSecureStore.setItemAsync.mockRejectedValueOnce(
        new Error('Keychain blocked by system'),
      );

      try {
        await secureStorage.saveTokens('token', 'refresh', Date.now());
      } catch {
        // Expected
      }

      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('❌ CRITICAL'),
        expect.any(Object),
      );
    });

    it('should NOT log sensitive data values', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);

      await secureStorage.saveTokens('secret_access_token_12345', 'secret_refresh', Date.now());

      // Check that the actual token values are never logged
      const allLogCalls = mockLogger.info.mock.calls.concat(mockLogger.error.mock.calls);
      allLogCalls.forEach((call) => {
        const logContent = JSON.stringify(call);
        expect(logContent).not.toContain('secret_access_token_12345');
        expect(logContent).not.toContain('secret_refresh');
      });
    });

    it('should log successful operations with platform info', async () => {
      mockSecureStore.setItemAsync.mockResolvedValue(undefined);

      await secureStorage.saveTokens('token', 'refresh', Date.now());

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('✅'),
        expect.any(Object),
      );
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
      expect(secureStorage.STORAGE_SENSITIVE_KEYS.has('teachlink_access_token')).toBe(
        true,
      );
      expect(secureStorage.STORAGE_SENSITIVE_KEYS.has('teachlink_refresh_token')).toBe(
        true,
      );
      expect(secureStorage.STORAGE_SENSITIVE_KEYS.has('teachlink_user_data')).toBe(true);
    });
  });

  // ─── Security Summary ───────────────────────────────────────────────────

  describe('🔐 Security Summary - Issue #140', () => {
    it('should verify all security requirements are met', async () => {
      // ✅ Uses Keychain on iOS
      (Platform as any).OS = 'ios';
      let info = secureStorage.getSecureStoragePlatformInfo();
      expect(info.backend).toBe('Keychain');

      // ✅ Uses Keystore on Android
      (Platform as any).OS = 'android';
      info = secureStorage.getSecureStoragePlatformInfo();
      expect(info.backend).toBe('Keystore');

      // ✅ Requires device unlock
      expect(info.requiresDeviceLock).toBe(true);

      // ✅ No AsyncStorage usage (verified in specific tests)
      // Already tested in "NO AsyncStorage Fallback" suite

      // ✅ Proper configuration with WHEN_UNLOCKED_THIS_DEVICE_ONLY
      // Already tested in "Proper Keychain/Keystore Configuration" suite

      console.log('✅ All security requirements for Issue #140 verified');
    });
  });
});
