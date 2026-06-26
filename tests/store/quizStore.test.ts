import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useQuizStore } from '../../src/store/quizStore';
import { Quiz } from '../../src/types/course';

// ─── Mock helpers ─────────────────────────────────────────────────────────────

const MOCK_QUIZ: Quiz = {
  id: 'quiz-01',
  sectionId: 'section-01',
  title: 'React Basics Quiz',
  order: 1,
  passingScore: 70,
  questions: [
    {
      id: 'q1',
      type: 'multiple-choice',
      question: 'What is JSX?',
      options: ['A syntax extension', 'A database', 'A CSS framework', 'None'],
      correctAnswer: 'A syntax extension',
      points: 10,
    },
    {
      id: 'q2',
      type: 'true-false',
      question: 'React uses a virtual DOM.',
      correctAnswer: 'true',
      points: 10,
    },
    {
      id: 'q3',
      type: 'multiple-choice',
      question: 'Multi-select: which are React hooks?',
      options: ['useState', 'useEffect', 'useQuery'],
      multiple: true,
      correctAnswer: ['useState', 'useEffect'],
      points: 20,
    },
  ],
};

const INITIAL_SESSION = {
  quizId: null,
  sectionId: null,
  courseId: null,
  currentQuestionIndex: 0,
  selectedAnswers: {},
  startedAt: null,
};

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('useQuizStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useQuizStore.setState({
      session: { ...INITIAL_SESSION },
      quizProgress: {},
    });
  });

  // ── startQuiz ─────────────────────────────────────────────────────────────

  describe('startQuiz', () => {
    it('initialises a new session with correct ids', async () => {
      await useQuizStore.getState().startQuiz('quiz-01', 'section-01', 'course-01');

      const { session } = useQuizStore.getState();
      expect(session.quizId).toBe('quiz-01');
      expect(session.sectionId).toBe('section-01');
      expect(session.courseId).toBe('course-01');
    });

    it('resets selectedAnswers and currentQuestionIndex to 0', async () => {
      // Simulate a partially answered previous session
      useQuizStore.setState({
        session: { ...INITIAL_SESSION, currentQuestionIndex: 2, selectedAnswers: { q1: 'A' } },
        quizProgress: {},
      });

      await useQuizStore.getState().startQuiz('quiz-02', 'section-02', 'course-01');
      const { session } = useQuizStore.getState();
      expect(session.currentQuestionIndex).toBe(0);
      expect(session.selectedAnswers).toEqual({});
    });

    it('records a startedAt ISO timestamp', async () => {
      await useQuizStore.getState().startQuiz('quiz-01', 'section-01', 'course-01');
      const { session } = useQuizStore.getState();
      expect(session.startedAt).toEqual(expect.any(String));
      expect(() => new Date(session.startedAt!)).not.toThrow();
    });

    it('persists the session to AsyncStorage', async () => {
      await useQuizStore.getState().startQuiz('quiz-01', 'section-01', 'course-01');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        '@teachlink_quiz_session',
        expect.any(String)
      );
    });
  });

  // ── selectAnswer ──────────────────────────────────────────────────────────

  describe('selectAnswer', () => {
    beforeEach(async () => {
      await useQuizStore.getState().startQuiz('quiz-01', 'section-01', 'course-01');
    });

    it('records a single-select answer', () => {
      useQuizStore.getState().selectAnswer('q1', 'A syntax extension');
      const { session } = useQuizStore.getState();
      expect(session.selectedAnswers['q1']).toBe('A syntax extension');
    });

    it('replaces a single-select answer on re-selection', () => {
      useQuizStore.getState().selectAnswer('q1', 'A database');
      useQuizStore.getState().selectAnswer('q1', 'A syntax extension');
      const { session } = useQuizStore.getState();
      expect(session.selectedAnswers['q1']).toBe('A syntax extension');
    });

    it('adds an answer to a multi-select array', () => {
      useQuizStore.getState().selectAnswer('q3', 'useState', true);
      useQuizStore.getState().selectAnswer('q3', 'useEffect', true);
      const { session } = useQuizStore.getState();
      expect(session.selectedAnswers['q3']).toEqual(
        expect.arrayContaining(['useState', 'useEffect'])
      );
    });

    it('removes an answer when toggled off in multi-select', () => {
      useQuizStore.getState().selectAnswer('q3', 'useState', true);
      useQuizStore.getState().selectAnswer('q3', 'useEffect', true);
      useQuizStore.getState().selectAnswer('q3', 'useState', true); // toggle off

      const { session } = useQuizStore.getState();
      const answers = session.selectedAnswers['q3'] as string[];
      expect(answers).not.toContain('useState');
      expect(answers).toContain('useEffect');
    });

    it('removes the key entirely when last multi-select answer is deselected', () => {
      useQuizStore.getState().selectAnswer('q3', 'useState', true);
      useQuizStore.getState().selectAnswer('q3', 'useState', true); // toggle off
      const { session } = useQuizStore.getState();
      expect(session.selectedAnswers['q3']).toBeUndefined();
    });

    it('does not affect answers for other questions', () => {
      useQuizStore.getState().selectAnswer('q1', 'A syntax extension');
      useQuizStore.getState().selectAnswer('q2', 'true');
      const { session } = useQuizStore.getState();
      expect(session.selectedAnswers['q1']).toBe('A syntax extension');
      expect(session.selectedAnswers['q2']).toBe('true');
    });
  });

  // ── goToQuestion ──────────────────────────────────────────────────────────

  describe('goToQuestion', () => {
    it('updates currentQuestionIndex for an active quiz', async () => {
      await useQuizStore.getState().startQuiz('quiz-01', 'section-01', 'course-01');
      useQuizStore.getState().goToQuestion(2);
      expect(useQuizStore.getState().session.currentQuestionIndex).toBe(2);
    });

    it('does nothing when there is no active quiz session', () => {
      useQuizStore.getState().goToQuestion(1);
      expect(useQuizStore.getState().session.currentQuestionIndex).toBe(0);
    });
  });

  // ── completeQuiz ──────────────────────────────────────────────────────────

  describe('completeQuiz', () => {
    beforeEach(async () => {
      await useQuizStore.getState().startQuiz('quiz-01', 'section-01', 'course-01');
    });

    it('returns a passing result when all answers are correct', async () => {
      useQuizStore.getState().selectAnswer('q1', 'A syntax extension');
      useQuizStore.getState().selectAnswer('q2', 'true');
      useQuizStore.getState().selectAnswer('q3', 'useState', true);
      useQuizStore.getState().selectAnswer('q3', 'useEffect', true);

      const { score, passed } = await useQuizStore.getState().completeQuiz(MOCK_QUIZ);
      expect(score).toBe(100);
      expect(passed).toBe(true);
    });

    it('returns a failing result when answers are wrong', async () => {
      useQuizStore.getState().selectAnswer('q1', 'A database'); // wrong
      useQuizStore.getState().selectAnswer('q2', 'false'); // wrong
      // q3 left unanswered

      const { score, passed } = await useQuizStore.getState().completeQuiz(MOCK_QUIZ);
      expect(score).toBe(0);
      expect(passed).toBe(false);
    });

    it('calculates a partial score correctly', async () => {
      // Only q1 correct (10/40 points = 25%)
      useQuizStore.getState().selectAnswer('q1', 'A syntax extension'); // correct
      useQuizStore.getState().selectAnswer('q2', 'false'); // wrong

      const { score, passed } = await useQuizStore.getState().completeQuiz(MOCK_QUIZ);
      expect(score).toBe(25);
      expect(passed).toBe(false);
    });

    it('saves quiz progress and resets the session', async () => {
      useQuizStore.getState().selectAnswer('q1', 'A syntax extension');

      await useQuizStore.getState().completeQuiz(MOCK_QUIZ);

      const state = useQuizStore.getState();
      expect(state.quizProgress['quiz-01']).toBeDefined();
      expect(state.quizProgress['quiz-01'].completed).toBe(true);
      // Session should be reset
      expect(state.session.quizId).toBeNull();
    });

    it('increments attempt counter on each completion', async () => {
      useQuizStore.getState().selectAnswer('q1', 'A syntax extension');
      await useQuizStore.getState().completeQuiz(MOCK_QUIZ);

      // Second attempt
      await useQuizStore.getState().startQuiz('quiz-01', 'section-01', 'course-01');
      useQuizStore.getState().selectAnswer('q1', 'A syntax extension');
      await useQuizStore.getState().completeQuiz(MOCK_QUIZ);

      expect(useQuizStore.getState().quizProgress['quiz-01'].attempts).toBe(2);
    });

    it('throws when called without an active session', async () => {
      useQuizStore.setState({ session: { ...INITIAL_SESSION }, quizProgress: {} });
      await expect(useQuizStore.getState().completeQuiz(MOCK_QUIZ)).rejects.toThrow(
        'No active quiz session'
      );
    });
  });

  // ── resetSession ──────────────────────────────────────────────────────────

  describe('resetSession', () => {
    it('clears the active session state', async () => {
      await useQuizStore.getState().startQuiz('quiz-01', 'section-01', 'course-01');
      await useQuizStore.getState().resetSession();

      const { session } = useQuizStore.getState();
      expect(session.quizId).toBeNull();
      expect(session.selectedAnswers).toEqual({});
      expect(session.startedAt).toBeNull();
    });

    it('removes session from AsyncStorage', async () => {
      await useQuizStore.getState().startQuiz('quiz-01', 'section-01', 'course-01');
      await useQuizStore.getState().resetSession();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@teachlink_quiz_session');
    });
  });

  // ── getQuizProgress / hasCompletedQuiz ───────────────────────────────────

  describe('getQuizProgress and hasCompletedQuiz', () => {
    it('returns null for an uncompleted quiz', () => {
      expect(useQuizStore.getState().getQuizProgress('quiz-99')).toBeNull();
    });

    it('returns false for hasCompletedQuiz on unknown quiz', () => {
      expect(useQuizStore.getState().hasCompletedQuiz('quiz-99')).toBe(false);
    });

    it('returns progress after a quiz is completed', async () => {
      await useQuizStore.getState().startQuiz('quiz-01', 'section-01', 'course-01');
      await useQuizStore.getState().completeQuiz(MOCK_QUIZ);

      const progress = useQuizStore.getState().getQuizProgress('quiz-01');
      expect(progress).not.toBeNull();
      expect(progress?.completed).toBe(true);
    });

    it('returns true for hasCompletedQuiz after completion', async () => {
      await useQuizStore.getState().startQuiz('quiz-01', 'section-01', 'course-01');
      await useQuizStore.getState().completeQuiz(MOCK_QUIZ);
      expect(useQuizStore.getState().hasCompletedQuiz('quiz-01')).toBe(true);
    });
  });
});
