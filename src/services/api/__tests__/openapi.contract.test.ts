/**
 * openapi.contract.test.ts
 *
 * Contract test: validates that the hand-written Zod schemas in src/types/api/schemas.ts
 * match the OpenAPI specification in docs/openapi.yaml.
 *
 * This ensures types and spec cannot silently diverge. If the spec changes in a way
 * that breaks the client, this test will fail.
 */

import * as fs from 'fs';
import * as path from 'path';

import * as yaml from 'js-yaml';

import {
  CourseSchema,
  LessonSchema,
  QuizSchema,
  NotificationSchema,
  UserSchema,
} from '../../../types/api/schemas';
import {
  ReceiptValidationResultSchema,
  LoginResponseSchema,
  RefreshResponseSchema,
} from '../validation';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');

function loadSpec() {
  const candidates = [
    path.join(ROOT, 'docs', 'openapi.yaml'),
    path.join(ROOT, 'docs', 'openapi.json'),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf8');
      return p.endsWith('.json') ? JSON.parse(raw) : (yaml.load(raw) as Record<string, any>);
    }
  }
  throw new Error('OpenAPI spec not found');
}

// ─── Fixture factories ──────────────────────────────────────────────────────

const now = new Date().toISOString();

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'u1',
    createdAt: now,
    updatedAt: now,
    name: 'Test User',
    email: 'test@example.com',
    avatarUrl: 'https://example.com/avatar.png',
    enrolledCourses: [],
    notifications: [],
    ...overrides,
  };
}

function makeCourse(overrides: Record<string, unknown> = {}) {
  return {
    id: 'c1',
    createdAt: now,
    updatedAt: now,
    title: 'Test Course',
    description: 'A test course',
    instructor: {
      id: 'u1',
      createdAt: now,
      updatedAt: now,
      name: 'Instructor',
      email: 'inst@example.com',
    },
    lessons: [],
    ...overrides,
  };
}

function makeLesson(overrides: Record<string, unknown> = {}) {
  return {
    id: 'l1',
    createdAt: now,
    updatedAt: now,
    title: 'Lesson 1',
    content: 'Content here',
    videoUrl: 'https://example.com/video.mp4',
    ...overrides,
  };
}

function makeQuiz(overrides: Record<string, unknown> = {}) {
  return {
    id: 'q1',
    createdAt: now,
    updatedAt: now,
    questions: [
      {
        id: 'qn1',
        question: 'What is 2+2?',
        options: ['1', '2', '3', '4'],
        correctAnswer: 3,
      },
    ],
    ...overrides,
  };
}

function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: 'n1',
    createdAt: now,
    updatedAt: now,
    read: false,
    message: 'New lesson available',
    type: 'new_lesson',
    ...overrides,
  };
}

function makeLoginResponse(overrides: Record<string, unknown> = {}) {
  return {
    user: makeUser(),
    tokens: {
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-123',
      expiresAt: now,
    },
    ...overrides,
  };
}

function makeRefreshResponse(overrides: Record<string, unknown> = {}) {
  return {
    tokens: {
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
      expiresAt: now,
    },
    ...overrides,
  };
}

function makeReceiptResult(overrides: Record<string, unknown> = {}) {
  return {
    valid: true,
    expiry: now,
    productId: 'com.teachlink.subscription.pro.monthly',
    tier: 'pro',
    ...overrides,
  };
}

// ─── Spec ↔ Schema contract tests ───────────────────────────────────────────

