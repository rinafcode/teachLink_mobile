import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useCourseProgress } from '../../../hooks';
import { courseApi } from '../../../services/api/courseApi';
import { AppText } from '../../common/AppText';

interface CourseListItem {
  id: string;
  title: string;
  thumbnail?: string;
  category: string;
  totalLessons: number;
  overallProgress: number;
}

export const ProfileCourseList = React.memo(() => {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async () => {
    try {
      setError(null);
      const data = await courseApi.getCourses();
      setCourses(
        (data || []).map((c: any) => ({
          id: c.id,
          title: c.title,
          thumbnail: c.thumbnail,
          category: c.category,
          totalLessons: c.totalLessons,
          overallProgress: c.overallProgress ?? 0,
        }))
      );
    } catch (err) {
      setError('Failed to load courses.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchCourses();
  }, [fetchCourses]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchCourses();
    setIsRefreshing(false);
  }, [fetchCourses]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color="#19c3e6" />
        <Text style={styles.loadingText}>Loading courses…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (courses.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyText}>No courses yet. Start learning!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.listContainer}>
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#19c3e6"
          colors={['#19c3e6']}
        />
        {courses.map(course => (
          <View key={course.id} style={styles.courseCard}>
            <View style={styles.courseInfo}>
              <AppText style={styles.courseTitle} numberOfLines={1}>
                {course.title}
              </AppText>
              <AppText style={styles.courseCategory}>{course.category}</AppText>
              <View style={styles.progressRow}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.min(100, course.overallProgress)}%` },
                    ]}
                  />
                </View>
                <AppText style={styles.progressText}>
                  {Math.round(course.overallProgress)}%
                </AppText>
              </View>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
});

ProfileCourseList.displayName = 'ProfileCourseList';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f1f5',
  },
  listContainer: {
    paddingTop: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f0f1f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  courseCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  courseInfo: {
    flex: 1,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  courseCategory: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 10,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#19c3e6',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    minWidth: 32,
    textAlign: 'right',
  },
});
