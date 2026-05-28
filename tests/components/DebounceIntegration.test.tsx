import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { MobileSearch } from '../../src/components/mobile/MobileSearch';
import LessonCarousel from '../../src/components/mobile/LessonCarousel';

// ── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('lucide-react-native', () => ({
  AlertCircle: () => null,
  Search: () => null,
  SlidersHorizontal: () => null,
}));

// Mock only necessary hooks, require actual useDebounce / useDebounceCallback
jest.mock('../../src/hooks', () => {
  const actual = jest.requireActual('../../src/hooks/useDebounce');
  return {
    ...actual,
    useAnalytics: () => ({
      trackEvent: jest.fn(),
    }),
    useDynamicFontSize: () => ({
      scale: (x: number) => x,
    }),
    useMemoryMonitor: jest.fn(),
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

// Mock expo linear gradient
jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

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

      // Simulating rapid keystrokes typing: 'R', 'Re', 'Rea', 'React'
      // Expected behavior: query state updates immediately in text input,
      // but actual search/filtering (300ms debounce) is deferred.
      fireEvent.changeText(input, 'R');
      fireEvent.changeText(input, 'Re');
      fireEvent.changeText(input, 'Rea');
      fireEvent.changeText(input, 'React');

      // Before 300ms, search results shouldn't render yet
      expect(queryByText('1 result')).toBeNull();

      // Fast forward time by 200ms (not yet 300ms since last change)
      act(() => {
        jest.advanceTimersByTime(200);
      });
      expect(queryByText('1 result')).toBeNull();

      // Complete the remaining 100ms debounce delay
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Now it should have executed the search automatically and found results!
      // (sampleCourse has "React Native" in title/description)
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

      const { getByTestId } = render(
        <LessonCarousel
          lessons={mockLessons}
          currentLessonId="1"
          onLessonChange={onLessonChange}
          renderLessonContent={renderContent}
        />
      );

      // We obtain scroll view.
      // Wait, LessonCarousel renders a ScrollView. We can simulate onScroll event.
      // Line 188: <ScrollView horizontal pagingEnabled onScroll={handleScroll} ...
      const scrollView = getByTestId('LessonCarousel').parent?.findByType('ScrollView');
      expect(scrollView).toBeDefined();

      if (!scrollView) {
        throw new Error('ScrollView not found in LessonCarousel');
      }

      // Simulate rapid drag/scroll offsets: 100, 200, 300, 375 (1 page width = SCREEN_WIDTH)
      // Screen width is 375 by default inside test dimensions.
      // Multiple scroll events fired sequentially (e.g. 10ms apart)
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

      // At this point, the index is page 1 (Lesson 2).
      // Since it is debounced by 100ms, onLessonChange should NOT have been called yet.
      expect(onLessonChange).not.toHaveBeenCalled();

      // Fast forward 50ms (still within 100ms)
      act(() => {
        jest.advanceTimersByTime(50);
      });
      expect(onLessonChange).not.toHaveBeenCalled();

      // Complete 100ms from the last event
      act(() => {
        jest.advanceTimersByTime(50);
      });

      // Should now be called exactly once for the final scrolled index!
      expect(onLessonChange).toHaveBeenCalledTimes(1);
      expect(onLessonChange).toHaveBeenCalledWith('2', 1);
    });
  });
});
