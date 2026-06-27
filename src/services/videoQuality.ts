export const AUTO_QUALITY_ID = 'auto';

export type VideoSource = {
  id?: string;
  label?: string;
  uri: string;
  bitrateKbps?: number;
  width?: number;
  height?: number;
  isAdaptive?: boolean;
  mimeType?: string;
};

export type NormalizedVideoSource = {
  id: string;
  label: string;
  uri: string;
  bitrateKbps?: number;
  width?: number;
  height?: number;
  isAdaptive: boolean;
  mimeType?: string;
};

export type QualityOption = {
  id: string;
  label: string;
  isAdaptive?: boolean;
};

export type NetworkType = 'wifi' | 'cellular' | 'slow-cellular' | 'unknown';

export const BITRATE_CAP: { [K in NetworkType]: number | null } = {
  wifi: null,
  cellular: 1500,
  'slow-cellular': 400,
  unknown: 1500,
};

export function deriveNetworkType(
  state?: { type?: string | null },
  isSlowConnection: boolean = false
): NetworkType {
  const type = (state?.type ?? '').toString().toUpperCase();
  if (type === 'WIFI' || type === 'ETHERNET') {
    return 'wifi';
  }
  if (type === 'CELLULAR') {
    return isSlowConnection ? 'slow-cellular' : 'cellular';
  }
  return 'unknown';
}

export function normalizeSources(sources: VideoSource[]): NormalizedVideoSource[] {
  const seenIds = new Set<string>();
  return sources.map((source, index) => {
    const isAdaptive = resolveIsAdaptive(source);
    const label =
      source.label ??
      (source.height
        ? `${source.height}p`
        : source.bitrateKbps
        ? `${Math.round(source.bitrateKbps)}kbps`
        : isAdaptive
        ? 'Adaptive'
        : `Quality ${index + 1}`);
    const baseId = source.id ?? label;
    let id = normalizeId(baseId);
    if (!id) {
      id = `quality-${index + 1}`;
    }
    let uniqueId = id;
    let counter = 2;
    while (seenIds.has(uniqueId)) {
      uniqueId = `${id}-${counter}`;
      counter += 1;
    }
    seenIds.add(uniqueId);
    return {
      id: uniqueId,
      label,
      uri: source.uri,
      bitrateKbps: source.bitrateKbps,
      width: source.width,
      height: source.height,
      isAdaptive,
      mimeType: source.mimeType,
    };
  });
}

export function getQualityOptions(sources: NormalizedVideoSource[]): QualityOption[] {
  const sorted = [...sources].sort((a, b) => scoreQuality(a) - scoreQuality(b));
  return [
    { id: AUTO_QUALITY_ID, label: 'Auto', isAdaptive: true },
    ...sorted.map((source) => ({
      id: source.id,
      label: source.label,
      isAdaptive: source.isAdaptive,
    })),
  ];
}

export function selectSourceById(
  sources: NormalizedVideoSource[],
  qualityId: string,
  networkType: NetworkType
): NormalizedVideoSource | null {
  if (qualityId === AUTO_QUALITY_ID) {
    return selectAutoSource(sources, networkType);
  }
  const match = sources.find((source) => source.id === qualityId);
  return match ?? selectAutoSource(sources, networkType);
}

export function selectAutoSource(
  sources: NormalizedVideoSource[],
  networkType: NetworkType
): NormalizedVideoSource | null {
  if (!sources.length) {
    return null;
  }
  const adaptive = sources.find((source) => source.isAdaptive);
  if (adaptive) {
    return adaptive;
  }
  const sorted = [...sources].sort((a, b) => scoreQuality(a) - scoreQuality(b));
  if (networkType === 'wifi') {
    return sorted[sorted.length - 1];
  }
  if (networkType === 'cellular') {
    const capped = pickWithinBitrate(sorted, BITRATE_CAP.cellular!);
    if (capped) {
      return capped;
    }
    return sorted[Math.max(0, Math.floor(sorted.length / 2) - 1)];
  }
  if (networkType === 'slow-cellular') {
    const capped = pickWithinBitrate(sorted, BITRATE_CAP['slow-cellular']!);
    if (capped) {
      return capped;
    }
    return sorted[0];
  }
  return sorted[Math.floor(sorted.length / 2)];
}

function pickWithinBitrate(
  sources: NormalizedVideoSource[],
  maxKbps: number
): NormalizedVideoSource | null {
  const candidates = sources.filter(
    (source) => typeof source.bitrateKbps === 'number' && source.bitrateKbps <= maxKbps
  );
  if (!candidates.length) {
    return null;
  }
  return candidates[candidates.length - 1];
}

function scoreQuality(source: NormalizedVideoSource): number {
  if (source.bitrateKbps && source.bitrateKbps > 0) {
    return source.bitrateKbps;
  }
  if (source.width && source.height) {
    return (source.width * source.height) / 1000;
  }
  if (source.height) {
    return source.height;
  }
  return 0;
}

function resolveIsAdaptive(source: VideoSource): boolean {
  if (typeof source.isAdaptive === 'boolean') {
    return source.isAdaptive;
  }
  const uri = source.uri ?? '';
  const mime = source.mimeType ?? '';
  return (
    /\.m3u8($|\?)/i.test(uri) ||
    /\.mpd($|\?)/i.test(uri) ||
    /mpegurl/i.test(mime) ||
    /dash\+xml/i.test(mime)
  );
}

function normalizeId(value: string): string {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
