import React, { useEffect, useRef } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import { Question } from '../../../types/course';
import MobileQuestionCard from './MobileQuestionCard';

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

export default function QuizCarousel({
  questions,
  currentQuestionIndex,
  selectedAnswers,
  onQuestionChange,
  onAnswerSelect,
}: QuizCarouselProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Only scroll if not currently being scrolled by user
    if (scrollViewRef.current && !isScrollingRef.current) {
      scrollViewRef.current.scrollTo({
        x: currentQuestionIndex * SCREEN_WIDTH,
        animated: true,
      });
    }
  }, [currentQuestionIndex]);

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Mark as scrolling
    isScrollingRef.current = true;
    
    // Update index if changed
    if (index !== currentQuestionIndex && index >= 0 && index < questions.length) {
      onQuestionChange(index);
    }
    
    // Reset scrolling flag after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 100);
  };

  const handleScrollBeginDrag = () => {
    isScrollingRef.current = true;
  };

  const handleScrollEndDrag = () => {
    // Keep flag true briefly to prevent programmatic scroll interference
    setTimeout(() => {
      isScrollingRef.current = false;
    }, 150);
  };

  const handleMomentumScrollEnd = () => {
    // Scroll has completely finished
    isScrollingRef.current = false;
  };

  if (questions.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="center"
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {questions.map((question, index) => (
          <View key={question.id} style={[styles.cardContainer, { width: SCREEN_WIDTH }]}>
            <MobileQuestionCard
              question={question}
              questionNumber={index + 1}
              totalQuestions={questions.length}
              selectedAnswer={selectedAnswers[question.id]}
              onAnswerSelect={onAnswerSelect}
            />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  cardContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
});
