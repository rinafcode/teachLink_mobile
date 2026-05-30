import { Asset } from 'expo-asset';

import packageJson from '../../package.json';

export const CDN_BASE_URL = 'https://cdn.teachlink.com';
export const APP_VERSION = packageJson.version;

/**
 * Checks if a given URL points to the CDN origin.
 */
export function isCDNUrl(url: string): boolean {
  return typeof url === 'string' && url.startsWith(CDN_BASE_URL);
}

/**
 * Gets a versioned CDN URL for a given static asset or source module.
 *
 * - If a local asset module (number from `require()`) is provided, resolves its URI first.
 * - If already pointing to the CDN, ensures the version query parameter is attached.
 * - If pointing to another remote HTTP/HTTPS URL, returns it unmodified.
 * - Otherwise, cleans local paths (removes leading slashes, "assets/" prefix)
 *   and prefixes them with the CDN base URL, appending "?v=<version>".
 *
 * @param source - The asset path, URL, or local asset require number.
 * @returns The versioned CDN URL or empty string.
 */
export function getCDNAssetUrl(source: string | number | null | undefined): string {
  if (source === null || source === undefined) {
    return '';
  }

  let uri = '';
  if (typeof source === 'number') {
    try {
      const asset = Asset.fromModule(source);
      uri = asset.uri || '';
    } catch {
      return '';
    }
  } else {
    uri = source;
  }

  if (!uri) {
    return '';
  }

  // Handle absolute HTTP/HTTPS URLs
  if (/^https?:\/\//.test(uri)) {
    if (uri.startsWith(CDN_BASE_URL)) {
      // Ensure the version query parameter is appended/updated
      try {
        const url = new URL(uri);
        url.searchParams.set('v', APP_VERSION);
        return url.toString();
      } catch {
        return uri.includes('?') ? `${uri}&v=${APP_VERSION}` : `${uri}?v=${APP_VERSION}`;
      }
    }
    return uri;
  }

  // Handle local or relative paths
  let cleanPath = uri.replace(/^\/+/, '');
  if (cleanPath.startsWith('assets/')) {
    cleanPath = cleanPath.substring('assets/'.length);
  }

  return `${CDN_BASE_URL}/${cleanPath}?v=${APP_VERSION}`;
}

/**
 * Gets a CDN URL for a specific font file.
 *
 * @param fontFileName - The filename of the font (e.g., "Inter-Bold.ttf")
 * @returns The versioned CDN URL for the font asset.
 */
export function getCDNFontUrl(fontFileName: string): string {
  if (!fontFileName) return '';
  const cleanName = fontFileName.replace(/^\/+/, '');
  const path = cleanName.startsWith('fonts/') ? cleanName : `fonts/${cleanName}`;
  return `${CDN_BASE_URL}/${path}?v=${APP_VERSION}`;
}
