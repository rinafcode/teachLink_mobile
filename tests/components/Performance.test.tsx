import React from 'react';
import { render } from '@testing-library/react-native';
import MobileSyllabus from '../../src/components/mobile/MobileSyllabus';
import QuizCarousel from '../../src/components/mobile/MobileQuizManager/QuizCarousel';
import LessonCarousel from '../../src/components/mobile/LessonCarousel';
import { MobileSearch } from '../../src/components/mobile/MobileSearch';

// Mock course data for tests
const mockSections = [
  {
    id: 's1',
    title: 'Section 1',
    lessons: Array.from({ length: 100 }).map((_, i) => ({
      id: `l${i}`,
      title: `Lesson ${i}`,
      content: 'Content',
      duration: 10,
    })),
  },
];

const mockQuestions = Array.from({ length: 100 }).map((_, i) => ({
  id: `q${i}`,
  text: `Question ${i}`,
  type: 'multiple-choice' as const,
  options: ['A', 'B', 'C', 'D'],
  correctAnswer: 'A',
}));

describe('List Performance Optimization', () => {
  it('MobileSyllabus uses FlatList with proper optimization props', () => {
    const { getByType } = render(
      <MobileSyllabus
        sections={mockSections}
        onLessonSelect={() => {}}
      />
    );
    const flatList = getByType('FlatList' as any);
    expect(flatList.props.maxToRenderPerBatch).toBe(10);
    expect(flatList.props.windowSize).toBe(5);
    expect(flatList.props.initialNumToRender).toBe(10);
    expect(flatList.props.removeClippedSubviews).toBe(true);
  });

  it('QuizCarousel uses FlatList with proper optimization props', () => {
    const { getByType } = render(
      <QuizCarousel
        questions={mockQuestions}
        currentQuestionIndex={0}
        selectedAnswers={{}}
        onQuestionChange={() => {}}
        onAnswerSelect={() => {}}
      />
    );
    const flatList = getByType('FlatList' as any);
    expect(flatList.props.maxToRenderPerBatch).toBe(10);
    expect(flatList.props.windowSize).toBe(5);
    expect(flatList.props.initialNumToRender).toBe(2);
    expect(flatList.props.removeClippedSubviews).toBe(true);
    expect(flatList.props.getItemLayout).toBeDefined();
  });

  it('LessonCarousel uses FlatList with proper optimization props', () => {
    const { getByType } = render(
      <LessonCarousel
        lessons={mockSections[0].lessons}
        currentLessonId="l0"
        onLessonChange={() => {}}
        renderLessonContent={() => <></>}
      />
    );
    const flatList = getByType('FlatList' as any);
    expect(flatList.props.maxToRenderPerBatch).toBe(10);
    expect(flatList.props.windowSize).toBe(5);
    expect(flatList.props.initialNumToRender).toBe(2);
    expect(flatList.props.removeClippedSubviews).toBe(true);
    expect(flatList.props.getItemLayout).toBeDefined();
  });

  it('MobileSearch uses FlatList with proper optimization props', () => {
    const { getByType } = render(<MobileSearch />);
    const flatList = getByType('FlatList' as any);
    expect(flatList.props.maxToRenderPerBatch).toBe(15);
    expect(flatList.props.windowSize).toBe(5);
    expect(flatList.props.initialNumToRender).toBe(10);
    expect(flatList.props.removeClippedSubviews).toBe(true);
    expect(flatList.props.getItemLayout).toBeDefined();
  });
});
