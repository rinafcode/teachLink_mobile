import { renderHook, act } from '@testing-library/react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { InteractionManager } from 'react-native';

import { useOptimizedClipboard } from '../../hooks/useOptimizedClipboard';

// Mock expo-clipboard explicitly for these tests since it's not globally mocked
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(true),
  getStringAsync: jest.fn().mockResolvedValue('test pasted text'),
}));

describe('useOptimizedClipboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Ensure InteractionManager resolves immediately in tests
    (InteractionManager.runAfterInteractions as jest.Mock).mockImplementation((cb) => cb());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('initializes with correct default state', () => {
    const { result } = renderHook(() => useOptimizedClipboard());
    
    expect(result.current.isCopying).toBe(false);
    expect(result.current.isPasting).toBe(false);
    expect(result.current.copySuccess).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.clipboardContent).toBe('');
    expect(result.current.metrics).toBeNull();
  });

  it('performs copy asynchronously and sets success state', async () => {
    const { result } = renderHook(() => useOptimizedClipboard());
    
    let promise: Promise<boolean>;
    act(() => {
      promise = result.current.copyToClipboard('large simulated payload');
    });

    // InteractionManager runAfterInteractions is mocked to run immediately, 
    // but we have a setTimeout(..., 0) inside it.
    // So isCopying should be true synchronously immediately after calling copy.
    expect(result.current.isCopying).toBe(true);

    // Fast-forward the macro-task (setTimeout 0)
    await act(async () => {
      jest.runAllTimers();
      await promise;
    });

    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('large simulated payload');
    expect(Haptics.impactAsync).toHaveBeenCalled();
    
    expect(result.current.isCopying).toBe(false);
    expect(result.current.copySuccess).toBe(true);
    expect(result.current.error).toBeNull();
    
    // Test the 2-second success toast reset
    act(() => {
      jest.advanceTimersByTime(2000);
    });
    
    expect(result.current.copySuccess).toBe(false);
  });

  it('handles copy failures gracefully', async () => {
    const mockError = new Error('Simulated bridge error');
    (Clipboard.setStringAsync as jest.Mock).mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => useOptimizedClipboard());
    
    let promise: Promise<boolean>;
    act(() => {
      promise = result.current.copyToClipboard('payload');
    });

    await act(async () => {
      jest.runAllTimers();
      await promise;
    });

    expect(result.current.isCopying).toBe(false);
    expect(result.current.copySuccess).toBe(false);
    expect(result.current.error).toEqual(mockError);
  });

  it('performs paste asynchronously and updates clipboard content', async () => {
    const { result } = renderHook(() => useOptimizedClipboard());
    
    let promise: Promise<string>;
    act(() => {
      promise = result.current.pasteFromClipboard();
    });

    expect(result.current.isPasting).toBe(true);

    await act(async () => {
      jest.runAllTimers();
      await promise;
    });

    expect(Clipboard.getStringAsync).toHaveBeenCalled();
    
    expect(result.current.isPasting).toBe(false);
    expect(result.current.clipboardContent).toBe('test pasted text');
    expect(result.current.error).toBeNull();
  });
});
