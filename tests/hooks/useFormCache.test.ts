import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useFormCache } from '../../src/hooks/useFormCache';
import { getFormCacheStorageKey } from '../../src/services/formCache';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock the app store so we control the userId
jest.mock('../../src/store', () => ({
  useAppStore: (selector: (state: { user: { id: string } | null }) => unknown) =>
    selector({ user: { id: 'test-user-1' } }),
}));

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockRemoveItem = AsyncStorage.removeItem as jest.Mock;

const EXPECTED_KEY = getFormCacheStorageKey('test-user-1');

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

  it('reads from the user-scoped storage key', async () => {
    const { result } = renderHook(() => useFormCache(['fullName']));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockGetItem).toHaveBeenCalledWith(EXPECTED_KEY);
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

  it('clearCache removes the user-scoped storage key and resets state', async () => {
    const { result } = renderHook(() => useFormCache(['fullName']));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.clearCache();
    });

    expect(mockRemoveItem).toHaveBeenCalledWith(EXPECTED_KEY);
    expect(result.current.prefillValues).toEqual({});
  });

  it('shares persisted values across form sessions via flushCache', async () => {
    let storedValue: string | null = null;
    mockGetItem.mockImplementation(async () => storedValue);
    mockSetItem.mockImplementation(async (_key, value) => {
      storedValue = value as string;
    });

    const firstForm = renderHook(() => useFormCache(['fullName', 'email']));
    await waitFor(() => expect(firstForm.result.current.isLoading).toBe(false));

    act(() => {
      firstForm.result.current.persistFields({
        fullName: 'Persisted User',
        email: 'persisted@teachlink.dev',
      });
    });

    await act(async () => {
      await firstForm.result.current.flushCache();
    });

    const secondForm = renderHook(() => useFormCache(['fullName']));
    await waitFor(() => expect(secondForm.result.current.isLoading).toBe(false));

    expect(secondForm.result.current.prefillValues.fullName).toBe('Persisted User');
  });

  describe('debounce behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('does not write to AsyncStorage before 800ms', async () => {
      const { result } = renderHook(() => useFormCache(['email']));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.persistFields({ email: 'a' });
      });
      act(() => {
        result.current.persistFields({ email: 'ab' });
      });
      act(() => {
        result.current.persistFields({ email: 'abc' });
      });

      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it('writes exactly once after 800ms burst', async () => {
      const { result } = renderHook(() => useFormCache(['email']));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.persistFields({ email: 'a' });
      });
      act(() => {
        result.current.persistFields({ email: 'ab' });
      });
      act(() => {
        result.current.persistFields({ email: 'abc' });
      });

      await act(async () => {
        jest.advanceTimersByTime(800);
      });

      expect(mockSetItem).toHaveBeenCalledTimes(1);
    });

    it('cancels pending write on unmount', async () => {
      const { result, unmount } = renderHook(() => useFormCache(['email']));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.persistFields({ email: 'test' });
      });
      unmount();

      await act(async () => {
        jest.advanceTimersByTime(800);
      });

      expect(mockSetItem).not.toHaveBeenCalled();
    });

    it('flushCache writes immediately and prevents double write', async () => {
      const { result } = renderHook(() => useFormCache(['email']));
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.persistFields({ email: 'flush-me' });
      });

      await act(async () => {
        await result.current.flushCache();
      });

      expect(mockSetItem).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(800);
      });

      // Still only 1 write — debounce was cancelled
      expect(mockSetItem).toHaveBeenCalledTimes(1);
    });
  });
});
