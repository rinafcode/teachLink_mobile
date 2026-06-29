import { act, renderHook } from '@testing-library/react-native';
import { modalStackManager, useModalStack } from '../../components/common/ModalStackManager';

describe('ModalStackManager & useModalStack', () => {
  beforeEach(() => {
    // Reset manager stack state before each test
    modalStackManager.clear();
  });

  describe('ModalStackManager Class (Core Stacking Logic)', () => {
    it('should correctly push and pop modals', () => {
      expect(modalStackManager.getStack()).toEqual([]);

      modalStackManager.push('modal-1');
      expect(modalStackManager.getStack()).toEqual(['modal-1']);

      modalStackManager.push('modal-2');
      expect(modalStackManager.getStack()).toEqual(['modal-1', 'modal-2']);

      modalStackManager.pop('modal-1');
      expect(modalStackManager.getStack()).toEqual(['modal-2']);

      modalStackManager.pop('modal-2');
      expect(modalStackManager.getStack()).toEqual([]);
    });

    it('should auto-assign correct z-index values', () => {
      // Base z-index is 10000, step is 10
      expect(modalStackManager.getZIndex('unregistered')).toBe(10000);

      modalStackManager.push('modal-1');
      expect(modalStackManager.getZIndex('modal-1')).toBe(10000);

      modalStackManager.push('modal-2');
      expect(modalStackManager.getZIndex('modal-1')).toBe(10000);
      expect(modalStackManager.getZIndex('modal-2')).toBe(10010);

      modalStackManager.push('modal-3');
      expect(modalStackManager.getZIndex('modal-3')).toBe(10020);
    });

    it('should correctly identify the top-most modal', () => {
      expect(modalStackManager.isTop('modal-1')).toBe(false);

      modalStackManager.push('modal-1');
      expect(modalStackManager.isTop('modal-1')).toBe(true);

      modalStackManager.push('modal-2');
      expect(modalStackManager.isTop('modal-1')).toBe(false);
      expect(modalStackManager.isTop('modal-2')).toBe(true);
    });

    it('should handle duplicate push operations by moving the item to the top', () => {
      modalStackManager.push('modal-1');
      modalStackManager.push('modal-2');
      modalStackManager.push('modal-3');
      expect(modalStackManager.getStack()).toEqual(['modal-1', 'modal-2', 'modal-3']);

      // Pushing existing 'modal-1' should move it to the top
      modalStackManager.push('modal-1');
      expect(modalStackManager.getStack()).toEqual(['modal-2', 'modal-3', 'modal-1']);
      expect(modalStackManager.isTop('modal-1')).toBe(true);
      expect(modalStackManager.getZIndex('modal-1')).toBe(10020);
      expect(modalStackManager.getZIndex('modal-2')).toBe(10000);
    });
  });

  describe('useModalStack Hook', () => {
    it('should register modal when visible and unregister on unmount', () => {
      const { result, unmount } = renderHook(({ visible }) => useModalStack('hook-modal', visible), {
        initialProps: { visible: true },
      });

      expect(result.current.zIndex).toBe(10000);
      expect(result.current.isTop).toBe(true);
      expect(modalStackManager.getStack()).toEqual(['hook-modal']);

      unmount();
      expect(modalStackManager.getStack()).toEqual([]);
    });

    it('should reactively update when visibility changes', () => {
      const { result, rerender } = renderHook(({ visible }) => useModalStack('hook-modal', visible), {
        initialProps: { visible: false },
      });

      expect(result.current.isTop).toBe(false);
      expect(modalStackManager.getStack()).toEqual([]);

      rerender({ visible: true });
      expect(result.current.zIndex).toBe(10000);
      expect(result.current.isTop).toBe(true);
      expect(modalStackManager.getStack()).toEqual(['hook-modal']);

      rerender({ visible: false });
      expect(result.current.isTop).toBe(false);
      expect(modalStackManager.getStack()).toEqual([]);
    });

    it('should assign and update z-index and isTop for multiple stacked modals', () => {
      const { result: modal1 } = renderHook(({ visible }) => useModalStack('modal-a', visible), {
        initialProps: { visible: true },
      });

      expect(modal1.current.zIndex).toBe(10000);
      expect(modal1.current.isTop).toBe(true);

      // Now open modal B
      const { result: modal2, unmount: unmountB } = renderHook(({ visible }) => useModalStack('modal-b', visible), {
        initialProps: { visible: true },
      });

      // Modal B should be top
      expect(modal2.current.zIndex).toBe(10010);
      expect(modal2.current.isTop).toBe(true);

      // Modal A should no longer be top
      expect(modal1.current.zIndex).toBe(10000);
      expect(modal1.current.isTop).toBe(false);

      // Close modal B
      act(() => {
        unmountB();
      });

      // Modal A should become top again
      expect(modal1.current.zIndex).toBe(10000);
      expect(modal1.current.isTop).toBe(true);
    });
  });
});
