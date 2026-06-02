import { getQuizzesForSection } from './sampleQuizzes';
import { Course } from '../types/course';

/**
 * Sample course data for demoing the Mobile Course Viewer.
 * Use this to test: swipeable lessons, progress, syllabus, bookmarks, notes, resume.
 */
export const sampleCourse: Course = {
  id: 'course-demo-1',
  title: 'Introduction to React Native',
  description: 'Learn the fundamentals of building mobile apps with React Native and Expo.',
  instructor: {
    id: 'instructor-1',
    name: 'TeachLink Team',
  },
  category: 'Mobile Development',
  level: 'beginner',
  totalLessons: 6,
  totalDuration: 45,
  sections: [
    {
      id: 'section-1',
      title: 'Getting Started',
      order: 1,
      lessons: [
        {
          id: 'lesson-1',
          title: 'What is React Native?',
          content:
            'React Native lets you build mobile apps using JavaScript and React. You can use the same codebase for iOS and Android, and it uses native components for a smooth experience.\n\nKey benefits:\n• Write once, run on iOS and Android\n• Fast refresh for quick iterations\n• Large ecosystem and community',
          duration: 5,
          order: 1,
        },
        {
          id: 'lesson-2',
          title: 'Setting Up Your Environment',
          content:
            'You need Node.js, npm or yarn, and either Xcode (for iOS) or Android Studio (for Android). Expo simplifies setup—install Expo Go on your device and run `npx expo start` to get going.\n\nWe use Expo in TeachLink for a smooth development experience.',
          duration: 8,
          order: 2,
        },
      ],
      quizzes: getQuizzesForSection('section-1'),
    },
    {
      id: 'section-2',
      title: 'Core Concepts',
      order: 2,
      lessons: [
        {
          id: 'lesson-3',
          title: 'Components and JSX',
          content:
            'React Native uses components—reusable pieces of UI. You write them with JSX, similar to HTML but using primitives like View, Text, and TouchableOpacity.\n\nExample: <View><Text>Hello!</Text></View>',
          duration: 7,
          order: 3,
        },
        {
          id: 'lesson-4',
          title: 'Styling with NativeWind',
          content:
            'TeachLink uses NativeWind (Tailwind for React Native) for styling. Use className like in web Tailwind: "flex-1 bg-white p-4 rounded-lg".',
          duration: 6,
          order: 4,
        },
        {
          id: 'lesson-5',
          title: 'Navigation',
          content:
            'React Navigation handles screens and navigation. Use Stack, Tab, or Drawer navigators. Our app uses a stack for Home, Profile, Settings, and CourseViewer.',
          duration: 10,
          order: 5,
        },
        {
          id: 'lesson-6',
          title: 'State and Data',
          content:
            'Use useState, useReducer, or Zustand for state. We use Zustand for app-wide state (theme, user) and hooks like useCourseProgress for course-specific data.',
          duration: 9,
          order: 6,
        },
      ],
      quizzes: getQuizzesForSection('section-2'),
    },
  ],
};
