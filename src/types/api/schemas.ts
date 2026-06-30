import { z } from 'zod';

const BaseAPISchema = z.object({
  id: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const UserProfileSchema = BaseAPISchema.extend({
  name: z.string(),
  email: z.string().email(),
  avatarUrl: z.string().url().optional(),
});

export const CourseSchema = BaseAPISchema.extend({
  title: z.string(),
  description: z.string(),
  instructor: UserProfileSchema,
  lessons: z.array(z.lazy(() => LessonSchema)),
}).catchall(z.any());

export const LessonSchema = BaseAPISchema.extend({
  title: z.string(),
  content: z.string(),
  videoUrl: z.string().url().optional(),
  quiz: z.lazy(() => QuizSchema).optional(),
}).catchall(z.any());

export const QuizSchema = BaseAPISchema.extend({
  questions: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      options: z.array(z.string()),
      correctAnswer: z.number().int(),
    })
  ),
}).catchall(z.any());

export const NotificationSchema = BaseAPISchema.extend({
  read: z.boolean(),
  message: z.string(),
  type: z.enum(['new_lesson', 'quiz_result', 'system']),
}).catchall(z.any());

export const UserSchema = UserProfileSchema.extend({
  enrolledCourses: z.array(CourseSchema),
  notifications: z.array(NotificationSchema),
}).catchall(z.any());
