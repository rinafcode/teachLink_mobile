import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { CourseProgress, Lesson } from '../../types/course';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LessonCarouselProps {
  lessons: Lesson[];
  currentLessonId: string;
  progress?: CourseProgress | null;
  onLessonChange: (lessonId: string, index: number) => void;
  onProgressUpdate?: (lessonId: string, position: number) => void;
  renderLessonContent: (lesson: Lesson) => React.ReactNode;
  onLastLessonNext?: () => void;
  isLastLessonInSection?: boolean;
}

const LessonCarousel = ({
  lessons,
  currentLessonId,
  progress,
  onLessonChange,
  renderLessonContent,
  onLastLessonNext,
  isLastLessonInSection = false,
}: LessonCarouselProps) => {
  const flatListRef = useRef<FlatList<Lesson>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const progressBarWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const index = lessons.findIndex(lesson => lesson.id === currentLessonId);
    if (index >= 0 && index !== currentIndex) {
      setCurrentIndex(index);
      flatListRef.current?.scrollToIndex({ index, animated: false });
    }
  }, [currentLessonId, currentIndex, lessons]);

  useEffect(() => {
    if (!progress || lessons.length === 0) return;

    const completedCount = lessons.filter(lesson => progress.lessons[lesson.id]?.completed).length;
    const progressPercent = (completedCount / lessons.length) * 100;

    Animated.spring(progressBarWidth, {
      toValue: (progressPercent / 100) * SCREEN_WIDTH,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
  }, [lessons, progress, progressBarWidth]);

  const getItemLayout = useCallback(
    (_: ArrayLike<Lesson> | null | undefined, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    []
  );

  const handleMomentumScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const index = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (index < 0 || index >= lessons.length || index === currentIndex) return;

      setCurrentIndex(index);
      onLessonChange(lessons[index].id, index);
    },
    [currentIndex, lessons, onLessonChange]
  );

  const currentLesson = lessons[currentIndex];

  if (lessons.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No lessons available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} testID="LessonCarousel">
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

      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>{currentLesson.title}</Text>
        {progress?.lessons[currentLesson.id]?.completed && (
          <View style={styles.completedBadge}>
            <View style={styles.completedDot} />
            <Text style={styles.completedText}>✓ Completed</Text>
          </View>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={lessons}
        renderItem={({ item }) => (
          <View style={[styles.lessonContainer, { width: SCREEN_WIDTH }]}>
            <View style={styles.lessonContent}>{renderLessonContent(item)}</View>
          </View>
        )}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
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
        testID="LessonCarouselList"
      />

      <View style={styles.navigationContainer}>
        <TouchableOpacity
          onPress={() => {
            if (currentIndex === 0) return;
            const nextIndex = currentIndex - 1;
            flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
            setCurrentIndex(nextIndex);
            onLessonChange(lessons[nextIndex].id, nextIndex);
          }}
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
          <TouchableOpacity
            onPress={() => {
              const nextIndex = currentIndex + 1;
              if (nextIndex >= lessons.length) return;
              flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
              setCurrentIndex(nextIndex);
              onLessonChange(lessons[nextIndex].id, nextIndex);
            }}
            style={styles.navButton}
          >
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
};

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
  lessonContainer: {
    flex: 1,
    backgroundColor: '#f0f1f5',
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

export default LessonCarousel;
