import { renderHook } from '@testing-library/react-native';

import { useFocusRestore } from '../../src/hooks/useFocusRestore';
import { useFocusTrap } from '../../src/hooks/useFocusTrap';

describe('Focus Management Hooks', () => {
  describe('useFocusRestore', () => {
    it("initializes correctly and doesn't throw", () => {
      const { result } = renderHook(() => useFocusRestore(false));
      expect(result).toBeDefined();
    });

    it('captures and restores focus when active toggles', () => {
      const mockFocus = jest.fn();
      const mockRef = {
        current: {
          focus: mockFocus,
        },
      };

      const { rerender } = renderHook(({ active, ref }) => useFocusRestore(active, ref), {
        initialProps: { active: false, ref: mockRef },
      });

      // Toggle active to true (simulate modal opening)
      rerender({ active: true, ref: mockRef });
      expect(mockFocus).not.toHaveBeenCalled();

      // Toggle active to false (simulate modal closing)
      rerender({ active: false, ref: mockRef });
      expect(mockFocus).toHaveBeenCalled();
    });
  });

  describe('useFocusTrap', () => {
    it('returns proper accessibility properties', () => {
      const containerRef = { current: {} };
      const { result } = renderHook(() => useFocusTrap(containerRef, true));

      expect(result.current.containerProps).toEqual({
        accessible: true,
        accessibilityViewIsModal: true,
        'aria-modal': 'true',
      });

      expect(result.current.backgroundProps).toEqual({
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
      });
    });

    it('returns default background properties when inactive', () => {
      const containerRef = { current: {} };
      const { result } = renderHook(() => useFocusTrap(containerRef, false));

      expect(result.current.containerProps).toEqual({
        accessible: true,
        accessibilityViewIsModal: false,
        'aria-modal': undefined,
      });

      expect(result.current.backgroundProps).toEqual({
        accessibilityElementsHidden: false,
        importantForAccessibility: 'auto',
      });
    });
  });
});
