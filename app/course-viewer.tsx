import { useLocalSearchParams, useRouter } from 'expo-router';

import { CourseViewerSkeleton } from '@/components/mobile/CourseViewerSkeleton';
import { sampleCourse } from '@/data/sampleCourse';
import { createLazyRoute } from '@/utils/lazyRoute';

const LazyMobileCourseViewer = createLazyRoute({
  importFn: () => import('@/components/mobile/MobileCourseViewer'),
  LoadingFallback: CourseViewerSkeleton,
  boundaryName: 'CourseViewerRoute',
});

const CourseViewerScreen = () => {
  const router = useRouter();
  const { course, courseId, initialLessonId, initialViewMode } = useLocalSearchParams();

  const parsedCourse = course ? JSON.parse(course as string) : courseId ? sampleCourse : null;
  const viewMode = initialViewMode as 'lesson' | 'syllabus' | 'notes' | undefined;

  return (
    <LazyMobileCourseViewer
      course={parsedCourse}
      initialLessonId={initialLessonId as string}
      initialViewMode={viewMode}
      onBack={() => router.back()}
    />
  );
};

export default CourseViewerScreen;
