/**
 * Tests for #637 — quizStore persistence and resume flow
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuizStore } from '../../store/quizStore';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
  mergeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiRemove: jest.fn(() => Promise.resolve()),
  multiMerge: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  appLogger: { errorSync: jest.fn(), warnSync: jest.fn(), infoSync: jest.fn() },
}));

const QUIZ_SESSION_KEY = '@teachlink_quiz_session';

describe('quizStore — persistence and resume flow (#637)', () => {
  beforeEach(() => {
    useQuizStore.setState({
      session: {
        quizId: null,
        sectionId: null,
        courseId: null,
        currentQuestionIndex: 0,
        selectedAnswers: {},
        startedAt: null,
        answers: {},
        startTime: null,
        selectedOption: null,
      },
      quizId: null,
      quizProgress: {},
    });
    jest.clearAllMocks();
  });

  describe('selectAnswer persistence', () => {
    it('persists answer to AsyncStorage when selected', async () => {
      const { selectAnswer } = useQuizStore.getState();
      
      await useQuizStore.getState().startQuiz('quiz-1', 'section-1', 'course-1');
      
      selectAnswer('question-1', 'answer-a');
      
      // Wait for async persistence
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        QUIZ_SESSION_KEY,
        expect.stringContaining('question-1')
      );
    });

    it('persists multiple answers to AsyncStorage', async () => {
      const { selectAnswer } = useQuizStore.getState();
      
      await useQuizStore.getState().startQuiz('quiz-1', 'section-1', 'course-1');
      
      selectAnswer('question-1', 'answer-a');
      selectAnswer('question-2', 'answer-b');
      selectAnswer('question-3', 'answer-c');
      
      // Wait for async persistence
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(AsyncStorage.setItem).toHaveBeenCalled();
      const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1];
      const storedData = JSON.parse(lastCall[1]);
      
      expect(storedData.data.selectedAnswers).toEqual({
        'question-1': 'answer-a',
        'question-2': 'answer-b',
        'question-3': 'answer-c',
      });
    });

    it('persists multi-select answers as arrays', async () => {
      const { selectAnswer } = useQuizStore.getState();
      
      await useQuizStore.getState().startQuiz('quiz-1', 'section-1', 'course-1');
      
      selectAnswer('question-1', 'answer-a', true);
      selectAnswer('question-1', 'answer-b', true);
      
      // Wait for async persistence
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1];
      const storedData = JSON.parse(lastCall[1]);
      
      expect(storedData.data.selectedAnswers['question-1']).toEqual(['answer-a', 'answer-b']);
    });
  });

  describe('resume after simulated app kill', () => {
    it('retrieves answers from store after state reset', async () => {
      const mockSession = {
        quizId: 'quiz-1',
        sectionId: 'section-1',
        courseId: 'course-1',
        currentQuestionIndex: 2,
        selectedAnswers: {
          'question-1': 'answer-a',
          'question-2': 'answer-b',
        },
        startedAt: new Date().toISOString(),
        answers: {},
        startTime: null,
        selectedOption: null,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify({
          version: 1,
          data: mockSession,
        })
      );

      // Simulate app kill by resetting state
      useQuizStore.setState({
        session: {
          quizId: null,
          sectionId: null,
          courseId: null,
          currentQuestionIndex: 0,
          selectedAnswers: {},
          startedAt: null,
          answers: {},
          startTime: null,
          selectedOption: null,
        },
        quizId: null,
        quizProgress: {},
      });

      // Load progress (simulating app relaunch)
      await useQuizStore.getState().loadQuizProgress('course-1');

      const { session } = useQuizStore.getState();
      
      expect(session.quizId).toBe('quiz-1');
      expect(session.selectedAnswers).toEqual({
        'question-1': 'answer-a',
        'question-2': 'answer-b',
      });
      expect(session.currentQuestionIndex).toBe(2);
    });

    it('clears session if quizId does not match', async () => {
      const mockSession = {
        quizId: 'quiz-2', // Different quiz
        sectionId: 'section-1',
        courseId: 'course-1',
        currentQuestionIndex: 2,
        selectedAnswers: {
          'question-1': 'answer-a',
        },
        startedAt: new Date().toISOString(),
        answers: {},
        startTime: null,
        selectedOption: null,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify({
          version: 1,
          data: mockSession,
        })
      );

      await useQuizStore.getState().loadQuizProgress('course-1');

      // Session should not be restored since it's for a different quiz
      const { session } = useQuizStore.getState();
      
      expect(session.quizId).toBe('quiz-2');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(QUIZ_SESSION_KEY);
    });
  });

  describe('resetQuiz', () => {
    it('clears all quiz state and removes from AsyncStorage', async () => {
      await useQuizStore.getState().startQuiz('quiz-1', 'section-1', 'course-1');
      useQuizStore.getState().selectAnswer('question-1', 'answer-a');
      
      // Wait for async persistence
      await new Promise(resolve => setTimeout(resolve, 0));

      await useQuizStore.getState().resetQuiz();

      const { session, quizId } = useQuizStore.getState();
      
      expect(session.quizId).toBeNull();
      expect(session.selectedAnswers).toEqual({});
      expect(quizId).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith(QUIZ_SESSION_KEY);
    });
  });

  describe('goToQuestion persistence', () => {
    it('persists current question index to AsyncStorage', async () => {
      await useQuizStore.getState().startQuiz('quiz-1', 'section-1', 'course-1');
      
      useQuizStore.getState().goToQuestion(5);
      
      // Wait for async persistence
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1];
      const storedData = JSON.parse(lastCall[1]);
      
      expect(storedData.data.currentQuestionIndex).toBe(5);
    });
  });
});
