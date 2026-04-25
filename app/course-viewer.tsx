import MobileCourseViewer from '@/src/components/mobile/MobileCourseViewer';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

export default function CourseViewerScreen() {
  const router = useRouter();
  const { course, initialLessonId, initialViewMode } = useLocalSearchParams();

  const parsedCourse = course ? JSON.parse(course as string) : null;
  
  // Type assertion for ViewMode
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
