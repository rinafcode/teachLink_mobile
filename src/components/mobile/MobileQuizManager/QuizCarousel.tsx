import React, { useEffect, useRef } from 'react';
import { Dimensions, ScrollView, StyleSheet, View } from 'react-native';
import { useAnalytics } from '../../../hooks/useAnalytics';
import { Question } from '../../../types/course';
import { AnalyticsEvent } from '../../../utils/trackingEvents';
import MobileQuestionCard from './MobileQuestionCard';
import { Question } from '../../../types/course';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface QuizCarouselProps {
  /** Array of quiz questions to display */
  questions: Question[];
  /** Index of the currently visible question */
  currentQuestionIndex: number;
  /** Map of question IDs to selected answers */
  selectedAnswers: Record<string, string | number | (string | number)[]>;
  /** Callback when the current question changes */
  onQuestionChange: (index: number) => void;
  /** Callback when an answer is selected */
  onAnswerSelect: (questionId: string, answer: string | number, isMultiSelect?: boolean) => void;
}

const QuizCarousel = ({
  questions,
  currentQuestionIndex,
  selectedAnswers,
  onQuestionChange,
  onAnswerSelect,
}: QuizCarouselProps) {
  const { trackEvent } = useAnalytics();
  const scrollViewRef = useRef<ScrollView>(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    if (flatListRef.current && !isScrollingRef.current) {
      flatListRef.current.scrollToIndex({ index: currentQuestionIndex, animated: true });
    }
  }, [currentQuestionIndex]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);

    trackEvent(AnalyticsEvent.PERFORMANCE_METRIC, {
      event_category: 'high_frequency',
      event_name: 'quiz_carousel_scroll',
      offsetX: Math.round(offsetX),
      index,
    });

    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Mark as scrolling
    isScrollingRef.current = true;

  const handleMomentumScrollEnd = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    isScrollingRef.current = false;
    if (index !== currentQuestionIndex && index >= 0 && index < questions.length) {
      onQuestionChange(index);
    }
  };

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
        showsHorizontalScrollIndicator={false}
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
