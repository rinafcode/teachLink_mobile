export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  pixelRatio?: number;
  quality?: number;
  lqipQuality?: number;
  preferWebp?: boolean;
}

export interface OptimizedImageSourceSet {
  primaryUri: string;
  fallbackUri: string;
  lqipUri: string;
  prefetchCandidates: string[];
  dpr: number;
}

const MAX_DPR = 3;
const MIN_DPR = 1;
const DEFAULT_QUALITY = 72;
const DEFAULT_LQIP_QUALITY = 18;

function getDefaultPixelRatio(): number {
  const globalRatio = (globalThis as { devicePixelRatio?: number }).devicePixelRatio;
  if (typeof globalRatio === 'number' && Number.isFinite(globalRatio)) {
    return globalRatio;
  }

  return 2;
}

function clampDpr(value: number): number {
  return Math.max(MIN_DPR, Math.min(MAX_DPR, Math.round(value)));
}

function toInt(value?: number): string | null {
  if (!Number.isFinite(value)) {
    return null;
  }

  const rounded = Math.max(1, Math.round(value as number));
  return String(rounded);
}

function parseUri(uri: string): {
  base: string;
  params: Map<string, string>;
  hash: string;
} {
  const hashIndex = uri.indexOf('#');
  const hash = hashIndex >= 0 ? uri.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? uri.slice(0, hashIndex) : uri;

  const queryIndex = withoutHash.indexOf('?');
  const base = queryIndex >= 0 ? withoutHash.slice(0, queryIndex) : withoutHash;
  const query = queryIndex >= 0 ? withoutHash.slice(queryIndex + 1) : '';

  const params = new Map<string, string>();
  if (query) {
    query.split('&').forEach(part => {
      if (!part) return;
      const [key, ...valueParts] = part.split('=');
      if (!key) return;
      params.set(decodeURIComponent(key), decodeURIComponent(valueParts.join('=')));
    });
  }

  return { base, params, hash };
}

function serializeUri(base: string, params: Map<string, string>, hash: string): string {
  const query = Array.from(params.entries())
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  if (!query) {
    return `${base}${hash}`;
  }

  return `${base}?${query}${hash}`;
}

function shouldOptimizeRemote(uri: string): boolean {
  return /^https?:\/\//i.test(uri);
}

function buildVariantUri(
  uri: string,
  {
    format,
    quality,
    width,
    height,
    dpr,
    lqip,
  }: {
    format: 'webp' | 'png';
    quality: number;
    width?: number;
    height?: number;
    dpr: number;
    lqip: boolean;
  }
): string {
  const { base, params, hash } = parseUri(uri);

  params.set('format', format);
  params.set('q', String(quality));
  params.set('dpr', String(dpr));

  const widthValue = toInt(width);
  if (widthValue) {
    params.set('w', widthValue);
  }

  const heightValue = toInt(height);
  if (heightValue) {
    params.set('h', heightValue);
  }

  if (lqip) {
    params.set('lqip', '1');
    params.set('blur', '24');
  }

  return serializeUri(base, params, hash);
}

export function buildOptimizedImageSources(
  uri: string,
  options: ImageOptimizationOptions = {}
): OptimizedImageSourceSet {
  const dpr = clampDpr(options.pixelRatio ?? getDefaultPixelRatio());
  const quality = options.quality ?? DEFAULT_QUALITY;
  const lqipQuality = options.lqipQuality ?? DEFAULT_LQIP_QUALITY;

  if (!uri || !shouldOptimizeRemote(uri)) {
    return {
      primaryUri: uri,
      fallbackUri: uri,
      lqipUri: uri,
      prefetchCandidates: [uri].filter(Boolean),
      dpr,
    };
  }

  const variantWidth = Number.isFinite(options.width) ? (options.width as number) * dpr : undefined;
  const variantHeight = Number.isFinite(options.height) ? (options.height as number) * dpr : undefined;

  const primaryUri = buildVariantUri(uri, {
    format: options.preferWebp === false ? 'png' : 'webp',
    quality,
    width: variantWidth,
    height: variantHeight,
    dpr,
    lqip: false,
  });

  const fallbackUri = buildVariantUri(uri, {
    format: 'png',
    quality,
    width: variantWidth,
    height: variantHeight,
    dpr,
    lqip: false,
  });

  const lqipUri = buildVariantUri(uri, {
    format: 'webp',
    quality: lqipQuality,
    width: variantWidth,
    height: variantHeight,
    dpr,
    lqip: true,
  });

  const prefetchCandidates = Array.from(new Set([lqipUri, primaryUri, fallbackUri]));

  return {
    primaryUri,
    fallbackUri,
    lqipUri,
    prefetchCandidates,
    dpr,
  };
}
