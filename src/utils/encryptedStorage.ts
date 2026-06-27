import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

// SecureStore accepts alphanumeric, '.', '-', '_'. Prefix 'fce.' scopes keys to form-cache encryption.
function toSecureStoreKey(storageKey: string): string {
  return 'fce.' + storageKey.replace(/[^a-zA-Z0-9._-]/g, '.');
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getOrCreateAesKey(storageKey: string): Promise<CryptoKey> {
  const secureKey = toSecureStoreKey(storageKey);
  const stored = await SecureStore.getItemAsync(secureKey);

  if (stored) {
    return Crypto.subtle.importKey(
      'raw',
      base64ToUint8(stored),
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  const key = (await Crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )) as CryptoKey;

  const raw = await Crypto.subtle.exportKey('raw', key);
  await SecureStore.setItemAsync(secureKey, uint8ToBase64(new Uint8Array(raw as ArrayBuffer)));

  return key;
}

export async function encryptedSetItem(storageKey: string, value: string): Promise<void> {
  const key = await getOrCreateAesKey(storageKey);
  const iv = Crypto.getRandomBytes(12);
  const ciphertext = await Crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(value)
  );
  const payload = uint8ToBase64(iv) + '.' + uint8ToBase64(new Uint8Array(ciphertext as ArrayBuffer));
  await AsyncStorage.setItem(storageKey, payload);
}

export async function encryptedGetItem(storageKey: string): Promise<string | null> {
  const payload = await AsyncStorage.getItem(storageKey);
  if (!payload) return null;

  try {
    const dot = payload.indexOf('.');
    if (dot === -1) return null;

    const iv = base64ToUint8(payload.slice(0, dot));
    const ciphertext = base64ToUint8(payload.slice(dot + 1));
    const key = await getOrCreateAesKey(storageKey);
    const decrypted = await Crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

    return new TextDecoder().decode(decrypted as ArrayBuffer);
  } catch {
    return null;
  }
}

export async function encryptedRemoveItem(storageKey: string): Promise<void> {
  await AsyncStorage.removeItem(storageKey);
  await SecureStore.deleteItemAsync(toSecureStoreKey(storageKey)).catch(() => {});
}
