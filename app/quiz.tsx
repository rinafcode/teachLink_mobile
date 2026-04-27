import { lazyScreen } from '@/src/utils/LazyScreen';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

const MobileQuizManager = lazyScreen(
  () => import('@/src/components/mobile/MobileQuizManager')
);

export default function QuizScreen() {
  const router = useRouter();
  const { quiz, courseId, course } = useLocalSearchParams();

  const parsedQuiz = quiz ? JSON.parse(quiz as string) : null;
  const parsedCourse = course ? JSON.parse(course as string) : null;

  return (
    <MobileQuizManager
      quiz={parsedQuiz}
      courseId={courseId as string}
      course={parsedCourse}
      onBack={() => router.back()}
    />
  );
}
