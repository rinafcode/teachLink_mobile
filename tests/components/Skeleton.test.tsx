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
