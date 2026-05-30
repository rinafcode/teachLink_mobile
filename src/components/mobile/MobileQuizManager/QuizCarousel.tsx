import React, { useCallback, useEffect, useRef } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';

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
}: QuizCarouselProps): React.JSX.Element | null => {
  const flatListRef = useRef<FlatList<Question>>(null);
  const isScrollingRef = useRef(false);

  useEffect(() => {
    if (flatListRef.current && !isScrollingRef.current) {
      flatListRef.current.scrollToIndex({ index: currentQuestionIndex, animated: true });
    }
  }, [currentQuestionIndex]);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index }),
    []
  );

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
