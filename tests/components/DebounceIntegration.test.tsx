/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-require-imports */
import { render, fireEvent, act } from '@testing-library/react-native';
import React from 'react';

import LessonCarousel from '../../src/components/mobile/LessonCarousel';
import { MobileSearch } from '../../src/components/mobile/MobileSearch';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('react-native-safe-area-context', () => {
  const MockComponent = ({ children }: any) => children || null;
  MockComponent.displayName = 'SafeAreaProvider';

  return {
    SafeAreaProvider: MockComponent,
    SafeAreaView: MockComponent,
    SafeAreaConsumer: ({ children }: any) => children({ top: 0, left: 0, right: 0, bottom: 0 }),
    useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: 0 }),
  };
});

jest.mock('lucide-react-native', () => {
  const React = require('react');
  return new Proxy(
    {},
    {
      get: (target, prop) => {
        const MockComponent = (props: any) => null;
        MockComponent.displayName = String(prop);
        return MockComponent;
      },
    }
  );
});

const mockTrackEvent = jest.fn();

// Mock only necessary hooks, require actual useDebounce / useDebounceCallback
jest.mock('../../src/hooks', () => {
  const actual = jest.requireActual('../../src/hooks');
  return {
    ...actual,
    useAnalytics: () => ({
      trackEvent: mockTrackEvent,
    }),
    useDynamicFontSize: () => ({
      scale: (x: number) => x,
    }),
    useMemoryMonitor: () => ({
      isHighMemory: false,
      isCriticalMemory: false,
    }),
  };
});

jest.mock('../../src/hooks/useAnalytics', () => {
  return {
    __esModule: true,
    default: () => ({
      trackEvent: mockTrackEvent,
    }),
    useAnalytics: () => ({
      trackEvent: mockTrackEvent,
    }),
  };
});

jest.mock('../../src/components/mobile/VoiceSearch', () => ({
  VoiceSearch: () => null,
}));

jest.mock('../../src/components/mobile/FilterSheet', () => ({
  FilterSheet: () => null,
}));

jest.mock('../../src/components/mobile/SearchHistory', () => ({
  SearchHistory: () => null,
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children || null,
}));

// Mock react-native-safe-area-context
jest.mock('react-native-safe-area-context', () => {
  const React = require('react');
  const SafeAreaProvider = ({ children }: any) => children;
  SafeAreaProvider.displayName = 'SafeAreaProvider';
  const SafeAreaView = ({ children }: any) => children;
  SafeAreaView.displayName = 'SafeAreaView';
  return {
    SafeAreaProvider,
    SafeAreaView,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

describe('Debouncing Rapid User Input & Scroll Events', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Search Input Debouncing ────────────────────────────────────────────────

  describe('MobileSearch component', () => {
    it('debounces rapid keystrokes to prevent search re-renders and query spam', () => {
      const onResultPress = jest.fn();
      const { getByPlaceholderText, queryByText } = render(
        <MobileSearch onResultPress={onResultPress} placeholder="Search courses..." />
      );

      const input = getByPlaceholderText('Search courses...');

      fireEvent.changeText(input, 'R');
      fireEvent.changeText(input, 'Re');
      fireEvent.changeText(input, 'Rea');
      fireEvent.changeText(input, 'React');

      expect(queryByText('1 result')).toBeNull();

      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(queryByText('1 result')).toBeNull();

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(queryByText('1 result')).toBeTruthy();
    });
  });

  // ── Scroll Event Debouncing ────────────────────────────────────────────────

  describe('LessonCarousel scroll debouncing', () => {
    const mockLessons = [
      { id: '1', title: 'Lesson 1', duration: 10 },
      { id: '2', title: 'Lesson 2', duration: 15 },
      { id: '3', title: 'Lesson 3', duration: 20 },
    ];

    it('debounces rapid scroll drag events to prevent state update spam', () => {
      const onLessonChange = jest.fn();
      const renderContent = jest.fn(() => null);

      const { UNSAFE_getByType } = render(
        <LessonCarousel
          lessons={mockLessons}
          currentLessonId="1"
          onLessonChange={onLessonChange}
          renderLessonContent={renderContent}
        />
      );

      const scrollView = UNSAFE_getByType('ScrollView');
      expect(scrollView).toBeDefined();

      act(() => {
        fireEvent.scroll(scrollView, {
          nativeEvent: { contentOffset: { x: 50, y: 0 } },
        });
      });
      act(() => {
        fireEvent.scroll(scrollView, {
          nativeEvent: { contentOffset: { x: 150, y: 0 } },
        });
      });
      act(() => {
        fireEvent.scroll(scrollView, {
          nativeEvent: { contentOffset: { x: 375, y: 0 } },
        });
      });

      expect(onLessonChange).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(50);
      });
      expect(onLessonChange).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(onLessonChange).toHaveBeenCalledTimes(1);
      expect(onLessonChange).toHaveBeenCalledWith('2', 1);
    });
  });
});
