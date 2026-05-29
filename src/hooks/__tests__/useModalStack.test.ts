import { act, renderHook } from '@testing-library/react-native';
import { useModalStack } from '../useModalStack';

describe('useModalStack', () => {
  it('should assign correct zIndex for a single modal', () => {
    const { result } = renderHook(() => useModalStack(true, 'modal-1'));

    expect(result.current.zIndex).toBe(1000);
    expect(result.current.isTopModal).toBe(true);
  });

  it('should assign increasing zIndex for multiple active modals', () => {
    const { result: hook1 } = renderHook(() => useModalStack(true, 'modal-1'));
    const { result: hook2 } = renderHook(() => useModalStack(true, 'modal-2'));

    expect(hook1.current.zIndex).toBe(1000);
    expect(hook1.current.isTopModal).toBe(false);

    expect(hook2.current.zIndex).toBe(1010);
    expect(hook2.current.isTopModal).toBe(true);
  });

  it('should decrease zIndex when a modal is closed', () => {
    const { result: hook1 } = renderHook(({ visible }) => useModalStack(visible, 'modal-1'), {
      initialProps: { visible: true },
    });
    const { result: hook2 } = renderHook(() => useModalStack(true, 'modal-2'));

    expect(hook2.current.zIndex).toBe(1010);

    // Close the first modal
    act(() => {
      hook1.rerender({ visible: false });
    });

    // Since hook1 is closed, modal-2 is now the only one in the stack.
    // Its zIndex updates to the first position.
    expect(hook2.current.zIndex).toBe(1000);
    expect(hook2.current.isTopModal).toBe(true);
  });
});
