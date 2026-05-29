import { QuizSkeleton } from '@/src/components/mobile/QuizSkeleton';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { Suspense } from 'react';

const MobileQuizManager = React.lazy(() => import('@/src/components/mobile/MobileQuizManager'));

export default function QuizScreen() {
  const router = useRouter();
  const { quiz, courseId, course } = useLocalSearchParams();

  const parsedQuiz = quiz ? JSON.parse(quiz as string) : null;
  const parsedCourse = course ? JSON.parse(course as string) : null;

  return (
    <Suspense fallback={<QuizSkeleton />}>
      <MobileQuizManager
        quiz={parsedQuiz}
        courseId={courseId as string}
        course={parsedCourse}
        onBack={() => router.back()}
      />
    </Suspense>
  );
}
