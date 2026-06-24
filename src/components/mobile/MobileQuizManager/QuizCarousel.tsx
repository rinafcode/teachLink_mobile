Here is the completely resolved `QuizCarousel.tsx`. It keeps the improved typing and `activeIndex` state from `main`, while successfully preserving the analytics tracking from your feature branch.

Copy and paste this entire code block:

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';

import MobileQuestionCard from './MobileQuestionCard';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { Question } from '../../../types/course';
import { AnalyticsEvent } from '../../../utils/trackingEvents';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface QuizCarouselProps {
  questions: Question[];
  currentQuestionIndex: number;
  selectedAnswers: Record<string, string | number | (string | number)[]>;
  onQuestionChange: (index: number) => void;
  onAnswerSelect: (questionId: string, answer: string | number, isMultiSelect?: boolean) => void;
}

const QuizCarousel = ({
  questions,
  currentQuestionIndex,
  selectedAnswers,
  onQuestionChange,
  onAnswerSelect,
}: QuizCarouselProps) => {
  const { trackEvent } = useAnalytics();
  const flatListRef = useRef<FlatList<Question>>(null);
  const [activeIndex, setActiveIndex] = useState(currentQuestionIndex);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    if (currentQuestionIndex !== activeIndex) {
      setActiveIndex(currentQuestionIndex);
      if (!isScrollingRef.current) {
        flatListRef.current?.scrollToIndex({ index: currentQuestionIndex, animated: true });
      }
    }
  }, [activeIndex, currentQuestionIndex]);

  const trackScrollAnalytics = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);

    trackEvent(AnalyticsEvent.PERFORMANCE_METRIC, {
      event_category: 'high_frequency',
      event_name: 'quiz_carousel_scroll',
      offsetX: Math.round(offsetX),
      index,
    });

    isScrollingRef.current = true;
  };

  const getItemLayout = useCallback(
    (_: ArrayLike<Question> | null | undefined, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    []
  );

  const handleMomentumScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      isScrollingRef.current = false;
      const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (index < 0 || index >= questions.length || index === activeIndex) return;

      setActiveIndex(index);
      onQuestionChange(index);
    },
    [activeIndex, onQuestionChange, questions.length]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Question; index: number }) => (
      <View style={styles.cardContainer}>
        <MobileQuestionCard
          question={item}
          questionNumber={index + 1}
          totalQuestions={questions.length}
          selectedAnswer={selectedAnswers[item.id]}
          onAnswerSelect={onAnswerSelect}
        />
      </View>
    ),
    [questions.length, selectedAnswers, onAnswerSelect]
  );

  if (questions.length === 0) return null;

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={questions}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        removeClippedSubviews={true}
        showsHorizontalScrollIndicator={false}
        onScroll={trackScrollAnalytics}
        onScrollBeginDrag={() => {
          isScrollingRef.current = true;
        }}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="center"
        getItemLayout={getItemLayout}
        windowSize={3}
        maxToRenderPerBatch={1}
        initialNumToRender={1}
        removeClippedSubviews
        bounces={false}
        testID="QuizCarouselList"
      />
    </View>
  );
};

export default QuizCarousel;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cardContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});
```