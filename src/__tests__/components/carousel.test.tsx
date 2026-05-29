/**
 * Tests for virtualized carousel behavior (Issue: Gallery/carousel virtualization)
 *
 * Verifies that both LessonCarousel and QuizCarousel:
 * - Use FlatList (virtualized) instead of ScrollView
 * - Configure windowing props to limit rendered items
 * - Provide getItemLayout for O(1) scroll-to-index
 * - Only fire onLessonChange/onQuestionChange on momentum scroll end
 */

import { render } from '@testing-library/react-native';
import React from 'react';

import LessonCarousel from '@/components/mobile/LessonCarousel';
import QuizCarousel from '@/components/mobile/MobileQuizManager/QuizCarousel';
import { Lesson, Question } from '@/types/course';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('@/components/mobile/MobileQuizManager/MobileQuestionCard', () => 'MobileQuestionCard');

jest.mock('@/hooks', () => ({
  useHapticFeedback: () => ({ trigger: jest.fn() }),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeLesson = (i: number): Lesson => ({
  id: `lesson-${i}`,
  title: `Lesson ${i}`,
  content: `Content ${i}`,
  duration: 5,
  order: i,
});

const makeQuestion = (i: number): Question => ({
  id: `q-${i}`,
  type: 'multiple-choice',
  question: `Question ${i}`,
  options: ['A', 'B', 'C', 'D'],
  correctAnswer: 'A',
  points: 1,
});

const LESSONS = Array.from({ length: 10 }, (_, i) => makeLesson(i));
const QUESTIONS = Array.from({ length: 10 }, (_, i) => makeQuestion(i));

// ─── LessonCarousel ───────────────────────────────────────────────────────────

describe('LessonCarousel — virtualization', () => {
  const defaultProps = {
    lessons: LESSONS,
    currentLessonId: 'lesson-0',
    onLessonChange: jest.fn(),
    renderLessonContent: (lesson: Lesson) => null,
  };

  it('renders a FlatList (not ScrollView) for the slide container', () => {
    const { getByTestId } = render(<LessonCarousel {...defaultProps} />);
    expect(getByTestId('LessonCarouselList')).toBeTruthy();
  });

  it('passes windowSize=3 to limit rendered items to visible + 1 buffer each side', () => {
    const { getByTestId } = render(<LessonCarousel {...defaultProps} />);
    expect(getByTestId('LessonCarouselList').props.windowSize).toBe(3);
  });

  it('passes maxToRenderPerBatch=1 to render one item per batch', () => {
    const { getByTestId } = render(<LessonCarousel {...defaultProps} />);
    expect(getByTestId('LessonCarouselList').props.maxToRenderPerBatch).toBe(1);
  });

  it('passes initialNumToRender=1 to mount only the first item', () => {
    const { getByTestId } = render(<LessonCarousel {...defaultProps} />);
    expect(getByTestId('LessonCarouselList').props.initialNumToRender).toBe(1);
  });

  it('passes removeClippedSubviews to unmount off-screen items', () => {
    const { getByTestId } = render(<LessonCarousel {...defaultProps} />);
    expect(getByTestId('LessonCarouselList').props.removeClippedSubviews).toBe(true);
  });

  it('provides getItemLayout for O(1) scroll-to-index', () => {
    const { getByTestId } = render(<LessonCarousel {...defaultProps} />);
    const { getItemLayout } = getByTestId('LessonCarouselList').props;
    expect(typeof getItemLayout).toBe('function');
    // Each item is SCREEN_WIDTH (390 in test env) wide
    const layout = getItemLayout(null, 3);
    expect(layout).toEqual({ length: 390, offset: 390 * 3, index: 3 });
  });

  it('fires onLessonChange on momentum scroll end', () => {
    const onLessonChange = jest.fn();
    const { getByTestId } = render(
      <LessonCarousel {...defaultProps} onLessonChange={onLessonChange} />
    );
    const list = getByTestId('LessonCarouselList');
    list.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 390 * 2 } } });
    expect(onLessonChange).toHaveBeenCalledWith('lesson-2', 2);
  });

  it('does not fire onLessonChange for out-of-bounds scroll offset', () => {
    const onLessonChange = jest.fn();
    const { getByTestId } = render(
      <LessonCarousel {...defaultProps} onLessonChange={onLessonChange} />
    );
    const list = getByTestId('LessonCarouselList');
    list.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 390 * 999 } } });
    expect(onLessonChange).not.toHaveBeenCalled();
  });

  it('renders empty state when lessons array is empty', () => {
    const { getByText } = render(
      <LessonCarousel {...defaultProps} lessons={[]} currentLessonId="" />
    );
    expect(getByText('No lessons available')).toBeTruthy();
  });

  it('scales correctly with 1000+ lessons (getItemLayout stays O(1))', () => {
    const manyLessons = Array.from({ length: 1000 }, (_, i) => makeLesson(i));
    const { getByTestId } = render(<LessonCarousel {...defaultProps} lessons={manyLessons} />);
    const { getItemLayout } = getByTestId('LessonCarouselList').props;
    // O(1): layout for item 999 computed directly without iteration
    expect(getItemLayout(null, 999)).toEqual({ length: 390, offset: 390 * 999, index: 999 });
  });
});

