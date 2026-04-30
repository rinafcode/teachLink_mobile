import * as Linking from 'expo-linking';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../utils/logger';
import { ParsedDeepLink, parseDeepLinkUrl } from '../utils/linkParser';

const DEFERRED_DEEP_LINK_KEY = '@teachlink:deferredDeepLink';

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
      const parsed = parseDeepLinkUrl(initialUrl);
      if (parsed) {
        if (parsed.attribution?.deferred) {
          await AsyncStorage.setItem(DEFERRED_DEEP_LINK_KEY, initialUrl);
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
    logger.error('Error initializing deep linking:', error);
    return null;
  }
}

export async function trackDeferredDeepLink(url: string): Promise<void> {
  if (!url) {
    return;
  }

  const parsed = parseDeepLinkUrl(url);
  if (!parsed) {
    return;
  }

  try {
    await AsyncStorage.setItem(DEFERRED_DEEP_LINK_KEY, url);
  } catch (error) {
    logger.error('Error storing deferred deep link:', error);
  }
}

export function subscribeToDeepLinks(
  listener: (deepLink: ParsedDeepLink) => void
): () => void {
  const subscription = Linking.addEventListener('url', ({ url }) => {
    const parsed = parseDeepLinkUrl(url);
    if (parsed) {
      if (parsed.attribution?.deferred) {
        void AsyncStorage.setItem(DEFERRED_DEEP_LINK_KEY, url);
      }
      listener(parsed);
    }
  });

  return () => {
    subscription.remove();
  };
}
