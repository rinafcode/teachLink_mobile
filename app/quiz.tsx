import React from 'react';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import QuizScreen from '../src/screens/QuizScreen';

export default function QuizRoute() {
  const params = useLocalSearchParams();
  const navigation = useNavigation();

  const quiz = typeof params.quiz === 'string' ? JSON.parse(params.quiz) : params.quiz;
  const courseId = params.courseId as string;
  const course = typeof params.course === 'string' ? JSON.parse(params.course) : params.course;

  const route = {
    params: { quiz, courseId, course }
  };

  return <QuizScreen route={route as any} navigation={navigation as any} />;
}
