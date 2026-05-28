import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useFormCache } from '../../src/hooks/useFormCache';
import { FORM_CACHE_STORAGE_KEY } from '../../src/services/formCache';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockRemoveItem.mockResolvedValue(undefined);
});

describe('useFormCache', () => {
  it('loads cached values for requested keys', async () => {
    const now = Date.now();
    mockGetItem.mockResolvedValue(
      JSON.stringify({
        fullName: { value: 'Cached User', updatedAt: now },
        email: { value: 'c@d.com', updatedAt: now },
      })
    );

    const { result } = renderHook(() => useFormCache(['fullName', 'email']));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.prefillValues.fullName).toBe('Cached User');
    expect(result.current.prefillValues.email).toBe('c@d.com');
  });

  it('applyPrefillToFields only fills empty fields', async () => {
    const now = Date.now();
    mockGetItem.mockResolvedValue(
      JSON.stringify({
        fullName: { value: 'From Cache', updatedAt: now },
        email: { value: 'cached@e.com', updatedAt: now },
      })
    );

    const setFullName = jest.fn();
    const setEmail = jest.fn();

    const { result } = renderHook(() => useFormCache(['fullName', 'email']));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.applyPrefillToFields(
        { fullName: 'Already', email: '' },
        { fullName: setFullName, email: setEmail }
      );
    });

    expect(setFullName).not.toHaveBeenCalled();
    expect(setEmail).toHaveBeenCalledWith('cached@e.com');
  });

  it('clearCache removes storage and resets state', async () => {
    const { result } = renderHook(() => useFormCache(['fullName']));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.clearCache();
    });

    expect(mockRemoveItem).toHaveBeenCalledWith(FORM_CACHE_STORAGE_KEY);
    expect(result.current.prefillValues).toEqual({});
  });

  it('shares persisted values across form sessions', async () => {
    let storedValue: string | null = null;
    mockGetItem.mockImplementation(async () => storedValue);
    mockSetItem.mockImplementation(async (_key, value) => {
      storedValue = value as string;
    });

    const firstForm = renderHook(() => useFormCache(['fullName', 'email']));
    await waitFor(() => expect(firstForm.result.current.isLoading).toBe(false));

    await act(async () => {
      await firstForm.result.current.persistFields({
        fullName: 'Persisted User',
        email: 'persisted@teachlink.dev',
      });
    });

    const secondForm = renderHook(() => useFormCache(['fullName']));
    await waitFor(() => expect(secondForm.result.current.isLoading).toBe(false));

    expect(secondForm.result.current.prefillValues.fullName).toBe('Persisted User');
  });
});
