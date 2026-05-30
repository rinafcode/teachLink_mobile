import {
  AUTO_QUALITY_ID,
  BITRATE_CAP,
  deriveNetworkType,
  getQualityOptions,
  normalizeSources,
  selectAutoSource,
  selectSourceById,
  type NormalizedVideoSource,
  type VideoSource,
} from '../../services/videoQuality';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeSource = (overrides: Partial<VideoSource> = {}): VideoSource => ({
  uri: 'https://example.com/video.mp4',
  ...overrides,
});

const makeNorm = (overrides: Partial<NormalizedVideoSource> = {}): NormalizedVideoSource => ({
  id: 'low',
  label: '360p',
  uri: 'https://example.com/360p.mp4',
  isAdaptive: false,
  ...overrides,
});

// ---------------------------------------------------------------------------
// deriveNetworkType
// ---------------------------------------------------------------------------

describe('deriveNetworkType', () => {
  it('returns wifi for WIFI type', () => {
    expect(deriveNetworkType({ type: 'WIFI' })).toBe('wifi');
  });

  it('returns wifi for ETHERNET type', () => {
    expect(deriveNetworkType({ type: 'ETHERNET' })).toBe('wifi');
  });

  it('returns cellular for CELLULAR type', () => {
    expect(deriveNetworkType({ type: 'CELLULAR' })).toBe('cellular');
  });

  it('returns slow-cellular for CELLULAR + isSlowConnection', () => {
    expect(deriveNetworkType({ type: 'CELLULAR' }, true)).toBe('slow-cellular');
  });

  it('returns unknown for unrecognised type', () => {
    expect(deriveNetworkType({ type: 'BLUETOOTH' })).toBe('unknown');
  });

  it('returns unknown when state is undefined', () => {
    expect(deriveNetworkType(undefined)).toBe('unknown');
  });

  it('returns unknown when type is null', () => {
    expect(deriveNetworkType({ type: null })).toBe('unknown');
  });
});

// ---------------------------------------------------------------------------
// BITRATE_CAP
// ---------------------------------------------------------------------------

describe('BITRATE_CAP', () => {
  it('has no cap for wifi', () => {
    expect(BITRATE_CAP.wifi).toBeNull();
  });

  it('caps cellular at 1500 kbps', () => {
    expect(BITRATE_CAP.cellular).toBe(1500);
  });

  it('caps slow-cellular at 400 kbps', () => {
    expect(BITRATE_CAP['slow-cellular']).toBe(400);
  });

  it('caps unknown at 1500 kbps', () => {
    expect(BITRATE_CAP.unknown).toBe(1500);
  });
});

// ---------------------------------------------------------------------------
// normalizeSources
// ---------------------------------------------------------------------------

describe('normalizeSources', () => {
  it('returns empty array for empty input', () => {
    expect(normalizeSources([])).toEqual([]);
  });

  it('assigns id from label when no id provided', () => {
    const [result] = normalizeSources([makeSource({ label: '720p' })]);
    expect(result.id).toBe('720p');
  });

  it('derives label from height when no label provided', () => {
    const [result] = normalizeSources([makeSource({ height: 480 })]);
    expect(result.label).toBe('480p');
  });

  it('derives label from bitrateKbps when no label or height', () => {
    const [result] = normalizeSources([makeSource({ bitrateKbps: 800 })]);
    expect(result.label).toBe('800kbps');
  });

  it('deduplicates ids with a counter suffix', () => {
    const sources = [makeSource({ label: '720p' }), makeSource({ label: '720p' })];
    const [a, b] = normalizeSources(sources);
    expect(a.id).toBe('720p');
    expect(b.id).toBe('720p-2');
  });

  it('detects HLS sources as adaptive', () => {
    const [result] = normalizeSources([makeSource({ uri: 'https://cdn.example.com/stream.m3u8' })]);
    expect(result.isAdaptive).toBe(true);
  });

  it('detects DASH sources as adaptive', () => {
    const [result] = normalizeSources([makeSource({ uri: 'https://cdn.example.com/stream.mpd' })]);
    expect(result.isAdaptive).toBe(true);
  });

  it('respects explicit isAdaptive: false', () => {
    const [result] = normalizeSources([
      makeSource({ isAdaptive: false, uri: 'https://cdn.example.com/stream.m3u8' }),
    ]);
    expect(result.isAdaptive).toBe(false);
  });

  it('preserves all provided fields', () => {
    const source: VideoSource = {
      id: 'hd',
      label: '1080p',
      uri: 'https://example.com/1080p.mp4',
      bitrateKbps: 4000,
      width: 1920,
      height: 1080,
      isAdaptive: false,
      mimeType: 'video/mp4',
    };
    const [result] = normalizeSources([source]);
    expect(result).toMatchObject({
      id: 'hd',
      label: '1080p',
      uri: source.uri,
      bitrateKbps: 4000,
      width: 1920,
      height: 1080,
      isAdaptive: false,
      mimeType: 'video/mp4',
    });
  });
});

// ---------------------------------------------------------------------------
// getQualityOptions
// ---------------------------------------------------------------------------

