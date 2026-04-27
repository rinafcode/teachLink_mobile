import { lazyScreen } from '@/src/utils/LazyScreen';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

const MobileCourseViewer = lazyScreen(
  () => import('@/src/components/mobile/MobileCourseViewer')
);

export default function CourseViewerScreen() {
  const router = useRouter();
  const { course, initialLessonId, initialViewMode } = useLocalSearchParams();

  const parsedCourse = course ? JSON.parse(course as string) : null;
  const viewMode = initialViewMode as 'lesson' | 'syllabus' | 'notes' | undefined;

  return (
    <MobileCourseViewer
      course={parsedCourse}
      initialLessonId={initialLessonId as string}
      initialViewMode={viewMode}
      onBack={() => router.back()}
    />
  );
}
