import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import QuizCarousel from '../QuizCarousel';
import { useAnalytics } from '../../../../hooks/useAnalytics';

jest.mock('../../../../hooks/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

describe('QuizCarousel Analytics', () => {
  const mockTrackEvent = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAnalytics as jest.Mock).mockReturnValue({
      trackEvent: mockTrackEvent,
    });
  });

  it('fires analytics only once per swipe (onMomentumScrollEnd), not on every frame', () => {
    const questions = [
      { id: '1', text: 'Q1', type: 'multiple-choice', options: [] },
      { id: '2', text: 'Q2', type: 'multiple-choice', options: [] },
    ] as any;

    const { getByTestId } = render(
      <QuizCarousel
        questions={questions}
        currentQuestionIndex={0}
        selectedAnswers={{}}
        onQuestionChange={jest.fn()}
        onAnswerSelect={jest.fn()}
      />
    );

    const flatList = getByTestId('QuizCarouselList');

    // Simulate drag start
    fireEvent(flatList, 'scrollBeginDrag');

    // Simulate scroll end (momentum end) simulating scrolling to 2nd item (index 1)
    // Assuming SCREEN_WIDTH is some value, let's pass a simulated offset
    fireEvent(flatList, 'momentumScrollEnd', {
      nativeEvent: {
        contentOffset: { x: 400 }, // some arbitrary width indicating swipe
      },
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      event_category: 'high_frequency',
      event_name: 'quiz_carousel_scroll',
    }));
  });
});
