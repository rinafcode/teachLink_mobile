import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { lazy, Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';

const MobileCourseViewer = lazy(() => import('@/src/components/mobile/MobileCourseViewer'));

export default function CourseViewerScreen() {
  const router = useRouter();
  const { course, initialLessonId, initialViewMode } = useLocalSearchParams();

  const parsedCourse = course ? JSON.parse(course as string) : null;
  const viewMode = initialViewMode as 'lesson' | 'syllabus' | 'notes' | undefined;

  return (
    <Suspense fallback={<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator /></View>}>
      <MobileCourseViewer
        course={parsedCourse}
        initialLessonId={initialLessonId as string}
        initialViewMode={viewMode}
        onBack={() => router.back()}
      />
    </Suspense>
  );
}
