import { useDeepLinkStore } from '@/src/store/deepLinkStore';
import { getDeepLinkPath, getInitialDeepLinkUrl, parseDeepLink, prewarmDeepLinkData } from '@/src/utils/deepLinkPrewarm';
import logger from '@/src/utils/logger';
import { useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useState } from 'react';

interface DeepLinkPrewarmProviderProps {
  children: React.ReactNode;
}

export function DeepLinkPrewarmProvider({ children }: DeepLinkPrewarmProviderProps) {
  const router = useRouter();
  const setPrewarmedCourse = useDeepLinkStore((state) => state.setPrewarmedCourse);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    async function prepareDeepLink() {
      try {
        await SplashScreen.preventAutoHideAsync();
      } catch (error) {
        logger.warn('Unable to prevent auto-hide splash screen:', error);
      }

      try {
        const initialUrl = await getInitialDeepLinkUrl();
        if (!initialUrl) {
          return;
        }

        const parsed = parseDeepLink(initialUrl);
        if (!parsed) {
          logger.debug('Deep link could not be parsed:', initialUrl);
          return;
        }

        const prewarmResult = await prewarmDeepLinkData(parsed);
        if (prewarmResult.prewarmedCourse) {
          setPrewarmedCourse(prewarmResult.prewarmedCourse);
        }

        const targetPath = getDeepLinkPath(parsed);
        if (targetPath) {
          router.replace(targetPath);
        }
      } catch (error) {
        logger.error('Deep link prewarm failed:', error);
      } finally {
        if (!isMounted) return;
        setReady(true);
        try {
          await SplashScreen.hideAsync();
        } catch (error) {
          logger.warn('Unable to hide splash screen:', error);
        }
      }
    }

    prepareDeepLink();

    timeoutId = setTimeout(async () => {
      if (!isMounted) return;
      setReady(true);
      try {
        await SplashScreen.hideAsync();
      } catch (error) {
        logger.warn('Timeout hiding splash screen:', error);
      }
    }, 5000);

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router, setPrewarmedCourse]);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
