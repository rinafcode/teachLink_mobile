import React, { memo, useCallback } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

import { CourseProgress, Lesson, Section } from '../../types/course';
import { AppText as Text } from '../common/AppText';

interface CourseLessonListProps {
  sections: Section[];
  progress: CourseProgress | null;
  currentLessonId: string;
  onLessonSelect: (lessonId: string, sectionId: string) => void;
}

type ListItem =
  | { type: 'section'; data: Section }
  | { type: 'lesson'; data: { lesson: Lesson; sectionId: string; index: number } };

const CourseLessonList = memo(
  ({ sections, progress, currentLessonId, onLessonSelect }: CourseLessonListProps) => {
    const listData: ListItem[] = sections.flatMap(section => [
      { type: 'section', data: section },
      ...section.lessons.map((lesson, index) => ({
        type: 'lesson',
        data: { lesson, sectionId: section.id, index },
      })),
    ]);

    const keyExtractor = useCallback((item: ListItem) => {
      return item.type === 'section' ? `section-${item.data.id}` : item.data.lesson.id;
    }, []);

    const renderItem = useCallback(
      ({ item }: { item: ListItem }) => {
        if (item.type === 'section') {
          return <Text style={styles.sectionTitle}>{item.data.title}</Text>;
        }

        const { lesson, sectionId, index } = item.data;
        const isCompleted = progress?.lessons[lesson.id]?.completed ?? false;
        const isCurrent = lesson.id === currentLessonId;

        return (
          <TouchableOpacity
            style={[styles.lessonRow, isCurrent && styles.lessonRowActive]}
            onPress={() => onLessonSelect(lesson.id, sectionId)}
            accessibilityRole="button"
            accessibilityState={{ selected: isCurrent }}
            accessibilityLabel={`${lesson.title}, ${isCompleted ? 'completed' : 'incomplete'}`}
          >
            <View
              style={[
                styles.lessonIndicator,
                isCompleted && styles.lessonIndicatorCompleted,
                isCurrent && !isCompleted && styles.lessonIndicatorActive,
              ]}
            >
              {isCompleted ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : (
                <Text style={styles.lessonNumber}>{index + 1}</Text>
              )}
            </View>
            <View style={styles.lessonInfo}>
              <Text
                style={[styles.lessonTitle, isCurrent && styles.lessonTitleActive]}
                numberOfLines={2}
              >
                {lesson.title}
              </Text>
              {lesson.duration && <Text style={styles.lessonDuration}>{lesson.duration}</Text>}
            </View>
          </TouchableOpacity>
        );
      },
      [progress, currentLessonId, onLessonSelect]
    );

    return (
      <FlatList
        data={listData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        style={styles.container}
        removeClippedSubviews
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={21}
      />
    );
  }
);

CourseLessonList.displayName = 'CourseLessonList';

export default CourseLessonList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  lessonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  lessonRowActive: {
    backgroundColor: 'rgba(25, 195, 230, 0.06)',
    borderLeftWidth: 3,
    borderLeftColor: '#19c3e6',
  },
  lessonIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  lessonIndicatorCompleted: {
    backgroundColor: '#19c3e6',
  },
  lessonIndicatorActive: {
    backgroundColor: 'rgba(25, 195, 230, 0.2)',
    borderWidth: 2,
    borderColor: '#19c3e6',
  },
  checkmark: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  lessonNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#374151',
    lineHeight: 20,
  },
  lessonTitleActive: {
    fontWeight: '700',
    color: '#111827',
  },
  lessonDuration: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
    fontWeight: '500',
  },
});