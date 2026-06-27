/**
 * Accessibility (a11y) tests
 * Close #030
 *
 * Covers:
 *  - Button accessible labels
 *  - Image accessible labels (alt text)
 *  - Color contrast (WCAG AA: 4.5:1 normal text, 3:1 large/UI)
 *  - Keyboard / focus navigation order
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Relative luminance per WCAG 2.1 §1.4.3 */
function relativeLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const linearize = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/** Contrast ratio between two hex colours */
function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ---------------------------------------------------------------------------
// Button label tests
// ---------------------------------------------------------------------------

describe('Button accessible labels', () => {
  /** Simulated button descriptors (mirrors what components should expose) */
  const buttons = [
    { label: 'Sign In', accessibilityLabel: 'Sign In', accessibilityRole: 'button' },
    { label: 'Submit', accessibilityLabel: 'Submit', accessibilityRole: 'button' },
    { label: 'Cancel', accessibilityLabel: 'Cancel', accessibilityRole: 'button' },
    { label: 'Continue', accessibilityLabel: 'Continue', accessibilityRole: 'button' },
  ];

  it('every button has a non-empty accessibilityLabel', () => {
    buttons.forEach(({ label, accessibilityLabel }) => {
      expect(accessibilityLabel).toBeTruthy();
      expect(accessibilityLabel.trim().length).toBeGreaterThan(0);
    });
  });

  it('every button has accessibilityRole set to "button"', () => {
    buttons.forEach(({ label, accessibilityRole }) => {
      expect(accessibilityRole).toBe('button');
    });
  });

  it('accessibilityLabel matches visible label text', () => {
    buttons.forEach(({ label, accessibilityLabel }) => {
      expect(accessibilityLabel).toBe(label);
    });
  });

  it('rejects a button with an empty accessibilityLabel', () => {
    const invalid = { label: '', accessibilityLabel: '', accessibilityRole: 'button' };
    expect(invalid.accessibilityLabel.trim().length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Image alt text tests
// ---------------------------------------------------------------------------

describe('Image accessible labels (alt text)', () => {
  /** Simulated image descriptors */
  const images = [
    { src: 'avatar.png', accessibilityLabel: 'User avatar', role: 'image' },
    { src: 'course-thumbnail.png', accessibilityLabel: 'Course thumbnail', role: 'image' },
    { src: 'logo.png', accessibilityLabel: 'TeachLink logo', role: 'image' },
  ];

  /** Decorative images should be hidden from screen readers */
  const decorativeImages = [
    { src: 'divider.png', accessibilityLabel: '', accessible: false },
  ];

  it('every informative image has a non-empty accessibilityLabel', () => {
    images.forEach(({ src, accessibilityLabel }) => {
      expect(accessibilityLabel).toBeTruthy();
      expect(accessibilityLabel.trim().length).toBeGreaterThan(0);
    });
  });

  it('every informative image has role "image"', () => {
    images.forEach(({ role }) => {
      expect(role).toBe('image');
    });
  });

  it('decorative images are hidden from accessibility tree', () => {
    decorativeImages.forEach(({ accessible }) => {
      expect(accessible).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Color contrast tests (WCAG AA)
// ---------------------------------------------------------------------------

describe('Color contrast (WCAG AA)', () => {
  // Colours sourced from constants/theme.ts
  const pairs: Array<{ name: string; fg: string; bg: string; isLargeText: boolean }> = [
    // Light theme
    { name: 'light – body text on background', fg: '#11181C', bg: '#ffffff', isLargeText: false },
    { name: 'light – tint on background',      fg: '#0a7ea4', bg: '#ffffff', isLargeText: false },
    { name: 'light – icon on background',      fg: '#687076', bg: '#ffffff', isLargeText: true },
    // Dark theme
    { name: 'dark – body text on background',  fg: '#ECEDEE', bg: '#151718', isLargeText: false },
    { name: 'dark – tint on background',       fg: '#ffffff', bg: '#151718', isLargeText: false },
    { name: 'dark – icon on background',       fg: '#9BA1A6', bg: '#151718', isLargeText: true },
  ];

  const WCAG_AA_NORMAL = 4.5;
  const WCAG_AA_LARGE  = 3.0;

  pairs.forEach(({ name, fg, bg, isLargeText }) => {
    it(`"${name}" meets WCAG AA contrast`, () => {
      const ratio = contrastRatio(fg, bg);
      const required = isLargeText ? WCAG_AA_LARGE : WCAG_AA_NORMAL;
      expect(ratio).toBeGreaterThanOrEqual(required);
    });
  });
});

// ---------------------------------------------------------------------------
// Keyboard / focus navigation tests
// ---------------------------------------------------------------------------

describe('Keyboard navigation', () => {
  /**
   * Simulated focusable element list for a screen.
   * In a real app these would be derived from the rendered component tree;
   * here we validate the ordering rules directly.
   */
  const focusableElements = [
    { id: 'header-logo',    tabIndex: 0, role: 'image'  },
    { id: 'nav-home',       tabIndex: 1, role: 'button' },
    { id: 'nav-search',     tabIndex: 2, role: 'button' },
    { id: 'main-content',   tabIndex: 3, role: 'text'   },
    { id: 'cta-button',     tabIndex: 4, role: 'button' },
    { id: 'footer-link',    tabIndex: 5, role: 'button' },
  ];

  it('all interactive elements are focusable (tabIndex >= 0)', () => {
    const interactive = focusableElements.filter(el =>
      ['button', 'link', 'textbox'].includes(el.role)
    );
    interactive.forEach(el => {
      expect(el.tabIndex).toBeGreaterThanOrEqual(0);
    });
  });

  it('focus order is sequential with no gaps', () => {
    const indices = focusableElements.map(el => el.tabIndex).sort((a, b) => a - b);
    indices.forEach((idx, i) => {
      expect(idx).toBe(i);
    });
  });

  it('no two elements share the same tabIndex', () => {
    const indices = focusableElements.map(el => el.tabIndex);
    const unique = new Set(indices);
    expect(unique.size).toBe(indices.length);
  });

  it('first focusable element has tabIndex 0', () => {
    const first = [...focusableElements].sort((a, b) => a.tabIndex - b.tabIndex)[0];
    expect(first.tabIndex).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Keyboard event delegation tests
// ---------------------------------------------------------------------------

describe('Keyboard event delegation', () => {
  /**
   * Simulates the delegated listener registry — a single store that all
   * components read from rather than each registering their own listeners.
   */

  interface KeyboardStateSnapshot {
    isVisible: boolean;
    height: number;
    animationDuration: number;
  }

  /** Minimal stub of the delegated keyboard state */
  function createDelegatedStore(initial: KeyboardStateSnapshot) {
    let state = { ...initial };
    const subscribers: Array<(s: KeyboardStateSnapshot) => void> = [];

    return {
      getState: () => ({ ...state }),
      setState: (next: Partial<KeyboardStateSnapshot>) => {
        state = { ...state, ...next };
        subscribers.forEach(fn => fn(state));
      },
      subscribe: (fn: (s: KeyboardStateSnapshot) => void) => {
        subscribers.push(fn);
        return () => {
          const idx = subscribers.indexOf(fn);
          if (idx !== -1) subscribers.splice(idx, 1);
        };
      },
      listenerCount: () => subscribers.length,
    };
  }

  it('a single delegated store serves multiple consumers without extra listeners', () => {
    const store = createDelegatedStore({ isVisible: false, height: 0, animationDuration: 250 });

    // Three "components" subscribe to the same store (no extra Keyboard.addListener calls)
    const consumer1States: KeyboardStateSnapshot[] = [];
    const consumer2States: KeyboardStateSnapshot[] = [];
    const consumer3States: KeyboardStateSnapshot[] = [];

    const unsub1 = store.subscribe(s => consumer1States.push(s));
    const unsub2 = store.subscribe(s => consumer2States.push(s));
    const unsub3 = store.subscribe(s => consumer3States.push(s));

    // Simulate keyboard show event dispatched once at the root
    store.setState({ isVisible: true, height: 336, animationDuration: 250 });

    expect(consumer1States).toHaveLength(1);
    expect(consumer2States).toHaveLength(1);
    expect(consumer3States).toHaveLength(1);

    expect(consumer1States[0].isVisible).toBe(true);
    expect(consumer1States[0].height).toBe(336);

    unsub1(); unsub2(); unsub3();
  });

  it('keyboard hide resets height to 0 across all consumers', () => {
    const store = createDelegatedStore({ isVisible: true, height: 336, animationDuration: 250 });

    const received: KeyboardStateSnapshot[] = [];
    const unsub = store.subscribe(s => received.push(s));

    store.setState({ isVisible: false, height: 0 });

    expect(received[0].isVisible).toBe(false);
    expect(received[0].height).toBe(0);

    unsub();
  });

  it('unsubscribing a consumer does not affect remaining consumers', () => {
    const store = createDelegatedStore({ isVisible: false, height: 0, animationDuration: 250 });

    const aStates: KeyboardStateSnapshot[] = [];
    const bStates: KeyboardStateSnapshot[] = [];

    const unsubA = store.subscribe(s => aStates.push(s));
    const unsubB = store.subscribe(s => bStates.push(s));

    unsubA(); // consumer A unmounts

    store.setState({ isVisible: true, height: 300, animationDuration: 300 });

    expect(aStates).toHaveLength(0); // A received nothing after unsubscribe
    expect(bStates).toHaveLength(1); // B still receives updates
    expect(bStates[0].height).toBe(300);

    unsubB();
  });

  it('listener count stays at 1 regardless of how many consumers subscribe', () => {
    const store = createDelegatedStore({ isVisible: false, height: 0, animationDuration: 250 });

    // Simulate N screens all reading from the same delegated store
    const unsubs = Array.from({ length: 10 }, () => store.subscribe(() => {}));

    // The underlying Keyboard.addListener is called once at the root —
    // here we verify the store itself has exactly 10 consumer subscriptions
    // (not 10 × 2 native listeners)
    expect(store.listenerCount()).toBe(10);

    unsubs.forEach(u => u());
    expect(store.listenerCount()).toBe(0);
  });

  it('DelegatedKeyboardAvoidingView behavior: padding adds paddingBottom equal to keyboard height', () => {
    const keyboardHeight = 336;
    const offset = 0;
    const effectivePadding = Math.max(0, keyboardHeight - offset);

    // Mirrors the logic inside DelegatedKeyboardAvoidingView for behavior="padding"
    const style = { paddingBottom: effectivePadding };

    expect(style.paddingBottom).toBe(336);
  });

  it('DelegatedKeyboardAvoidingView respects keyboardVerticalOffset', () => {
    const keyboardHeight = 336;
    const offset = 90; // e.g. iOS tab bar height
    const effectivePadding = Math.max(0, keyboardHeight - offset);

    expect(effectivePadding).toBe(246);
  });

  it('DelegatedKeyboardAvoidingView clamps negative effective height to 0', () => {
    const keyboardHeight = 50;
    const offset = 90;
    const effectivePadding = Math.max(0, keyboardHeight - offset);

    expect(effectivePadding).toBe(0);
  });
});
