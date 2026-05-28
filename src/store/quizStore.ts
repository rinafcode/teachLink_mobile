import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Quiz, QuizProgress } from '../types/course';
import logger from '../utils/logger';
import { isRecord } from './persistence';

const QUIZ_SESSION_KEY = '@teachlink_quiz_session';
const QUIZ_PROGRESS_KEY = '@teachlink_quiz_progress';
const QUIZ_STORAGE_VERSION = 1;
const QUIZ_STORAGE_MIGRATED_KEY = '@teachlink_quiz_storage_migrated_v1';

interface VersionedQuizEnvelope<T> {
  version: number;
  data: T;
}

interface QuizSession {
  quizId: string | null;
  sectionId: string | null;
  courseId: string | null;
  currentQuestionIndex: number;
  selectedAnswers: Record<string, string | number | (string | number)[]>; // questionId -> answer(s)
  startedAt: string | null;
}

function isVersionedQuizEnvelope<T>(value: unknown): value is VersionedQuizEnvelope<T> {
  return isRecord(value) && typeof value.version === 'number' && 'data' in value;
}

async function readQuizStorage<T>(key: string): Promise<T | null> {
  const rawValue = await AsyncStorage.getItem(key);
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (isVersionedQuizEnvelope<T>(parsed)) {
      return parsed.data;
    }

    return parsed as T;
  } catch {
    return null;
  }
}

async function writeVersionedQuizStorage<T>(key: string, data: T): Promise<void> {
  const envelope: VersionedQuizEnvelope<T> = {
    version: QUIZ_STORAGE_VERSION,
    data,
  };

  await AsyncStorage.setItem(key, JSON.stringify(envelope));
}

async function ensureQuizStorageMigrated(): Promise<void> {
  const migrationMarker = await AsyncStorage.getItem(QUIZ_STORAGE_MIGRATED_KEY);
  if (migrationMarker) {
    return;
  }

  const allKeys = await AsyncStorage.getAllKeys();
  const legacyKeys = allKeys.filter(
    (key) => key === QUIZ_SESSION_KEY || key.startsWith(`${QUIZ_PROGRESS_KEY}_`)
  );

  for (const key of legacyKeys) {
    const rawValue = await AsyncStorage.getItem(key);
    if (!rawValue) {
      continue;
    }

    try {
      const parsed = JSON.parse(rawValue) as unknown;
      if (isVersionedQuizEnvelope(parsed)) {
        continue;
      }

      await AsyncStorage.setItem(
        key,
        JSON.stringify({
          version: QUIZ_STORAGE_VERSION,
          data: parsed,
        } as VersionedQuizEnvelope<unknown>)
      );
    } catch {
      // Ignore malformed legacy values; the migration marker still prevents retries.
    }
  }

  await AsyncStorage.setItem(QUIZ_STORAGE_MIGRATED_KEY, String(QUIZ_STORAGE_VERSION));
}

function persistQuizSession(session: QuizSession): void {
  void ensureQuizStorageMigrated()
    .then(() => writeVersionedQuizStorage(QUIZ_SESSION_KEY, session))
    .catch((error) => logger.error('Error saving quiz session:', error));
}

async function saveQuizProgress(
  courseId: string,
  quizProgress: Record<string, QuizProgress>,
): Promise<void> {
  await ensureQuizStorageMigrated();
  await writeVersionedQuizStorage(`${QUIZ_PROGRESS_KEY}_${courseId}`, quizProgress);
}

interface QuizState {
  // Session state (temporary, for active quiz)
  session: QuizSession;
  
  // Progress state (persistent, synced with AsyncStorage)
  quizProgress: Record<string, QuizProgress>; // quizId -> QuizProgress
  
  // Actions
  startQuiz: (quizId: string, sectionId: string, courseId: string) => Promise<void>;
  selectAnswer: (questionId: string, answer: string | number, isMultiSelect?: boolean) => void;
  goToQuestion: (index: number) => void;
  completeQuiz: (quiz: Quiz) => Promise<{ score: number; passed: boolean }>;
  resetSession: () => void;
  loadQuizProgress: (courseId: string) => Promise<void>;
  getQuizProgress: (quizId: string) => QuizProgress | null;
  hasCompletedQuiz: (quizId: string) => boolean;
}

const initialSession: QuizSession = {
  quizId: null,
  sectionId: null,
  courseId: null,
  currentQuestionIndex: 0,
  selectedAnswers: {},
  startedAt: null,
};

