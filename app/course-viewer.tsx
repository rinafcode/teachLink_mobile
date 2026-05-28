import { CourseViewerSkeleton } from '@/src/components/mobile/CourseViewerSkeleton';
import { sampleCourse } from '@/src/data/sampleCourse';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { Suspense } from 'react';

const MobileCourseViewer = React.lazy(() => import('@/src/components/mobile/MobileCourseViewer'));

export default function CourseViewerScreen() {
  const router = useRouter();
  const { course, courseId, initialLessonId, initialViewMode } = useLocalSearchParams();

  const parsedCourse = course ? JSON.parse(course as string) : courseId ? sampleCourse : null;
  const viewMode = initialViewMode as 'lesson' | 'syllabus' | 'notes' | undefined;

  return (
    <Suspense fallback={<CourseViewerSkeleton />}>
      <MobileCourseViewer
        course={parsedCourse}
        initialLessonId={initialLessonId as string}
        initialViewMode={viewMode}
        onBack={() => router.back()}
      />
    </Suspense>
  );
}
