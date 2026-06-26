import { act, render, screen } from '@testing-library/react-native';
import * as ExpoVideo from 'expo-video';

import { OptimizedVideoPlayer } from '../../components/VideoPlayer';

jest.mock('expo-video', () => {
  const statusListeners: {
    eventName: string;
    callback: (...args: any[]) => void;
  }[] = [];

  const player = {
    addListener: jest.fn((eventName: string, callback: (...args: any[]) => void) => {
      statusListeners.push({ eventName, callback });
      return {
        remove: jest.fn(() => {
          const index = statusListeners.findIndex(listener => listener.callback === callback);
          if (index >= 0) {
            statusListeners.splice(index, 1);
          }
        }),
      };
    }),
    release: jest.fn(),
    keepScreenOnWhilePlaying: false,
    bufferOptions: {},
    play: jest.fn(),
  };

  return {
    __esModule: true,
    VideoView: jest.fn(() => null),
    useVideoPlayer: jest.fn(() => player),
    __mockedPlayer: player,
    __statusListeners: statusListeners,
  };
});

jest.mock('expo-keep-awake', () => ({
  activateKeepAwake: jest.fn(),
  deactivateKeepAwake: jest.fn(),
}));

jest.mock('../../components/VideoPlayer/VideoPlayerMetrics', () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

describe('OptimizedVideoPlayer', () => {
  const uri = 'https://example.com/video.mp4';

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<OptimizedVideoPlayer uri={uri} />);
    expect(screen.queryByTestId('video-buffering-indicator')).toBeTruthy();
  });

  it('shows loading indicator initially', () => {
    render(<OptimizedVideoPlayer uri={uri} />);
    expect(screen.getByTestId('video-buffering-indicator')).toBeTruthy();
  });

  it('shows error UI when onError is triggered', () => {
    const onError = jest.fn();
    render(<OptimizedVideoPlayer uri={uri} onError={onError} />);

    const mockedVideo = ExpoVideo as any;
    const listener = mockedVideo.__statusListeners.find((l: any) => l.eventName === 'statusChange');
    act(() => {
      listener.callback({ status: 'error', error: { message: 'Network failure' } });
    });

    expect(onError).toHaveBeenCalledWith('Network failure');
    expect(screen.getByText(/Playback failed/i)).toBeTruthy();
    expect(screen.getByText(/Network failure/i)).toBeTruthy();
  });

  it('calls player.release on unmount', () => {
    const player = (ExpoVideo as any).__mockedPlayer;
    const { unmount } = render(<OptimizedVideoPlayer uri={uri} />);

    player.release.mockClear();
    unmount();
    expect(player.release).toHaveBeenCalledTimes(1);
  });
});
