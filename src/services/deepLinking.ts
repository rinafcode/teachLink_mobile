import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

import { ParsedDeepLink, parseDeepLinkUrl } from '../utils/linkParser';
import logger from '../utils/logger';

const DEFERRED_DEEP_LINK_KEY = '@teachlink:deferredDeepLink';

export const ALLOWED_DEEP_LINK_PATHS = [
  'course',
  'courses',
  'messages',
  'learn',
  'learning',
  'achievements',
  'community',
  'profile',
  'search',
  'settings',
  'qr-scanner',
  'scan',
  'home',
  '',
];

const ALLOWED_QUERY_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'deferred'];

export function validateDeepLink(url: string): boolean {
  try {
    let checkUrl = url.trim();
    if (checkUrl.startsWith('teachlink://')) {
      checkUrl = checkUrl.replace(/^teachlink:\/\//i, 'https://teachlink.com/');
    }
    const parsedUrl = new URL(checkUrl);

    const segments = parsedUrl.pathname
      .replace(/^\/+|\/+$/g, '')
      .split('/')
      .filter(Boolean);

    const rootPath = segments[0] ? segments[0].toLowerCase() : '';

    if (!ALLOWED_DEEP_LINK_PATHS.includes(rootPath)) {
      appLogger.warn(`Blocked deep link with unauthorized path: ${rootPath || '/'}`);
      Sentry.captureMessage(
        `Blocked deep link with unauthorized path: ${rootPath || '/'}`,
        'warning'
      );
      useDeepLinkStore.getState().setDeepLinkError('This link is invalid or not supported.');
      return false;
    }
    return true;
  } catch {
    appLogger.warn(`Malformed deep link url: ${url}`);
    Sentry.captureMessage(`Malformed deep link url: ${url}`, 'warning');
    useDeepLinkStore.getState().setDeepLinkError('The link is malformed.');
    return false;
  }
}

export function sanitizeDeepLink(url: string): string {
  try {
    let checkUrl = url.trim();
    const isCustomScheme = checkUrl.startsWith('teachlink://');
    if (isCustomScheme) {
      checkUrl = checkUrl.replace(/^teachlink:\/\//i, 'https://teachlink.com/');
    }

    const parsedUrl = new URL(checkUrl);
    const paramsToDelete: string[] = [];
    parsedUrl.searchParams.forEach((_, key) => {
      if (!ALLOWED_QUERY_PARAMS.includes(key)) {
        paramsToDelete.push(key);
      }
    });
    paramsToDelete.forEach(key => parsedUrl.searchParams.delete(key));

    if (isCustomScheme) {
      return parsedUrl.toString().replace(/^https:\/\/teachlink\.com\//i, 'teachlink://');
    }
    return parsedUrl.toString();
  } catch {
    return url; // fallback
  }
}

export const LINKING_PREFIXES = [
  Linking.createURL('/'),
  'teachlink://',
  'https://teachlink.com',
  'https://www.teachlink.com',
];

export async function getInitialDeepLink(): Promise<ParsedDeepLink | null> {
  try {
    const initialUrl = await Linking.getInitialURL();

    if (initialUrl) {
      if (!validateDeepLink(initialUrl)) {
        return null;
      }
      const sanitizedUrl = sanitizeDeepLink(initialUrl);
      const parsed = parseDeepLinkUrl(sanitizedUrl);
      if (parsed) {
        if (parsed.attribution?.deferred) {
          await AsyncStorage.setItem(DEFERRED_DEEP_LINK_KEY, sanitizedUrl);
        }
        return parsed;
      }
    }

    const storedUrl = await AsyncStorage.getItem(DEFERRED_DEEP_LINK_KEY);
    if (!storedUrl) {
      return null;
    }

    const parsedStored = parseDeepLinkUrl(storedUrl);
    if (!parsedStored) {
      await AsyncStorage.removeItem(DEFERRED_DEEP_LINK_KEY);
      return null;
    }

    await AsyncStorage.removeItem(DEFERRED_DEEP_LINK_KEY);
    return {
      ...parsedStored,
      attribution: {
        ...parsedStored.attribution,
        deferred: true,
      },
    };
  } catch (error) {
    appLogger.error('Error initializing deep linking:', error);
    return null;
  }
}

export async function trackDeferredDeepLink(url: string): Promise<void> {
  if (!url) {
    return;
  }

  if (!validateDeepLink(url)) {
    return;
  }
  const sanitizedUrl = sanitizeDeepLink(url);
  const parsed = parseDeepLinkUrl(sanitizedUrl);
  if (!parsed) {
    return;
  }

  try {
    await AsyncStorage.setItem(DEFERRED_DEEP_LINK_KEY, sanitizedUrl);
  } catch (error) {
    appLogger.error('Error storing deferred deep link:', error);
  }
}

export function subscribeToDeepLinks(listener: (deepLink: ParsedDeepLink) => void): () => void {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    if (!validateDeepLink(url)) {
      return;
    }
    const sanitizedUrl = sanitizeDeepLink(url);
    const parsed = parseDeepLinkUrl(sanitizedUrl);
    if (parsed) {
      if (parsed.attribution?.deferred) {
        void AsyncStorage.setItem(DEFERRED_DEEP_LINK_KEY, sanitizedUrl);
      }
      listener(parsed);
    }
  });

  return () => {
    subscription.remove();
  };
}
