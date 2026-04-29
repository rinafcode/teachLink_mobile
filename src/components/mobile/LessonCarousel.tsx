import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Lesson, CourseProgress } from '../../types/course';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Props for the LessonCarousel component
 */
interface LessonCarouselProps {
  /** Array of lessons to display in the carousel */
  lessons: Lesson[];
  /** ID of the currently active lesson */
  currentLessonId: string;
  /** Course progress data */
  progress?: CourseProgress | null;
  /** Callback when the active lesson changes */
  onLessonChange: (lessonId: string, index: number) => void;
  /** Callback when lesson progress is updated */
  onProgressUpdate?: (lessonId: string, position: number) => void;
  /** Function to render the content for each lesson */
  renderLessonContent: (lesson: Lesson) => React.ReactNode;
  /** Callback when "Next" is clicked on the last lesson */
  onLastLessonNext?: () => void;
  /** Whether the current lesson is the last in its section */
  isLastLessonInSection?: boolean;
}

export default function LessonCarousel({
  lessons,
  currentLessonId,
  progress,
  onLessonChange,
  onProgressUpdate,
  renderLessonContent,
  onLastLessonNext,
  isLastLessonInSection = false,
}: LessonCarouselProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressBarWidth = useRef(new Animated.Value(0)).current;

  // Find initial index
  useEffect(() => {
    const index = lessons.findIndex(lesson => lesson.id === currentLessonId);
    if (index !== -1 && index !== currentIndex) {
      setCurrentIndex(index);
      scrollToIndex(index, false);
    }
  }, [currentLessonId, lessons]);

  // Update progress bar
  useEffect(() => {
    if (progress && lessons.length > 0) {
      const completedCount = lessons.filter(
        lesson => progress.lessons[lesson.id]?.completed
      ).length;
      const progressPercent = (completedCount / lessons.length) * 100;
      Animated.spring(progressBarWidth, {
        toValue: (progressPercent / 100) * SCREEN_WIDTH,
        useNativeDriver: false, // width animation can't use native driver
        tension: 50,
        friction: 7,
      }).start();
    }
  }, [progress, lessons, progressBarWidth]);

  const scrollToIndex = (index: number, animated = true) => {
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: index * SCREEN_WIDTH,
        animated,
      });
    }
  };

  const handleScroll = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);

    if (index !== currentIndex && index >= 0 && index < lessons.length) {
      setCurrentIndex(index);
      const lesson = lessons[index];
      onLessonChange(lesson.id, index);
    }
  };

  const handleMomentumScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);

    if (index >= 0 && index < lessons.length) {
      setCurrentIndex(index);
      const lesson = lessons[index];
      onLessonChange(lesson.id, index);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      scrollToIndex(newIndex);
      setCurrentIndex(newIndex);
      onLessonChange(lessons[newIndex].id, newIndex);
    }
  };

  const goToNext = () => {
    if (currentIndex < lessons.length - 1) {
      const newIndex = currentIndex + 1;
      scrollToIndex(newIndex);
      setCurrentIndex(newIndex);
      onLessonChange(lessons[newIndex].id, newIndex);
    }
  };

  if (lessons.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No lessons available</Text>
      </View>
    );
  }

  const currentLesson = lessons[currentIndex];
  const lessonProgress = progress?.lessons[currentLesson.id];

  return (
    <View style={styles.container}>
      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <Animated.View style={{ width: progressBarWidth, height: '100%' }}>
          <LinearGradient
            colors={['#20afe7', '#2c8aec', '#586ce9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressBarGradient}
          />
        </Animated.View>
      </View>

      {/* Lesson Indicators */}
      <View style={styles.indicatorsContainer}>
        <View style={styles.indicatorsRow}>
          {lessons.map((lesson, index) => {
            const isCompleted = progress?.lessons[lesson.id]?.completed;
            const isCurrent = index === currentIndex;

            return (
              <View
                key={lesson.id}
                style={[
                  styles.indicator,
                  isCurrent && styles.indicatorCurrent,
                  isCompleted && !isCurrent && styles.indicatorCompleted,
                ]}
              />
            );
          })}
        </View>
        <Text style={styles.indicatorText}>
          {currentIndex + 1} / {lessons.length}
        </Text>
      </View>

      {/* Lesson Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>{currentLesson.title}</Text>
        {lessonProgress?.completed && (
          <View style={styles.completedBadge}>
            <View style={styles.completedDot} />
            <Text style={styles.completedText}>✓ Completed</Text>
          </View>
        )}
      </View>

      {/* Swipeable Content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={SCREEN_WIDTH}
        snapToAlignment="center"
        contentContainerStyle={styles.scrollContent}
      >
        {lessons.map((lesson, index) => (
          <View key={lesson.id} style={[styles.lessonContainer, { width: SCREEN_WIDTH }]}>
            <ScrollView
              style={styles.lessonScrollView}
              contentContainerStyle={styles.lessonContent}
              showsVerticalScrollIndicator={true}
            >
              {renderLessonContent(lesson)}
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          onPress={goToPrevious}
          disabled={currentIndex === 0}
          style={[
            styles.navButton,
            styles.previousButton,
            currentIndex === 0 && styles.navButtonDisabled,
          ]}
        >
          <Text style={[styles.navButtonText, currentIndex === 0 && styles.navButtonTextDisabled]}>
            ← Previous
          </Text>
        </TouchableOpacity>

        {currentIndex === lessons.length - 1 ? (
          <TouchableOpacity onPress={onLastLessonNext} style={styles.navButton}>
            <LinearGradient
              colors={['#20afe7', '#2c8aec', '#586ce9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>
                {isLastLessonInSection ? 'Continue →' : 'Next →'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={goToNext} style={styles.navButton}>
            <LinearGradient
              colors={['#20afe7', '#2c8aec', '#586ce9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.nextButtonGradient}
            >
              <Text style={styles.nextButtonText}>Next →</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f1f5',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#e5e7eb',
    overflow: 'hidden',
  },
  progressBarGradient: {
    height: '100%',
    width: '100%',
  },
  indicatorsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  indicatorsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },
  indicatorCurrent: {
    width: 32,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#19c3e6',
  },
  indicatorCompleted: {
    backgroundColor: '#10b981',
  },
  indicatorText: {
    marginLeft: 16,
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  titleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  titleText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    lineHeight: 28,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  completedDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    marginRight: 8,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10b981',
  },
  scrollContent: {
    flexGrow: 1,
  },
  lessonContainer: {
    flex: 1,
    backgroundColor: '#f0f1f5',
  },
  lessonScrollView: {
    flex: 1,
  },
  lessonContent: {
    padding: 16,
    paddingBottom: 32,
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  previousButton: {
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  navButtonDisabled: {
    backgroundColor: '#e5e7eb',
    opacity: 0.5,
  },
  nextButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  navButtonTextDisabled: {
    color: '#9ca3af',
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f1f5',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
  },
});
