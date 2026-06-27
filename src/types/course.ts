export interface Lesson {
  id: string;
  title: string;
  content: string;
  duration: number; // in minutes
  videoUrl?: string;
  resources?: Resource[];
  order: number;
}

export interface Resource {
  id: string;
  title: string;
  url: string;
  type: 'pdf' | 'link' | 'code' | 'image';
  width?: number;
  height?: number;
}

export interface Section {
  id: string;
  title: string;
  lessons: Lesson[];
  quizzes?: Quiz[]; // Quizzes for this section
  order: number;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: {
    id: string;
    name: string;
    avatar?: string;
    avatarWidth?: number;
    avatarHeight?: number;
  };
  thumbnail?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  sections: Section[];
  totalLessons: number;
  totalDuration: number; // in minutes
  level: 'beginner' | 'intermediate' | 'advanced';
  category: string;
}

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  lastPosition: number; // timestamp in seconds for video/audio, or scroll position
  completedAt?: string;
  timeSpent: number; // in seconds
}

export interface Quiz {
  id: string;
  sectionId: string;
  title: string;
  questions: Question[];
  order: number;
  passingScore?: number; // e.g., 70
}

export interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  question: string;
  options?: string[]; // for multiple choice
  multiple?: boolean; // true for multi-select questions
  correctAnswer: string | number | (string | number)[]; // single answer or array for multi-select
  explanation?: string;
  points: number;
}

export interface QuizProgress {
  quizId: string;
  sectionId: string;
  completed: boolean;
  score?: number; // Percentage score (0-100)
  answers: Record<string, string | number | (string | number)[]>; // questionId -> selected answer(s)
  completedAt?: string;
  attempts: number;
}

export interface CourseProgress {
  courseId: string;
  currentLessonId: string;
  currentSectionId: string;
  lessons: Record<string, LessonProgress>;
  quizzes: Record<string, QuizProgress>; // quizId -> QuizProgress
  overallProgress: number; // 0-100
  lastAccessed: string;
  bookmarks: string[]; // lesson IDs
  notes: Record<string, Note[]>; // lessonId -> notes
}

export interface Note {
  id: string;
  lessonId: string;
  content: string;
  timestamp: number; // position in lesson
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  courseId: string;
  lessonId: string;
  createdAt: string;
  note?: string;
}
