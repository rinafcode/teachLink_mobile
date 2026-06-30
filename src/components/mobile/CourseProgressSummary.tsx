import React, { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { CourseProgress, Section } from '../../types/course';
import { AppText as Text } from '../common/AppText';

interface CourseLessonListProps {
  sections: Section[];
  progress: CourseProgress | null;
  currentLessonId: string;
  onLessonSelect: (lessonId: string, sectionId: string) => void;
}

const CourseLessonList = memo(
  ({ sections, progress, currentLessonId, onLessonSelect }: CourseLessonListProps) => {
    return (
      <View style={styles.container}>
        {sections.map(section => (
          <View key={section.id} style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.lessons.map((lesson, index) => {
              const isCompleted = progress?.lessons[lesson.id]?.completed ?? false;
              const isCurrent = lesson.id === currentLessonId;

              return (
                <TouchableOpacity
                  key={lesson.id}
                  style={[
                    styles.lessonRow,
                    isCurrent && styles.lessonRowActive,
                  ]}
                  onPress={() => onLessonSelect(lesson.id, section.id)}
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
                    {lesson.duration && (
                      <Text style={styles.lessonDuration}>{lesson.duration}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
    );
  }
);

CourseLessonList.displayName = 'CourseLessonList';

export default CourseLessonList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionBlock: {
    marginBottom: 8,
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