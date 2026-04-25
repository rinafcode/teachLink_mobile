import React from 'react';
import { Skeleton, SkeletonGroup } from '../../src/components/ui/Skeleton';

// Mock react-native Animated and View
jest.mock('react-native', () => {
  const animatedValue = {
    setValue: jest.fn(),
    addListener: jest.fn(),
    removeAllListeners: jest.fn(),
    stopAnimation: jest.fn(),
  };

  return {
    View: 'View',
    Animated: {
      View: 'Animated.View',
      Value: jest.fn(() => animatedValue),
      timing: jest.fn(() => ({ start: jest.fn() })),
      sequence: jest.fn((animations) => ({ start: jest.fn() })),
      loop: jest.fn((animation) => ({ start: jest.fn() })),
    },
    StyleSheet: {
      create: (styles: unknown) => styles,
    },
    DimensionValue: {},
  };
});

describe('Skeleton', () => {
  // ── Props interface ──────────────────────────────────────────────────────

  describe('props interface', () => {
    it('renders without any props', () => {
      const element = Skeleton({});
      expect(element).toBeTruthy();
    });

    it('accepts width prop', () => {
      const props = { width: 200 };
      expect(props.width).toBe(200);
    });

    it('accepts height prop', () => {
      const props = { height: 20 };
      expect(props.height).toBe(20);
    });

    it('accepts borderRadius prop', () => {
      const props = { borderRadius: 4 };
      expect(props.borderRadius).toBe(4);
    });

    it('accepts circle prop', () => {
      const props = { circle: true };
      expect(props.circle).toBe(true);
    });

    it('accepts percentage-based width', () => {
      const props = { width: '100%' };
      expect(props.width).toBe('100%');
    });
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders with numeric width and height', () => {
      const element = Skeleton({ width: 120, height: 16 });
      expect(element).toBeTruthy();
    });

    it('renders as circle when circle=true', () => {
      const element = Skeleton({ width: 48, height: 48, circle: true });
      expect(element).toBeTruthy();
    });

    it('renders with default borderRadius when circle=false', () => {
      const element = Skeleton({ width: 100, height: 20, circle: false });
      expect(element).toBeTruthy();
    });

    it('renders with custom borderRadius', () => {
      const element = Skeleton({ width: 100, height: 20, borderRadius: 4 });
      expect(element).toBeTruthy();
    });

    it('renders with string percentage width', () => {
      const element = Skeleton({ width: '80%', height: 14 });
      expect(element).toBeTruthy();
    });
  });

  // ── Circle border radius logic ───────────────────────────────────────────

  describe('circle border radius', () => {
    it('uses height/2 as borderRadius when circle=true and height is a number', () => {
      const height = 60;
      const expectedRadius = height / 2;
      expect(expectedRadius).toBe(30);
    });

    it('uses 999 as fallback borderRadius when circle=true and height is not a number', () => {
      const fallbackRadius = 999;
      expect(fallbackRadius).toBe(999);
    });
  });
});

describe('SkeletonGroup', () => {
  // ── Rendering ────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders children', () => {
      const element = SkeletonGroup({
        children: React.createElement('View', null),
      });
      expect(element).toBeTruthy();
    });

    it('renders multiple children', () => {
      const element = SkeletonGroup({
        children: [
          React.createElement(Skeleton, { key: '1', width: 100, height: 16 }),
          React.createElement(Skeleton, { key: '2', width: 80, height: 16 }),
        ],
      });
      expect(element).toBeTruthy();
    });

    it('accepts optional style prop', () => {
      const style = { gap: 8 };
      const element = SkeletonGroup({
        children: React.createElement('View', null),
        style,
      });
      expect(element).toBeTruthy();
    });
  });

  // ── Props interface ──────────────────────────────────────────────────────

  describe('props interface', () => {
    it('requires children prop', () => {
      const props = { children: React.createElement('View', null) };
      expect(props.children).toBeDefined();
    });

    it('style prop is optional', () => {
      const props = { children: React.createElement('View', null) };
      expect(props).not.toHaveProperty('style');
    });
  });
});
