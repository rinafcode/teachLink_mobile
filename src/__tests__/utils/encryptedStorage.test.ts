import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { encryptedGetItem, encryptedRemoveItem, encryptedSetItem } from '../../utils/encryptedStorage';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');
jest.mock('expo-crypto', () => ({
  getRandomBytes: jest.fn(() => new Uint8Array(12).fill(0x42)),
  subtle: {
    generateKey: jest.fn().mockResolvedValue({ type: 'secret' }),
    exportKey: jest.fn().mockResolvedValue(new Uint8Array(32).fill(0x01).buffer),
    importKey: jest.fn().mockResolvedValue({ type: 'secret' }),
    encrypt: jest.fn().mockImplementation((_: unknown, __: unknown, data: Uint8Array) => {
      const output = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) output[i] = data[i] ^ 0xab;
      return Promise.resolve(output.buffer);
    }),
    decrypt: jest.fn().mockImplementation((_: unknown, __: unknown, data: Uint8Array) => {
      const output = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) output[i] = data[i] ^ 0xab;
      return Promise.resolve(output.buffer);
    }),
  },
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;

const STORAGE_KEY = '@teachlink/form-cache/user-1/v1';
const PLAINTEXT = JSON.stringify({ fullName: { value: 'Alice', updatedAt: 1_000_000 } });

describe('encryptedStorage – AES-256-GCM', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockSecureStore.setItemAsync.mockResolvedValue(undefined);
    mockSecureStore.deleteItemAsync.mockResolvedValue(undefined);
  });

  it('does not store plaintext in AsyncStorage', async () => {
    await encryptedSetItem(STORAGE_KEY, PLAINTEXT);

    expect(mockAsyncStorage.setItem).toHaveBeenCalledTimes(1);
    const [, storedValue] = mockAsyncStorage.setItem.mock.calls[0];
    expect(storedValue).not.toBe(PLAINTEXT);
    expect(storedValue).not.toContain('Alice');
  });

  it('stored payload has iv.ciphertext dot-separated format', async () => {
    await encryptedSetItem(STORAGE_KEY, PLAINTEXT);

    const [, storedValue] = mockAsyncStorage.setItem.mock.calls[0];
    expect(storedValue.indexOf('.')).toBeGreaterThan(0);
  });

  it('creates an encryption key and persists it to SecureStore under fce. prefix', async () => {
    await encryptedSetItem(STORAGE_KEY, PLAINTEXT);

    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith(
      expect.stringMatching(/^fce\./),
      expect.any(String)
    );
  });

  it('returns null for a missing key', async () => {
    const result = await encryptedGetItem(STORAGE_KEY);
    expect(result).toBeNull();
  });

  it('returns null gracefully when stored payload has no dot separator', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('invaliddatanodot');
    const result = await encryptedGetItem(STORAGE_KEY);
    expect(result).toBeNull();
  });

  it('round-trips: decrypted value equals original plaintext', async () => {
    const secureStoreData: Record<string, string> = {};
    const asyncStorageData: Record<string, string> = {};

    mockSecureStore.getItemAsync.mockImplementation(k =>
      Promise.resolve(secureStoreData[k] ?? null)
    );
    mockSecureStore.setItemAsync.mockImplementation((k, v) => {
      secureStoreData[k] = v;
      return Promise.resolve();
    });
    mockAsyncStorage.setItem.mockImplementation((k, v) => {
      asyncStorageData[k] = v;
      return Promise.resolve();
    });
    mockAsyncStorage.getItem.mockImplementation(k =>
      Promise.resolve(asyncStorageData[k] ?? null)
    );

    await encryptedSetItem(STORAGE_KEY, PLAINTEXT);
    const result = await encryptedGetItem(STORAGE_KEY);

    expect(result).toBe(PLAINTEXT);
  });

  it('removes item from AsyncStorage and deletes SecureStore key on encryptedRemoveItem', async () => {
    await encryptedRemoveItem(STORAGE_KEY);

    expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY);
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith(
      expect.stringMatching(/^fce\./)
    );
  });
});
