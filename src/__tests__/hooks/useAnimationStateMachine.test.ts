import { act, renderHook } from '@testing-library/react-native';
import { useAnimationStateMachine } from '../../hooks/useAnimationStateMachine';

describe('useAnimationStateMachine', () => {
  it('starts CLOSED by default', () => {
    const { result } = renderHook(() => useAnimationStateMachine());
    expect(result.current.animState).toBe('CLOSED');
    expect(result.current.isVisible).toBe(false);
  });

  it('CLOSED → OPEN transitions to OPENING', () => {
    const { result } = renderHook(() => useAnimationStateMachine());
    act(() => result.current.send('OPEN'));
    expect(result.current.animState).toBe('OPENING');
    expect(result.current.isVisible).toBe(true);
  });

  it('OPENING → ANIMATION_DONE transitions to OPEN', () => {
    const { result } = renderHook(() => useAnimationStateMachine());
    act(() => result.current.send('OPEN'));
    act(() => result.current.send('ANIMATION_DONE'));
    expect(result.current.animState).toBe('OPEN');
  });

  it('OPEN → CLOSE transitions to CLOSING', () => {
    const { result } = renderHook(() => useAnimationStateMachine());
    act(() => result.current.send('OPEN'));
    act(() => result.current.send('ANIMATION_DONE'));
    act(() => result.current.send('CLOSE'));
    expect(result.current.animState).toBe('CLOSING');
  });

  it('CLOSING → ANIMATION_DONE transitions to CLOSED', () => {
    const { result } = renderHook(() => useAnimationStateMachine());
    act(() => result.current.send('OPEN'));
    act(() => result.current.send('ANIMATION_DONE'));
    act(() => result.current.send('CLOSE'));
    act(() => result.current.send('ANIMATION_DONE'));
    expect(result.current.animState).toBe('CLOSED');
    expect(result.current.isVisible).toBe(false);
  });

  it('CLOSING → OPEN interrupts back to OPENING (race condition prevention)', () => {
    const { result } = renderHook(() => useAnimationStateMachine());
    act(() => result.current.send('OPEN'));
    act(() => result.current.send('ANIMATION_DONE'));
    act(() => result.current.send('CLOSE'));
    // Re-open while closing — must not get stuck
    act(() => result.current.send('OPEN'));
    expect(result.current.animState).toBe('OPENING');
  });

  it('ignores illegal transitions (CLOSED → CLOSE is a no-op)', () => {
    const { result } = renderHook(() => useAnimationStateMachine());
    act(() => result.current.send('CLOSE'));
    expect(result.current.animState).toBe('CLOSED');
  });

  it('ignores illegal transitions (OPEN → OPEN is a no-op)', () => {
    const { result } = renderHook(() => useAnimationStateMachine());
    act(() => result.current.send('OPEN'));
    act(() => result.current.send('ANIMATION_DONE'));
    act(() => result.current.send('OPEN'));
    expect(result.current.animState).toBe('OPEN');
  });

  it('accepts a custom initial state', () => {
    const { result } = renderHook(() => useAnimationStateMachine('OPEN'));
    expect(result.current.animState).toBe('OPEN');
    expect(result.current.isVisible).toBe(true);
  });
});
