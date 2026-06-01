import { useLocalSearchParams, useRouter } from 'expo-router';

import { QuizSkeleton } from '@/components/mobile/QuizSkeleton';
import { createLazyRoute } from '@/utils/lazyRoute';

const LazyMobileQuizManager = createLazyRoute({
  importFn: () => import('@/components/mobile/MobileQuizManager'),
  LoadingFallback: QuizSkeleton,
  boundaryName: 'QuizRoute',
});

const QuizScreen = () => {
  const router = useRouter();
  const { quiz, courseId, course } = useLocalSearchParams();

  const parsedQuiz = quiz ? JSON.parse(quiz as string) : null;
  const parsedCourse = course ? JSON.parse(course as string) : null;

  return (
    <LazyMobileQuizManager
      quiz={parsedQuiz}
      courseId={courseId as string}
      course={parsedCourse}
      onBack={() => router.back()}
    />
  );
};

export default QuizScreen;
