import React from 'react';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import CourseViewerScreen from '../src/screens/CourseViewerScreen';

export default function CourseViewerRoute() {
  const params = useLocalSearchParams();
  const navigation = useNavigation();

  // Handle potentially stringified objects if navigated via expo-router Link/router
  const course = typeof params.course === 'string' ? JSON.parse(params.course) : params.course;
  const initialLessonId = params.initialLessonId as string;
  const initialViewMode = params.initialViewMode as 'lesson' | 'syllabus' | 'notes';

  const route = {
    params: { course, initialLessonId, initialViewMode }
  };

  return <CourseViewerScreen route={route as any} navigation={navigation as any} />;
}
