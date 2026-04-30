import { Quiz } from '../types/course';

/**
 * Sample quiz data for demoing the Quiz functionality.
 * Linked to sections in sampleCourse.ts
 */
export const sampleQuizzes: Quiz[] = [
  {
    id: 'quiz-section-1',
    sectionId: 'section-1',
    title: 'Getting Started Quiz',
    order: 1,
    passingScore: 70,
    questions: [
      {
        id: 'q1-1',
        type: 'multiple-choice',
        question: 'What is the main advantage of using React Native?',
        options: [
          'Write once, run on iOS and Android',
          'Only works on iOS',
          'Requires separate codebases for each platform',
          'Uses only web technologies',
        ],
        correctAnswer: 0,
        explanation:
          'React Native allows you to write code once and deploy to both iOS and Android platforms.',
        points: 20,
      },
      {
        id: 'q1-2',
        type: 'multiple-choice',
        question: 'Which of the following are benefits of React Native? (Select all that apply)',
        options: [
          'Fast refresh for quick iterations',
          'Large ecosystem and community',
          'Uses native components',
          'Requires learning Swift or Kotlin',
        ],
        multiple: true,
        correctAnswer: [0, 1, 2],
        explanation:
          "React Native provides fast refresh, has a large community, and uses native components. You don't need to learn Swift or Kotlin.",
        points: 20,
      },
      {
        id: 'q1-3',
        type: 'true-false',
        question: 'React Native uses JavaScript and React to build mobile apps.',
        options: ['True', 'False'],
        correctAnswer: 0,
        explanation:
          'Yes, React Native is built on JavaScript and React, allowing web developers to easily transition to mobile development.',
        points: 20,
      },
      {
        id: 'q1-4',
        type: 'multiple-choice',
        question: 'What command do you use to start an Expo project?',
        options: ['npx expo start', 'npm start expo', 'expo run', 'react-native start'],
        correctAnswer: 0,
        explanation: 'The command `npx expo start` is used to start an Expo development server.',
        points: 20,
      },
      {
        id: 'q1-5',
        type: 'multiple-choice',
        question: 'Which tools are needed for React Native development? (Select all that apply)',
        options: [
          'Node.js',
          'Xcode (for iOS) or Android Studio (for Android)',
          'Expo Go app',
          'Python',
        ],
        multiple: true,
        correctAnswer: [0, 1, 2],
        explanation:
          'You need Node.js, platform-specific tools (Xcode/Android Studio), and Expo Go for testing. Python is not required.',
        points: 20,
      },
    ],
  },
  {
    id: 'quiz-section-2',
    sectionId: 'section-2',
    title: 'Core Concepts Quiz',
    order: 1,
    passingScore: 70,
    questions: [
      {
        id: 'q2-1',
        type: 'multiple-choice',
        question: 'Which React Native primitives are used for basic UI? (Select all that apply)',
        options: ['View', 'Text', 'TouchableOpacity', 'div'],
        multiple: true,
        correctAnswer: [0, 1, 2],
        explanation:
          'View, Text, and TouchableOpacity are React Native primitives. "div" is a web HTML element, not used in React Native.',
        points: 20,
      },
      {
        id: 'q2-2',
        type: 'true-false',
        question: 'JSX in React Native is similar to HTML but uses different primitives.',
        options: ['True', 'False'],
        correctAnswer: 0,
        explanation:
          'Yes, JSX syntax is similar to HTML, but React Native uses primitives like View instead of div, and Text instead of p.',
        points: 20,
      },
      {
        id: 'q2-3',
        type: 'multiple-choice',
        question: 'What styling approach does TeachLink use?',
        options: [
          'NativeWind (Tailwind for React Native)',
          'CSS files',
          'Inline styles only',
          'Styled Components',
        ],
        correctAnswer: 0,
        explanation:
          'TeachLink uses NativeWind, which brings Tailwind CSS classes to React Native through className props.',
        points: 20,
      },
      {
        id: 'q2-4',
        type: 'multiple-choice',
        question:
          'Which navigator types are available in React Navigation? (Select all that apply)',
        options: ['Stack Navigator', 'Tab Navigator', 'Drawer Navigator', 'Grid Navigator'],
        multiple: true,
        correctAnswer: [0, 1, 2],
        explanation:
          'React Navigation provides Stack, Tab, and Drawer navigators. There is no Grid Navigator.',
        points: 20,
      },
      {
        id: 'q2-5',
        type: 'multiple-choice',
        question: 'What state management solutions are mentioned for React Native?',
        options: [
          'useState, useReducer, and Zustand',
          'Redux only',
          'Context API only',
          'No state management needed',
        ],
        correctAnswer: 0,
        explanation:
          'React Native supports useState, useReducer, and Zustand. The course mentions using Zustand for app-wide state and hooks for component-specific state.',
        points: 20,
      },
    ],
  },
];

/**
 * Helper function to get quizzes for a specific section
 */
export const getQuizzesForSection = (sectionId: string): Quiz[] => {
  return sampleQuizzes.filter(quiz => quiz.sectionId === sectionId);
};
