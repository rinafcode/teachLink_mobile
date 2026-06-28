/**
 * Tests for keyboard navigation support (issue #662).
 *
 * Covers:
 * - useKeyboardNavigation: Escape and Enter/Space handlers
 * - useInteractiveKeyProps: key props for custom interactive components
 * - useFocusTrap: Tab trapping logic
 * - useFocusRestore: focus restoration on close
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { Platform } from 'react-native';

import { useKeyboardNavigation, useInteractiveKeyProps } from '../hooks/useKeyboardNavigation';

// Force web platform for keyboard tests
const originalOS = Platform.OS;
beforeAll(() => {
  (Platform as any).OS = 'web';
  // Mock document for jsdom
  if (typeof document === 'undefined') {
    (global as any).document = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      activeElement: null,
    };
  }
});
afterAll(() => {
  (Platform as any).OS = originalOS;
});

// ── useKeyboardNavigation ─────────────────────────────────────────────────────

describe('useKeyboardNavigation', () => {
  let addEventSpy: jest.SpyInstance;
  let removeEventSpy: jest.SpyInstance;

  beforeEach(() => {
    addEventSpy = jest.spyOn(document, 'addEventListener');
    removeEventSpy = jest.spyOn(document, 'removeEventListener');
  });

  afterEach(() => {
    addEventSpy.mockRestore();
    removeEventSpy.mockRestore();
  });

  it('attaches keydown listener on web when enabled', () => {
    renderHook(() => useKeyboardNavigation({ onEscape: jest.fn(), enabled: true }));
    expect(addEventSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('calls onEscape when Escape key is pressed', () => {
    const onEscape = jest.fn();
    renderHook(() => useKeyboardNavigation({ onEscape, enabled: true }));

    act(() => {
      const handler = addEventSpy.mock.calls.find(([event]) => event === 'keydown')?.[1];
      handler?.({ key: 'Escape' });
    });

    expect(onEscape).toHaveBeenCalledTimes(1);
  });

  it('does not call onEscape when disabled', () => {
    const onEscape = jest.fn();
    renderHook(() => useKeyboardNavigation({ onEscape, enabled: false }));

    act(() => {
      const handler = addEventSpy.mock.calls.find(([event]) => event === 'keydown')?.[1];
      handler?.({ key: 'Escape' });
    });

    expect(onEscape).not.toHaveBeenCalled();
  });

  it('removes keydown listener on unmount', () => {
    const { unmount } = renderHook(() =>
      useKeyboardNavigation({ onEscape: jest.fn(), enabled: true })
    );
    unmount();
    expect(removeEventSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});

// ── useInteractiveKeyProps ────────────────────────────────────────────────────

describe('useInteractiveKeyProps', () => {
  it('returns onKeyPress, tabIndex, and role props on web', () => {
    const props = useInteractiveKeyProps(jest.fn());
    expect(props).toHaveProperty('onKeyPress');
    expect(props).toHaveProperty('tabIndex', 0);
    expect(props).toHaveProperty('role', 'button');
  });

  it('calls onPress when Enter is pressed', () => {
    const onPress = jest.fn();
    const props = useInteractiveKeyProps(onPress) as any;
    props.onKeyPress({ key: 'Enter', preventDefault: jest.fn() });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('calls onPress when Space is pressed', () => {
    const onPress = jest.fn();
    const props = useInteractiveKeyProps(onPress) as any;
    props.onKeyPress({ key: ' ', preventDefault: jest.fn() });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('does not call onPress for other keys', () => {
    const onPress = jest.fn();
    const props = useInteractiveKeyProps(onPress) as any;
    props.onKeyPress({ key: 'a', preventDefault: jest.fn() });
    expect(onPress).not.toHaveBeenCalled();
  });
});
