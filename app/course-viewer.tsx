import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import MobileCourseViewer from '../src/components/mobile/MobileCourseViewer';
import { Course } from '../src/types/course';

export default function CourseViewerScreen() {
  const router = useRouter();
  const { course, initialLessonId, initialViewMode } = useLocalSearchParams<{
    course: string;
    initialLessonId?: string;
    initialViewMode?: 'lesson' | 'syllabus' | 'notes';
  }>();

  const parsedCourse: Course = JSON.parse(course!);

  // Create a navigation adapter that provides the methods the component expects
  const navigationAdapter = {
    navigate: (screen: string, params?: any) => {
      if (screen === 'Quiz' && params) {
        router.push({
          pathname: '/quiz',
          params: {
            quiz: JSON.stringify(params.quiz),
            courseId: params.courseId,
            course: JSON.stringify(params.course)
          }
        });
      }
    },
    goBack: () => router.back(),
    // Add other navigation methods if needed by the component
  };

  return (
    <MobileCourseViewer
      course={parsedCourse}
      initialLessonId={initialLessonId}
      initialViewMode={initialViewMode}
      onBack={() => router.back()}
      navigation={navigationAdapter as any}
    />
  );
}
