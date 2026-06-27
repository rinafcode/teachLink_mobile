/**
 * Integration tests for OptimizedVideoPlayer's isVisible prop.
 *
 * These tests verify that the player correctly pauses/resumes and manages the
 * keep-awake lock based on the `isVisible` prop, without exercising actual
 * native video playback.
 */
import { act, render } from '@testing-library/react-native';
import React from 'react';

import OptimizedVideoPlayer from '../../../src/components/VideoPlayer/OptimizedVideoPlayer';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPause = jest.fn();
const mockPlay = jest.fn();
const mockRelease = jest.fn();
const mockAddListener = jest.fn(() => ({ remove: jest.fn() }));

const mockPlayer = {
  pause: mockPause,
  play: mockPlay,
  release: mockRelease,
  addListener: mockAddListener,
  keepScreenOnWhilePlaying: false,
  bufferOptions: {},
};

jest.mock('expo-video', () => ({
  useVideoPlayer: jest.fn((_source: unknown, setup: (p: typeof mockPlayer) => void) => {
    setup(mockPlayer);
    return mockPlayer;
  }),
  VideoView: 'VideoView',
}));

const mockActivateKeepAwake = jest.fn();
const mockDeactivateKeepAwake = jest.fn();

jest.mock('expo-keep-awake', () => ({
  activateKeepAwake: (...args: unknown[]) => mockActivateKeepAwake(...args),
  deactivateKeepAwake: (...args: unknown[]) => mockDeactivateKeepAwake(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderPlayer(props: Partial<React.ComponentProps<typeof OptimizedVideoPlayer>> = {}) {
  return render(<OptimizedVideoPlayer uri="https://example.com/test.mp4" {...props} />);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('OptimizedVideoPlayer — isVisible prop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  describe('default behaviour (isVisible omitted → true)', () => {
    it('activates keep-awake on mount', () => {
      renderPlayer();
      expect(mockActivateKeepAwake).toHaveBeenCalledTimes(1);
    });

    it('does NOT pause the player on mount', () => {
      renderPlayer();
      expect(mockPause).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('isVisible: false on initial render', () => {
    it('deactivates keep-awake instead of activating it', () => {
      renderPlayer({ isVisible: false });
      expect(mockDeactivateKeepAwake).toHaveBeenCalled();
      expect(mockActivateKeepAwake).not.toHaveBeenCalled();
    });

    it('pauses the player', () => {
      renderPlayer({ isVisible: false });
      expect(mockPause).toHaveBeenCalledTimes(1);
    });

    it('does NOT play if autoPlay is set but player is off-screen', () => {
      renderPlayer({ isVisible: false, autoPlay: true });
      // pause should still be called, play should not
      expect(mockPause).toHaveBeenCalled();
      expect(mockPlay).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('isVisible: true → false transition', () => {
    it('pauses player when scrolled off-screen', () => {
      const { rerender } = renderPlayer({ isVisible: true, autoPlay: true });
      jest.clearAllMocks();

      act(() => {
        rerender(
          <OptimizedVideoPlayer uri="https://example.com/test.mp4" isVisible={false} autoPlay />
        );
      });

      expect(mockPause).toHaveBeenCalledTimes(1);
      expect(mockPlay).not.toHaveBeenCalled();
    });

    it('deactivates keep-awake when scrolled off-screen', () => {
      const { rerender } = renderPlayer({ isVisible: true });
      jest.clearAllMocks();

      act(() => {
        rerender(<OptimizedVideoPlayer uri="https://example.com/test.mp4" isVisible={false} />);
      });

      expect(mockDeactivateKeepAwake).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('isVisible: false → true transition', () => {
    it('resumes player when scrolled back on-screen with autoPlay', () => {
      const { rerender } = renderPlayer({ isVisible: false, autoPlay: true });
      jest.clearAllMocks();

      act(() => {
        rerender(<OptimizedVideoPlayer uri="https://example.com/test.mp4" isVisible autoPlay />);
      });

      expect(mockPlay).toHaveBeenCalledTimes(1);
      expect(mockPause).not.toHaveBeenCalled();
    });

    it('does NOT call play when scrolled back on-screen without autoPlay', () => {
      const { rerender } = renderPlayer({ isVisible: false, autoPlay: false });
      jest.clearAllMocks();

      act(() => {
        rerender(
          <OptimizedVideoPlayer
            uri="https://example.com/test.mp4"
            isVisible={true}
            autoPlay={false}
          />
        );
      });

      expect(mockPlay).not.toHaveBeenCalled();
    });

    it('activates keep-awake when scrolled back on-screen', () => {
      const { rerender } = renderPlayer({ isVisible: false });
      jest.clearAllMocks();

      act(() => {
        rerender(<OptimizedVideoPlayer uri="https://example.com/test.mp4" isVisible />);
      });

      expect(mockActivateKeepAwake).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('unmount', () => {
    it('deactivates keep-awake on unmount', () => {
      const { unmount } = renderPlayer({ isVisible: true });
      jest.clearAllMocks();

      unmount();

      expect(mockDeactivateKeepAwake).toHaveBeenCalled();
    });

    it('releases the player on unmount', () => {
      const { unmount } = renderPlayer();
      unmount();
      expect(mockRelease).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  describe('buffering indicator', () => {
    it('renders the buffering indicator initially', () => {
      const { getByTestId } = renderPlayer();
      expect(getByTestId('video-buffering-indicator')).toBeTruthy();
    });
  });
});
