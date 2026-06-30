import React, { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { useDynamicFontSize } from '../../hooks/useDynamicFontSize';
import { Course } from '../../types/course';
import { AppText as Text } from '../common/AppText';
import BookmarkButton from "./BookmarkButton";

interface CourseHeaderProps {
  course: Course;
  overallProgress: number;
  isBookmarked: boolean;
  onBack?: () => void;
  onBookmarkToggle: () => void;
}

const CourseHeader = memo(
  ({ course, overallProgress, isBookmarked, onBack, onBookmarkToggle }: CourseHeaderProps) => {
    const { scale } = useDynamicFontSize();

    return (
      <View style={styles.header}>
        <View style={styles.headerContent}>
          {onBack && (
            <TouchableOpacity onPress={onBack} style={styles.backButton}>
              <Text style={styles.backButtonText}>←</Text>
            </TouchableOpacity>
          )}
          <View style={styles.titleContainer}>
            <Text style={styles.title} numberOfLines={1}>
              {course.title}
            </Text>
            <Text style={styles.subtitle}>{overallProgress}% complete</Text>
          </View>
          <BookmarkButton
            isBookmarked={isBookmarked}
            onToggle={onBookmarkToggle}
            size="small"
            showLabel={false}
          />
        </View>

        {/* Progress Bar */}
        <View style={[styles.progressBarContainer, { height: scale(8) }]}>
          <View style={[styles.progressBar, { width: `${overallProgress}%` }]} />
        </View>
      </View>
    );
  }
);

CourseHeader.displayName = 'CourseHeader';

export default CourseHeader;

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  backButtonText: {
    fontSize: 24,
    color: '#6b7280',
  },
  titleContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
    marginTop: 4,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#19c3e6',
  },
});