// ─── QuizCarousel ─────────────────────────────────────────────────────────────

describe('QuizCarousel — virtualization', () => {
  const defaultProps = {
    questions: QUESTIONS,
    currentQuestionIndex: 0,
    selectedAnswers: {},
    onQuestionChange: jest.fn(),
    onAnswerSelect: jest.fn(),
  };

  it('renders a FlatList (not ScrollView) for the slide container', () => {
    const { getByTestId } = render(<QuizCarousel {...defaultProps} />);
    expect(getByTestId('QuizCarouselList')).toBeTruthy();
  });

  it('passes windowSize=3 to limit rendered items', () => {
    const { getByTestId } = render(<QuizCarousel {...defaultProps} />);
    expect(getByTestId('QuizCarouselList').props.windowSize).toBe(3);
  });

  it('passes maxToRenderPerBatch=1', () => {
    const { getByTestId } = render(<QuizCarousel {...defaultProps} />);
    expect(getByTestId('QuizCarouselList').props.maxToRenderPerBatch).toBe(1);
  });

  it('passes initialNumToRender=1', () => {
    const { getByTestId } = render(<QuizCarousel {...defaultProps} />);
    expect(getByTestId('QuizCarouselList').props.initialNumToRender).toBe(1);
  });

  it('passes removeClippedSubviews', () => {
    const { getByTestId } = render(<QuizCarousel {...defaultProps} />);
    expect(getByTestId('QuizCarouselList').props.removeClippedSubviews).toBe(true);
  });

  it('provides getItemLayout for O(1) scroll-to-index', () => {
    const { getByTestId } = render(<QuizCarousel {...defaultProps} />);
    const { getItemLayout } = getByTestId('QuizCarouselList').props;
    expect(typeof getItemLayout).toBe('function');
    expect(getItemLayout(null, 5)).toEqual({ length: 390, offset: 390 * 5, index: 5 });
  });

  it('fires onQuestionChange on momentum scroll end', () => {
    const onQuestionChange = jest.fn();
    const { getByTestId } = render(
      <QuizCarousel {...defaultProps} onQuestionChange={onQuestionChange} />
    );
    const list = getByTestId('QuizCarouselList');
    list.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 390 * 3 } } });
    expect(onQuestionChange).toHaveBeenCalledWith(3);
  });

  it('does not fire onQuestionChange when index is unchanged', () => {
    const onQuestionChange = jest.fn();
    const { getByTestId } = render(
      <QuizCarousel
        {...defaultProps}
        currentQuestionIndex={2}
        onQuestionChange={onQuestionChange}
      />
    );
    const list = getByTestId('QuizCarouselList');
    // Scroll to same index
    list.props.onMomentumScrollEnd({ nativeEvent: { contentOffset: { x: 390 * 2 } } });
    expect(onQuestionChange).not.toHaveBeenCalled();
  });

  it('renders nothing when questions array is empty', () => {
    const { toJSON } = render(<QuizCarousel {...defaultProps} questions={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('scales correctly with 1000+ questions (getItemLayout stays O(1))', () => {
    const manyQuestions = Array.from({ length: 1000 }, (_, i) => makeQuestion(i));
    const { getByTestId } = render(<QuizCarousel {...defaultProps} questions={manyQuestions} />);
    const { getItemLayout } = getByTestId('QuizCarouselList').props;
    expect(getItemLayout(null, 999)).toEqual({ length: 390, offset: 390 * 999, index: 999 });
  });
});