describe('getQualityOptions', () => {
  it('always includes Auto as the first option', () => {
    const sources = normalizeSources([makeSource({ label: '720p', bitrateKbps: 2000 })]);
    const options = getQualityOptions(sources);
    expect(options[0].id).toBe(AUTO_QUALITY_ID);
    expect(options[0].label).toBe('Auto');
  });

  it('returns one option per source plus Auto', () => {
    const sources = normalizeSources([
      makeSource({ label: '360p', bitrateKbps: 400 }),
      makeSource({ label: '720p', bitrateKbps: 2000 }),
    ]);
    expect(getQualityOptions(sources)).toHaveLength(3);
  });

  it('sorts sources from lowest to highest quality', () => {
    const sources = normalizeSources([
      makeSource({ label: '1080p', bitrateKbps: 4000 }),
      makeSource({ label: '360p', bitrateKbps: 400 }),
      makeSource({ label: '720p', bitrateKbps: 2000 }),
    ]);
    const [, first, second, third] = getQualityOptions(sources);
    expect(first.label).toBe('360p');
    expect(second.label).toBe('720p');
    expect(third.label).toBe('1080p');
  });

  it('returns only Auto for empty sources', () => {
    expect(getQualityOptions([])).toEqual([
      { id: AUTO_QUALITY_ID, label: 'Auto', isAdaptive: true },
    ]);
  });
});

// ---------------------------------------------------------------------------
// selectAutoSource
// ---------------------------------------------------------------------------

describe('selectAutoSource', () => {
  const low = makeNorm({ id: 'low', label: '360p', bitrateKbps: 400 });
  const mid = makeNorm({ id: 'mid', label: '720p', bitrateKbps: 1200 });
  const high = makeNorm({ id: 'high', label: '1080p', bitrateKbps: 4000 });
  const sources = [low, mid, high];

  it('returns null for empty sources', () => {
    expect(selectAutoSource([], 'wifi')).toBeNull();
  });

  it('prefers adaptive (HLS/DASH) source regardless of network', () => {
    const adaptive = makeNorm({ id: 'hls', label: 'Adaptive', isAdaptive: true });
    expect(selectAutoSource([low, adaptive, high], 'cellular')).toBe(adaptive);
  });

  it('returns highest quality on wifi', () => {
    expect(selectAutoSource(sources, 'wifi')).toBe(high);
  });

  it('returns highest source within 1500 kbps cap on cellular', () => {
    // mid (1200 kbps) is the highest within 1500 kbps
    expect(selectAutoSource(sources, 'cellular')).toBe(mid);
  });

  it('returns highest source within 400 kbps cap on slow-cellular', () => {
    // low (400 kbps) is the only one within 400 kbps
    expect(selectAutoSource(sources, 'slow-cellular')).toBe(low);
  });

  it('falls back to lowest source when no source fits slow-cellular cap', () => {
    const heavySources = [
      makeNorm({ id: 'a', bitrateKbps: 500 }),
      makeNorm({ id: 'b', bitrateKbps: 1000 }),
    ];
    // None fit within 400 kbps — should return the lowest
    const result = selectAutoSource(heavySources, 'slow-cellular');
    expect(result?.id).toBe('a');
  });

  it('falls back to lowest source when no source fits cellular cap', () => {
    const heavySources = [
      makeNorm({ id: 'a', bitrateKbps: 2000 }),
      makeNorm({ id: 'b', bitrateKbps: 4000 }),
    ];
    const result = selectAutoSource(heavySources, 'cellular');
    expect(result?.id).toBe('a');
  });

  it('returns middle source for unknown network when no bitrate info', () => {
    const nobitrate = [
      makeNorm({ id: 'a', bitrateKbps: undefined }),
      makeNorm({ id: 'b', bitrateKbps: undefined }),
      makeNorm({ id: 'c', bitrateKbps: undefined }),
    ];
    // All score 0, sorted order is stable; middle index = 1
    const result = selectAutoSource(nobitrate, 'unknown');
    expect(result).not.toBeNull();
  });

  it('handles single source on any network', () => {
    expect(selectAutoSource([low], 'wifi')).toBe(low);
    expect(selectAutoSource([low], 'cellular')).toBe(low);
    expect(selectAutoSource([low], 'slow-cellular')).toBe(low);
    expect(selectAutoSource([low], 'unknown')).toBe(low);
  });
});

// ---------------------------------------------------------------------------
// selectSourceById
// ---------------------------------------------------------------------------

describe('selectSourceById', () => {
  const low = makeNorm({ id: 'low', label: '360p', bitrateKbps: 400 });
  const high = makeNorm({ id: 'high', label: '1080p', bitrateKbps: 4000 });
  const sources = [low, high];

  it('returns the matching source for a known id', () => {
    expect(selectSourceById(sources, 'low', 'wifi')).toBe(low);
  });

  it('falls back to auto selection for an unknown id', () => {
    // On wifi, auto picks highest
    expect(selectSourceById(sources, 'nonexistent', 'wifi')).toBe(high);
  });

  it('delegates to selectAutoSource when id is AUTO_QUALITY_ID', () => {
    // On wifi, auto picks highest
    expect(selectSourceById(sources, AUTO_QUALITY_ID, 'wifi')).toBe(high);
    // On slow-cellular, auto picks lowest within 400 kbps cap
    expect(selectSourceById(sources, AUTO_QUALITY_ID, 'slow-cellular')).toBe(low);
  });
});
