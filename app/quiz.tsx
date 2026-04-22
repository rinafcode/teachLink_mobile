import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import MobileQuizManager from '../src/components/mobile/MobileQuizManager';
import { Quiz, Course } from '../src/types/course';

export default function QuizScreen() {
  const router = useRouter();
  const { quiz, courseId, course } = useLocalSearchParams<{
    quiz: string;
    courseId: string;
    course?: string;
  }>();

  const parsedQuiz: Quiz = JSON.parse(quiz!);
  const parsedCourse: Course = course ? JSON.parse(course) : undefined;

  // Create a navigation adapter that provides the methods the component expects
  const navigationAdapter = {
    goBack: () => router.back(),
    // Add other navigation methods if needed by the component
  };

  return (
    <MobileQuizManager
      quiz={parsedQuiz}
      courseId={courseId!}
      course={parsedCourse}
      navigation={navigationAdapter as any}
      onBack={() => router.back()}
    />
  );
}
