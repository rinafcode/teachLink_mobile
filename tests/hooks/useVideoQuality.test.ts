import { act, renderHook } from '@testing-library/react-native';
import * as Network from 'expo-network';

import { useVideoQuality } from '../../src/hooks/useVideoQuality';
import { AUTO_QUALITY_ID } from '../../src/services/videoQuality';

import type { VideoSource } from '../../src/services/videoQuality';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOW: VideoSource = {
  uri: 'https://cdn.example.com/360p.mp4',
  label: '360p',
  bitrateKbps: 400,
};
const MID: VideoSource = {
  uri: 'https://cdn.example.com/720p.mp4',
  label: '720p',
  bitrateKbps: 1200,
};
const HIGH: VideoSource = {
  uri: 'https://cdn.example.com/1080p.mp4',
  label: '1080p',
  bitrateKbps: 4000,
};
const HLS: VideoSource = { uri: 'https://cdn.example.com/stream.m3u8', label: 'Adaptive' };

const mockGetNetworkState = Network.getNetworkStateAsync as jest.Mock;
const mockAddListener = Network.addNetworkStateListener as jest.Mock;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useVideoQuality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetNetworkState.mockResolvedValue({ type: 'WIFI', isConnected: true });
    mockAddListener.mockReturnValue({ remove: jest.fn() });
  });

  it('returns AUTO_QUALITY_ID as the default selected quality', () => {
    const { result } = renderHook(() => useVideoQuality({ sources: [LOW, MID] }));
    expect(result.current.selectedQualityId).toBe(AUTO_QUALITY_ID);
  });

  it('uses initialQualityId when provided', () => {
    const { result } = renderHook(() =>
      useVideoQuality({ sources: [LOW, MID], initialQualityId: '720p' })
    );
    expect(result.current.selectedQualityId).toBe('720p');
  });

  it('normalizes sources and exposes them', () => {
    const { result } = renderHook(() => useVideoQuality({ sources: [LOW, MID] }));
    expect(result.current.normalizedSources).toHaveLength(2);
    expect(result.current.normalizedSources[0].id).toBe('360p');
  });

  it('includes Auto as the first quality option', () => {
    const { result } = renderHook(() => useVideoQuality({ sources: [LOW] }));
    expect(result.current.qualityOptions[0].id).toBe(AUTO_QUALITY_ID);
  });

  it('detects wifi network type from expo-network', async () => {
    mockGetNetworkState.mockResolvedValue({ type: 'WIFI' });
    const { result } = renderHook(() => useVideoQuality({ sources: [LOW, MID, HIGH] }));
    await act(async () => {});
    expect(result.current.networkType).toBe('wifi');
  });

  it('detects cellular network type from expo-network', async () => {
    mockGetNetworkState.mockResolvedValue({ type: 'CELLULAR' });
    const { result } = renderHook(() => useVideoQuality({ sources: [LOW, MID, HIGH] }));
    await act(async () => {});
    expect(result.current.networkType).toBe('cellular');
  });

  it('detects slow-cellular when isSlowConnection is true on cellular', async () => {
    mockGetNetworkState.mockResolvedValue({ type: 'CELLULAR' });
    const { result } = renderHook(() =>
      useVideoQuality({ sources: [LOW, MID, HIGH], isSlowConnection: true })
    );
    await act(async () => {});
    expect(result.current.networkType).toBe('slow-cellular');
  });

  it('selects highest quality source on wifi (auto mode)', async () => {
    mockGetNetworkState.mockResolvedValue({ type: 'WIFI' });
    const { result } = renderHook(() => useVideoQuality({ sources: [LOW, MID, HIGH] }));
    await act(async () => {});
    expect(result.current.activeSource?.label).toBe('1080p');
  });

  it('caps source at 1500 kbps on cellular (auto mode)', async () => {
    mockGetNetworkState.mockResolvedValue({ type: 'CELLULAR' });
    const { result } = renderHook(() => useVideoQuality({ sources: [LOW, MID, HIGH] }));
    await act(async () => {});
    // MID is 1200 kbps — highest within 1500 kbps cap
    expect(result.current.activeSource?.label).toBe('720p');
  });

  it('caps source at 400 kbps on slow-cellular (auto mode)', async () => {
    mockGetNetworkState.mockResolvedValue({ type: 'CELLULAR' });
    const { result } = renderHook(() =>
      useVideoQuality({ sources: [LOW, MID, HIGH], isSlowConnection: true })
    );
    await act(async () => {});
    expect(result.current.activeSource?.label).toBe('360p');
  });

  it('prefers adaptive (HLS) source over bitrate selection', async () => {
    mockGetNetworkState.mockResolvedValue({ type: 'CELLULAR' });
    const { result } = renderHook(() => useVideoQuality({ sources: [LOW, HLS, HIGH] }));
    await act(async () => {});
    expect(result.current.activeSource?.isAdaptive).toBe(true);
  });

  it('respects manual quality selection over auto', async () => {
    mockGetNetworkState.mockResolvedValue({ type: 'WIFI' });
    const { result } = renderHook(() => useVideoQuality({ sources: [LOW, MID, HIGH] }));
    await act(async () => {});

    act(() => {
      result.current.setSelectedQualityId('360p');
    });

    expect(result.current.selectedQualityId).toBe('360p');
    expect(result.current.activeSource?.label).toBe('360p');
  });

  it('resets to AUTO_QUALITY_ID when selected quality is no longer in options', async () => {
    const { result, rerender } = renderHook(({ sources }) => useVideoQuality({ sources }), {
      initialProps: { sources: [LOW, MID] },
    });
    await act(async () => {});

    act(() => {
      result.current.setSelectedQualityId('720p');
    });
    expect(result.current.selectedQualityId).toBe('720p');

    // Remove the 720p source
    rerender({ sources: [LOW] });
    expect(result.current.selectedQualityId).toBe(AUTO_QUALITY_ID);
  });

  it('re-runs network detection when isSlowConnection changes', async () => {
    mockGetNetworkState.mockResolvedValue({ type: 'CELLULAR' });
    const { result, rerender } = renderHook(
      ({ isSlowConnection }) => useVideoQuality({ sources: [LOW, MID, HIGH], isSlowConnection }),
      { initialProps: { isSlowConnection: false } }
    );
    await act(async () => {});
    expect(result.current.networkType).toBe('cellular');

    rerender({ isSlowConnection: true });
    await act(async () => {});
    expect(result.current.networkType).toBe('slow-cellular');
  });

  it('removes the network listener on unmount', async () => {
    const remove = jest.fn();
    mockAddListener.mockReturnValue({ remove });
    const { unmount } = renderHook(() => useVideoQuality({ sources: [LOW] }));
    await act(async () => {});
    unmount();
    expect(remove).toHaveBeenCalled();
  });

  it('returns null activeSource when sources array is empty', async () => {
    const { result } = renderHook(() => useVideoQuality({ sources: [] }));
    await act(async () => {});
    expect(result.current.activeSource).toBeNull();
  });
});
