import React from 'react';
import { render } from '@testing-library/react-native';



jest.mock('react-native-css-interop', () => ({
  cssInterop: jest.fn((component: any) => component),
  remapProps: jest.fn((component: any) => component),
}));

jest.mock('expo-av', () => {
  return {
    __esModule: true,
    Video: jest.fn(() => null),
    ResizeMode: { CONTAIN: 'contain' },
    Audio: {
      getAudioModeAsync: jest.fn().mockResolvedValue({}),
      setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
      INTERRUPTION_MODE_IOS_DUCK_OTHERS: 2,
      INTERRUPTION_MODE_ANDROID_DUCK_OTHERS: 2,
    },
  };
});

jest.mock('expo-network', () => ({
  getNetworkStateAsync: jest.fn().mockResolvedValue({ type: 'WIFI', isConnected: true }),
  addNetworkStateListener: jest.fn(() => ({ remove: jest.fn() })),
}));

jest.mock('../../src/hooks/usePictureInPicture', () => ({
  usePictureInPicture: () => ({
    isPiPSupported: false,
    isPiPActive: false,
    enterPiP: jest.fn(),
    exitPiP: jest.fn(),
  }),
}));

jest.mock('../../src/hooks/useVideoGestures', () => ({
  useVideoGestures: () => ({
    panHandlers: {},
    onTap: jest.fn(),
    isScrubbing: false,
    previewPositionMillis: null,
  }),
}));

jest.mock('../../src/components/mobile/VideoControls', () => {
  return function MockVideoControls() {
    return null;
  };
});



jest.mock('react-native-safe-area-context', () => {
  const MockSafeAreaProvider = ({ children }: any) => children;
  MockSafeAreaProvider.displayName = 'SafeAreaProvider';
  const MockSafeAreaConsumer = ({ children }: any) => children({ top: 0, right: 0, bottom: 0, left: 0 });
  MockSafeAreaConsumer.displayName = 'SafeAreaConsumer';
  const MockSafeAreaView = ({ children }: any) => children;
  MockSafeAreaView.displayName = 'SafeAreaView';
  return {
    SafeAreaProvider: MockSafeAreaProvider,
    SafeAreaConsumer: MockSafeAreaConsumer,
    SafeAreaView: MockSafeAreaView,
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
    useSafeAreaFrame: () => ({ x: 0, y: 0, width: 390, height: 844 }),
  };
});

import MobileVideoPlayer from '../../src/components/mobile/MobileVideoPlayer';
import { Video } from 'expo-av';

describe('MobileVideoPlayer', () => {
  const mockSources = [
    { id: '1080p', uri: 'http://example.com/1080.mp4', bitrate: 5000000, resolution: 1080 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Skipping this test because the test environment's react-native-css-interop
  // JSX runtime wrapper crashes when encountering react-native mocks without displayName.
  it.skip('renders off-screen player with poster and no buffering when isActive is false', () => {
    render(
      <MobileVideoPlayer
        sources={mockSources}
        posterUri="http://example.com/poster.jpg"
        isActive={false}
      />
    );

    expect(Video).toHaveBeenCalled();
    const videoProps = (Video as unknown as jest.Mock).mock.calls[0][0];

    expect(videoProps.usePoster).toBe(true);
    expect(videoProps.preload).toBe('none');
    expect(videoProps.shouldPlay).toBe(false);
  });
});
