import React from 'react';
import { View } from 'react-native';

import { CourseCardSkeleton } from './CourseCardSkeleton';

interface CourseListSkeletonProps {
  /** Number of skeleton cards to render while the list loads. */
  count?: number;
}

/**
 * Placeholder shown while the course list is being fetched. Renders a set of
 * shimmer course cards instead of a blank screen so users know content is
 * loading. Exposed to accessibility services as a progress indicator.
 */
export const CourseListSkeleton = ({ count = 6 }: CourseListSkeletonProps) => {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Loading courses"
    >
      {Array.from({ length: count }).map((_, index) => (
        <CourseCardSkeleton key={index} />
      ))}
    </View>
  );
};

export default CourseListSkeleton;
