import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Course, Quiz } from '../types/course';

/**
 * Root stack parameter list — single source of truth for all navigable screens.
 * Used to type navigation props, route props, and the linking configuration.
 */
export type RootStackParamList = {
  // ── Tab screens ─────────────────────────────────────────────────────────
  Home: undefined;
  Search: undefined;
  Profile: { userId: string };
  Settings: undefined;
  Achievements: undefined;
  Learning: undefined;
  Community: undefined;
  Messages: undefined;
  Courses: undefined;

  // ── Detail / modal screens ───────────────────────────────────────────────
  /**
   * Full-screen course viewer.
   *
   * @param course          The course to display.
   * @param initialLessonId Optional lesson to open immediately.
   * @param initialViewMode Whether to open in lesson, syllabus, or notes view.
   */
  CourseViewer: {
    course: Course;
    initialLessonId?: string;
    initialViewMode?: 'lesson' | 'syllabus' | 'notes';
  };

  /**
   * Quiz screen.
   *
   * @param quiz     The quiz to take.
   * @param courseId Identifier of the parent course (for progress tracking).
   * @param course   Optional course object used to navigate back to syllabus.
   */
  Quiz: {
    quiz: Quiz;
    courseId: string;
    course?: Course;
  };

  // ── Other detail screens ─────────────────────────────────────────────────
  CourseDetail: { courseId: string };
  Chat: { conversationId: string };
  AchievementDetail: { achievementId: string };
  CommunityPost: { postId: string };
  NotificationSettings: undefined;
};

// ── Convenience navigation-prop aliases ─────────────────────────────────────

/** Generic navigation prop — usable anywhere full-stack navigation is needed. */
export type AppNavigationProp = NativeStackNavigationProp<RootStackParamList>;

/** Narrowed navigation prop for the CourseViewer screen. */
export type CourseViewerNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CourseViewer'
>;

/** Narrowed navigation prop for the Quiz screen. */
export type QuizNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Quiz'
>;

// ── Convenience route-prop aliases ──────────────────────────────────────────

/** Route prop for the CourseViewer screen. */
export type CourseViewerRouteProp = RouteProp<RootStackParamList, 'CourseViewer'>;

/** Route prop for the Quiz screen. */
export type QuizRouteProp = RouteProp<RootStackParamList, 'Quiz'>;

/** Route prop for the Profile screen. */
export type ProfileRouteProp = RouteProp<RootStackParamList, 'Profile'>;