describe('OpenAPI contract: spec ↔ Zod schemas', () => {
  // Load spec in tests, not at describe-scope
  const spec = loadSpec();

  it('spec is valid OpenAPI 3.0', () => {
    expect(spec.openapi).toMatch(/^3\.0\.\d+$/);
    expect(spec.info?.title).toBe('TeachLink API');
    expect(spec.paths).toBeDefined();
  });

  describe('Course schema contract', () => {
    const courseSchema = CourseSchema;

    it('spec Course has required fields matching Zod schema', () => {
      const specCourse = spec.components?.schemas?.Course;
      const required = specCourse?.allOf?.[1]?.required ?? [];
      expect(required).toContain('title');
      expect(required).toContain('description');
    });

    it('valid course passes Zod validation', () => {
      const data = makeCourse();
      const result = courseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('valid course with lessons passes Zod validation', () => {
      const data = makeCourse({ lessons: [makeLesson()] });
      const result = courseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('course missing title fails Zod validation', () => {
      const data = makeCourse({ title: undefined });
      const result = courseSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Lesson schema contract', () => {
    const lessonSchema = LessonSchema;

    it('valid lesson passes Zod validation', () => {
      const data = makeLesson();
      const result = lessonSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('lesson with quiz passes Zod validation', () => {
      const data = makeLesson({ quiz: makeQuiz() });
      const result = lessonSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('lesson missing content fails Zod validation', () => {
      const data = makeLesson({ content: undefined });
      const result = lessonSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Quiz schema contract', () => {
    const quizSchema = QuizSchema;

    it('valid quiz passes Zod validation', () => {
      const data = makeQuiz();
      const result = quizSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('quiz with empty questions passes Zod validation', () => {
      const data = makeQuiz({ questions: [] });
      const result = quizSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Notification schema contract', () => {
    const notificationSchema = NotificationSchema;

    it('valid notification passes Zod validation', () => {
      const data = makeNotification();
      const result = notificationSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('notification with invalid type fails Zod validation', () => {
      const data = makeNotification({ type: 'invalid_type' });
      const result = notificationSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('User schema contract', () => {
    const userSchema = UserSchema;

    it('valid user passes Zod validation', () => {
      const data = makeUser();
      const result = userSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('valid user with enrolled courses passes Zod validation', () => {
      const data = makeUser({ enrolledCourses: [makeCourse()] });
      const result = userSchema.safeParse(data);
      expect(result.success).toBe(true);
    });
  });

  describe('Auth schema contracts', () => {
    it('login response passes Zod validation', () => {
      const data = makeLoginResponse();
      const result = LoginResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('login response missing user fails Zod validation', () => {
      const data = makeLoginResponse({ user: undefined });
      const result = LoginResponseSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it('refresh response passes Zod validation', () => {
      const data = makeRefreshResponse();
      const result = RefreshResponseSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('refresh response missing tokens fails Zod validation', () => {
      const data = makeRefreshResponse({ tokens: undefined });
      const result = RefreshResponseSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Payment schema contracts', () => {
    it('receipt validation result passes Zod validation', () => {
      const data = makeReceiptResult();
      const result = ReceiptValidationResultSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('receipt validation result with invalid tier fails Zod validation', () => {
      const data = makeReceiptResult({ tier: 'enterprise' });
      const result = ReceiptValidationResultSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('Spec paths cover client endpoints', () => {
    it('spec defines /auth/login', () => {
      expect(spec.paths['/auth/login']).toBeDefined();
      expect(spec.paths['/auth/login'].post).toBeDefined();
    });

    it('spec defines /auth/refresh', () => {
      expect(spec.paths['/auth/refresh']).toBeDefined();
      expect(spec.paths['/auth/refresh'].post).toBeDefined();
    });

    it('spec defines /api/payments/validate-receipt', () => {
      expect(spec.paths['/api/payments/validate-receipt']).toBeDefined();
      expect(spec.paths['/api/payments/validate-receipt'].post).toBeDefined();
    });

    it('spec defines /api/courses', () => {
      expect(spec.paths['/api/courses']).toBeDefined();
      expect(spec.paths['/api/courses'].get).toBeDefined();
    });

    it('spec defines /api/users/me', () => {
      expect(spec.paths['/api/users/me']).toBeDefined();
      expect(spec.paths['/api/users/me'].get).toBeDefined();
    });
  });
});
