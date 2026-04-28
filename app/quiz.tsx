import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { lazy, Suspense } from 'react';
import { ActivityIndicator, View } from 'react-native';

const MobileQuizManager = lazy(() => import('@/src/components/mobile/MobileQuizManager'));

export default function QuizScreen() {
  const router = useRouter();
  const { quiz, courseId, course } = useLocalSearchParams();

  const parsedQuiz = quiz ? JSON.parse(quiz as string) : null;
  const parsedCourse = course ? JSON.parse(course as string) : null;

  return (
    <Suspense
      fallback={
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      }
    >
      <MobileQuizManager
        quiz={parsedQuiz}
        courseId={courseId as string}
        course={parsedCourse}
        onBack={() => router.back()}
      />
    </Suspense>
  );
}
