import { Course, Quiz } from '../types/course';

export type RootStackParamList = {
  Home: undefined;
  Search: undefined;
  Profile: { userId: string };
  Settings: undefined;
  CourseViewer: { course: Course; initialLessonId?: string; initialViewMode?: 'lesson' | 'syllabus' | 'notes' };
  Quiz: { quiz: Quiz; courseId: string; course?: Course };
};