export const useQuizStore = create<QuizState>((set, get) => ({
  session: initialSession,
  quizProgress: {},

  startQuiz: async (quizId: string, sectionId: string, courseId: string) => {
    try {
      await ensureQuizStorageMigrated();
      const newSession: QuizSession = {
        quizId,
        sectionId,
        courseId,
        currentQuestionIndex: 0,
        selectedAnswers: {},
        startedAt: new Date().toISOString(),
      };

      set({ session: newSession });

      // Save session to AsyncStorage
      await writeVersionedQuizStorage(QUIZ_SESSION_KEY, newSession);
      
      logger.info('Quiz started:', { quizId, sectionId, courseId });
    } catch (error) {
      logger.error('Error starting quiz:', error);
      throw error;
    }
  },

  selectAnswer: (questionId: string, answer: string | number, isMultiSelect = false) => {
    const { session } = get();
    let updatedAnswer: string | number | (string | number)[];

    if (isMultiSelect) {
      // Multi-select: toggle answer in/out of array
      const currentAnswer = session.selectedAnswers[questionId];
      const currentArray = Array.isArray(currentAnswer) 
        ? currentAnswer 
        : currentAnswer !== undefined 
          ? [currentAnswer] 
          : [];

      const answerIndex = currentArray.indexOf(answer);
      if (answerIndex > -1) {
        // Remove answer if already selected
        updatedAnswer = currentArray.filter((a) => a !== answer);
        // If array becomes empty, remove the key
        if (updatedAnswer.length === 0) {
          const { [questionId]: _, ...rest } = session.selectedAnswers;
          const updatedSession: QuizSession = {
            ...session,
            selectedAnswers: rest,
          };
          set({ session: updatedSession });
          persistQuizSession(updatedSession);
          return;
        }
      } else {
        // Add answer if not selected
        updatedAnswer = [...currentArray, answer];
      }
    } else {
      // Single-select: replace answer
      updatedAnswer = answer;
    }

    const updatedAnswers = {
      ...session.selectedAnswers,
      [questionId]: updatedAnswer,
    };

    const updatedSession: QuizSession = {
      ...session,
      selectedAnswers: updatedAnswers,
    };

    set({ session: updatedSession });

    // Auto-save session
    persistQuizSession(updatedSession);
  },

  goToQuestion: (index: number) => {
    const { session } = get();
    if (session.quizId) {
      const updatedSession: QuizSession = {
        ...session,
        currentQuestionIndex: index,
      };
      set({ session: updatedSession });
      
      persistQuizSession(updatedSession);
    }
  },

  completeQuiz: async (quiz: Quiz) => {
    const { session, quizProgress } = get();
    
    if (!session.quizId || !session.courseId) {
      throw new Error('No active quiz session');
    }

    try {
      await ensureQuizStorageMigrated();
      // Calculate score
      let totalPoints = 0;
      let earnedPoints = 0;

      quiz.questions.forEach((question) => {
        totalPoints += question.points;
        const selectedAnswer = session.selectedAnswers[question.id];
        
        if (selectedAnswer !== undefined) {
          let isCorrect = false;

          if (question.multiple) {
            // Multi-select: compare arrays (order-independent)
            const correctAnswers = Array.isArray(question.correctAnswer)
              ? question.correctAnswer
              : [question.correctAnswer];
            const selectedAnswers = Array.isArray(selectedAnswer)
              ? selectedAnswer
              : [selectedAnswer];

            // Check if arrays have same length and all items match
            if (correctAnswers.length === selectedAnswers.length) {
              const correctSorted = [...correctAnswers].sort();
              const selectedSorted = [...selectedAnswers].sort();
              isCorrect = correctSorted.every(
                (val, idx) => val === selectedSorted[idx]
              );
            }
          } else {
            // Single-select: direct comparison
            isCorrect = selectedAnswer === question.correctAnswer;
          }

          if (isCorrect) {
            earnedPoints += question.points;
          }
        }
      });

      const score = totalPoints > 0 
        ? Math.round((earnedPoints / totalPoints) * 100) 
        : 0;

      const passed = quiz.passingScore 
        ? score >= quiz.passingScore 
        : score >= 70; // Default passing score

      // Get existing progress or create new
      const existingProgress = quizProgress[session.quizId];
      const newProgress: QuizProgress = {
        quizId: session.quizId,
        sectionId: session.sectionId || '',
        completed: true,
        score,
        answers: { ...session.selectedAnswers },
        completedAt: new Date().toISOString(),
        attempts: (existingProgress?.attempts || 0) + 1,
      };

      // Update state
      const updatedProgress = {
        ...quizProgress,
        [session.quizId]: newProgress,
      };

      set({ quizProgress: updatedProgress });

      // Save to AsyncStorage
      await saveQuizProgress(session.courseId, updatedProgress);

      // Clear session
      await AsyncStorage.removeItem(QUIZ_SESSION_KEY);
      set({ session: initialSession });

      logger.info('Quiz completed:', { quizId: session.quizId, score, passed });

      return { score, passed };
    } catch (error) {
      logger.error('Error completing quiz:', error);
      throw error;
    }
  },

  resetSession: async () => {
    try {
      await ensureQuizStorageMigrated();
      await AsyncStorage.removeItem(QUIZ_SESSION_KEY);
      set({ session: initialSession });
    } catch (error) {
      logger.error('Error resetting quiz session:', error);
    }
  },

  loadQuizProgress: async (courseId: string) => {
    try {
      await ensureQuizStorageMigrated();
      const storageKey = `${QUIZ_PROGRESS_KEY}_${courseId}`;
      const stored = await readQuizStorage<Record<string, QuizProgress>>(storageKey);
      
      if (stored) {
        set({ quizProgress: stored });
      } else {
        set({ quizProgress: {} });
      }

      // Also try to restore active session if exists
      const session = await readQuizStorage<QuizSession>(QUIZ_SESSION_KEY);
      if (session) {
        // Only restore if it's for the current course
        if (session.courseId === courseId) {
          set({ session });
        } else {
          // Clear stale session
          await AsyncStorage.removeItem(QUIZ_SESSION_KEY);
        }
      }
    } catch (error) {
      logger.error('Error loading quiz progress:', error);
      set({ quizProgress: {} });
    }
  },

  getQuizProgress: (quizId: string) => {
    const { quizProgress } = get();
    return quizProgress[quizId] || null;
  },

  hasCompletedQuiz: (quizId: string) => {
    const { quizProgress } = get();
    return quizProgress[quizId]?.completed || false;
  },
}));
