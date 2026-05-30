import React from 'react';
import { render, RenderAPI } from '@testing-library/react-native';
import { Skeleton, SkeletonGroup } from '../../src/components/ui/Skeleton';

describe('Skeleton', () => {
  const renderSkeleton = (props?: any): RenderAPI => render(<Skeleton {...props} />);

  // ── Props interface ──────────────────────────────────────────────────────

  describe('props interface', () => {
    it('renders without any props', () => {
      const { toJSON } = renderSkeleton();
      const json = JSON.stringify(toJSON());
      expect(json).toBeTruthy();
    });

    it('accepts width and height as numbers', () => {
      const { toJSON } = renderSkeleton({ width: 100, height: 50 });
      const json = JSON.stringify(toJSON());
      expect(json).toContain('100');
      expect(json).toContain('50');
    });

    it('accepts width and height as percentages', () => {
      const { toJSON } = renderSkeleton({ width: '50%', height: '100%' });
      const json = JSON.stringify(toJSON());
      expect(json).toContain('50%');
      expect(json).toContain('100%');
    });

    it('accepts borderRadius prop', () => {
      const { toJSON } = renderSkeleton({ borderRadius: 20 });
      const json = JSON.stringify(toJSON());
      expect(json).toContain('20');
    });

    it('accepts custom style prop', () => {
      const { toJSON } = renderSkeleton({ style: { marginTop: 10 } });
      const json = JSON.stringify(toJSON());
      expect(json).toContain('10');
    });
  });

  // ── Circle variant ────────────────────────────────────────────────────────

  describe('circle variant', () => {
    it('renders as circle when circle=true', () => {
      const { toJSON } = renderSkeleton({ circle: true, width: 40, height: 40 });
      const json = JSON.stringify(toJSON());
      // borderRadius should be half of height when circle
      expect(json).toContain('20');
    });

    it('calculates circle borderRadius from height when height is number', () => {
      const { toJSON } = renderSkeleton({ circle: true, height: 60 });
      const json = JSON.stringify(toJSON());
      expect(json).toContain('30');
    });

    it('uses large borderRadius fallback when height is not a number', () => {
      const { toJSON } = renderSkeleton({ circle: true, height: '100%', width: '100%' });
      const json = JSON.stringify(toJSON());
      // fallback is 999
      expect(json).toContain('999');
    });
  });

  // ── Rendering ─────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders as Animated.View', () => {
      const { toJSON } = renderSkeleton();
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Animated.View');
    });

    it('renders with numeric width and height', () => {
      const { toJSON } = renderSkeleton({ width: 120, height: 80 });
      const json = JSON.stringify(toJSON());
      expect(json).toContain('120');
      expect(json).toContain('80');
    });

    it('renders with string percentage width', () => {
      const { toJSON } = renderSkeleton({ width: '75%', height: 50 });
      const json = JSON.stringify(toJSON());
      expect(json).toContain('75%');
      expect(json).toContain('50');
    });

    it('renders with custom borderRadius', () => {
      const { toJSON } = renderSkeleton({ borderRadius: 16 });
      const json = JSON.stringify(toJSON());
      expect(json).toContain('16');
    });

    it('applies custom style overrides', () => {
      const { toJSON } = renderSkeleton({ style: { backgroundColor: 'red' } });
      const json = JSON.stringify(toJSON());
      expect(json).toContain('red');
    });
  });

  // ── SkeletonGroup ─────────────────────────────────────────────────────────

  describe('SkeletonGroup', () => {
    it('renders children inside a View', () => {
      const { toJSON } = render(
        <SkeletonGroup>
          <Skeleton />
          <Skeleton />
        </SkeletonGroup>
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('View');
      expect(json).toContain('Animated.View');
    });
  });
});

// ── AppState lifecycle ────────────────────────────────────────────────────────

import { AppState } from 'react-native';

describe('Skeleton — AppState animation lifecycle', () => {
  // Grab the mocked Animated internals provided by jest.setup.js
  const { Animated: MockAnimated } = require('react-native');

  let stopMock: jest.Mock;
  let loopInstance: { start: jest.Mock; stop: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    // Each Animated.loop() call returns a fresh controllable handle
    stopMock = jest.fn();
    loopInstance = { start: jest.fn(), stop: stopMock };
    MockAnimated.loop.mockReturnValue(loopInstance);
  });

  it('starts the animation on mount', () => {
    render(<Skeleton />);
    expect(MockAnimated.loop).toHaveBeenCalled();
    expect(loopInstance.start).toHaveBeenCalled();
  });

  it('stops the animation when the app goes to background', () => {
    render(<Skeleton />);

    // Simulate AppState → background
    const [[, handler]] = (AppState.addEventListener as jest.Mock).mock.calls;
    handler('background');

    expect(stopMock).toHaveBeenCalled();
  });

  it('stops the animation when the app becomes inactive', () => {
    render(<Skeleton />);

    const [[, handler]] = (AppState.addEventListener as jest.Mock).mock.calls;
    handler('inactive');

    expect(stopMock).toHaveBeenCalled();
  });

  it('restarts the animation when the app returns to the foreground', () => {
    render(<Skeleton />);
    const callsBefore = MockAnimated.loop.mock.calls.length;

    const [[, handler]] = (AppState.addEventListener as jest.Mock).mock.calls;
    handler('background');
    handler('active');

    // A new loop should have been created when returning to active
    expect(MockAnimated.loop.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(loopInstance.start).toHaveBeenCalledTimes(2); // mount + foreground
  });

  it('stops the animation and removes the AppState listener on unmount', () => {
    const mockRemove = jest.fn();
    (AppState.addEventListener as jest.Mock).mockReturnValue({ remove: mockRemove });

    const { unmount } = render(<Skeleton />);
    unmount();

    expect(stopMock).toHaveBeenCalled();
    expect(mockRemove).toHaveBeenCalled();
  });
});

