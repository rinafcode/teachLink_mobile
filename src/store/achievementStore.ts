import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { asyncStorageJSONStorage, isRecord, unwrapPersistedState } from './persistence';
import { useReviewStore } from './reviewStore';
import { inAppReviewService, ReviewTrigger } from '../services/inAppReview';

const triggerAchievementReview = () => {
  const { incrementAchievementsUnlocked, getMetrics, recordReviewRequest } = useReviewStore.getState();
  incrementAchievementsUnlocked();
  inAppReviewService.requestReview(ReviewTrigger.ACHIEVEMENT_UNLOCKED, getMetrics()).then((result) => {
    recordReviewRequest(ReviewTrigger.ACHIEVEMENT_UNLOCKED, result.shown, result.reason);
  });
};

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  name: string;
  description?: string;
  iconUrl?: string;
  emoji?: string;
  rarity?: BadgeRarity;
  unlockedAt?: string;
  isLocked?: boolean;
  progress?: { current: number; total: number };
}

export enum AchievementType {
  FIRST_LESSON = 'first_lesson',
  WEEK_STREAK = 'week_streak',
  TEN_COURSES = 'ten_courses',
  FIFTY_CONNECTIONS = 'fifty_connections',
  HUNDRED_HOURS = 'hundred_hours',
  TOP_ONE_PERCENT = 'top_one_percent',
  MENTOR = 'mentor',
  SPEED_RUN = 'speed_run',
}

interface AchievementState {
  achievements: Achievement[];
  achievementProgress: Record<string, AchievementProgress>;
  unlockedCount: number;
  loadAchievements: () => void;
  unlockAchievement: (id: string) => void;
  updateProgress: (id: string, current: number) => void;
  isAchievementUnlocked: (id: string) => boolean;
  getUnlockedAchievements: () => Achievement[];
  resetAchievements: () => void;
  initializeAchievements: (achievements: Achievement[]) => void;
}

interface AchievementProgress {
  isLocked?: boolean;
  unlockedAt?: string;
  progress?: { current: number; total: number };
}

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: AchievementType.FIRST_LESSON,
    name: 'First Steps',
    emoji: '\u{1F9E3}',
    rarity: 'common',
    description: 'Completed your very first lesson.',
    isLocked: true,
  },
  {
    id: AchievementType.WEEK_STREAK,
    name: 'Week Warrior',
    emoji: '\u{1F525}',
    rarity: 'rare',
    description: 'Maintained a 7-day learning streak.',
    isLocked: true,
  },
  {
    id: AchievementType.TEN_COURSES,
    name: 'Course Champion',
    emoji: '\u{1F3C6}',
    rarity: 'epic',
    description: 'Successfully completed 10 courses.',
    isLocked: true,
    progress: { current: 0, total: 10 },
  },
  {
    id: AchievementType.FIFTY_CONNECTIONS,
    name: 'Social Star',
    emoji: '\u{2B50}',
    rarity: 'rare',
    description: 'Built a network of 50 connections.',
    isLocked: true,
    progress: { current: 0, total: 50 },
  },
  {
    id: AchievementType.HUNDRED_HOURS,
    name: 'Deep Diver',
    emoji: '\u{1F93F}',
    rarity: 'common',
    description: 'Accumulated 100+ hours of learning.',
    isLocked: true,
    progress: { current: 0, total: 100 },
  },
  {
    id: AchievementType.TOP_ONE_PERCENT,
    name: 'Legend',
    emoji: '\u{1F451}',
    rarity: 'legendary',
    description: 'Reach the top 1% of all learners.',
    isLocked: true,
    progress: { current: 0, total: 10 },
  },
  {
    id: AchievementType.MENTOR,
    name: 'Mentor',
    emoji: '\u{1F393}',
    rarity: 'epic',
    description: 'Help 20 other learners succeed.',
    isLocked: true,
    progress: { current: 0, total: 20 },
  },
  {
    id: AchievementType.SPEED_RUN,
    name: 'Speed Run',
    emoji: '\u26A1}',
    rarity: 'rare',
    description: 'Complete an entire course in one day.',
    isLocked: true,
  },
];

const DEFAULT_ACHIEVEMENT_BY_ID = Object.fromEntries(
  DEFAULT_ACHIEVEMENTS.map(achievement => [achievement.id, achievement])
) as Record<string, Achievement>;

function buildAchievementsFromProgress(
  progressById: Record<string, AchievementProgress>
): Achievement[] {
  return DEFAULT_ACHIEVEMENTS.map(achievement => {
    const progress = progressById[achievement.id];
    if (!progress) {
      return achievement;
    }

    return {
      ...achievement,
      ...(progress.isLocked !== undefined ? { isLocked: progress.isLocked } : {}),
      ...(progress.unlockedAt !== undefined ? { unlockedAt: progress.unlockedAt } : {}),
      ...(progress.progress ? { progress: progress.progress } : {}),
    };
  });
}

function snapshotAchievementProgress(
  achievements: Achievement[]
): Record<string, AchievementProgress> {
  return achievements.reduce<Record<string, AchievementProgress>>((snapshot, achievement) => {
    const defaultAchievement = DEFAULT_ACHIEVEMENT_BY_ID[achievement.id];
    if (!defaultAchievement) {
      snapshot[achievement.id] = {
        isLocked: achievement.isLocked,
        unlockedAt: achievement.unlockedAt,
        progress: achievement.progress,
      };
      return snapshot;
    }

    const progress: AchievementProgress = {};

    if (achievement.isLocked !== defaultAchievement.isLocked) {
      progress.isLocked = achievement.isLocked;
    }

    if (achievement.unlockedAt !== defaultAchievement.unlockedAt) {
      progress.unlockedAt = achievement.unlockedAt;
    }

    const currentProgress = achievement.progress;
    const defaultProgress = defaultAchievement.progress;
    const progressChanged =
      !!currentProgress !== !!defaultProgress ||
      (currentProgress !== undefined &&
        defaultProgress !== undefined &&
        (currentProgress.current !== defaultProgress.current ||
          currentProgress.total !== defaultProgress.total));

    if (progressChanged && currentProgress) {
      progress.progress = currentProgress;
    }

    if (Object.keys(progress).length > 0) {
      snapshot[achievement.id] = progress;
    }

    return snapshot;
  }, {});
}

function parseAchievementProgressMap(value: unknown): Record<string, AchievementProgress> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, AchievementProgress>>(
    (snapshot, [id, entry]) => {
      if (!isRecord(entry)) {
        return snapshot;
      }

      const progress: AchievementProgress = {};

      if (typeof entry.isLocked === 'boolean') {
        progress.isLocked = entry.isLocked;
      }

      if (typeof entry.unlockedAt === 'string') {
        progress.unlockedAt = entry.unlockedAt;
      }

      if (isRecord(entry.progress)) {
        const current = entry.progress.current;
        const total = entry.progress.total;
        if (typeof current === 'number' && typeof total === 'number') {
          progress.progress = { current, total };
        }
      }

      if (Object.keys(progress).length > 0) {
        snapshot[id] = progress;
      }

      return snapshot;
    },
    {}
  );
}

function normalizeAchievementState(rawState: unknown): {
  achievements: Achievement[];
  achievementProgress: Record<string, AchievementProgress>;
  unlockedCount: number;
} {
  const persistedState = unwrapPersistedState<Partial<AchievementState>>(rawState) ?? {};
  const legacyAchievements = Array.isArray(persistedState.achievements)
    ? persistedState.achievements
    : null;
  const persistedProgress = parseAchievementProgressMap(persistedState.achievementProgress);
  const legacyProgress = legacyAchievements ? snapshotAchievementProgress(legacyAchievements) : {};
  const mergedProgress = { ...legacyProgress, ...persistedProgress };
  const achievements = buildAchievementsFromProgress(mergedProgress);
  const unlockedCount =
    typeof persistedState.unlockedCount === 'number'
      ? persistedState.unlockedCount
      : achievements.filter(achievement => !achievement.isLocked).length;

  return {
    achievements,
    achievementProgress: mergedProgress,
    unlockedCount,
  };
}

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set, get) => ({
      achievements: buildAchievementsFromProgress({}),
      achievementProgress: {},
      unlockedCount: 0,
      isLoaded: false,

      loadAchievements: () => {
        const { isLoaded, achievements } = get();
        if (isLoaded) return;
        set({
          achievements: achievements.length > 0 ? achievements : DEFAULT_ACHIEVEMENTS,
          isLoaded: true,
        });
      },

      unlockAchievement: (id: string) =>
        set(state => {
          const achievement = state.achievements.find(a => a.id === id);
          if (!achievement || !achievement.isLocked) return state;

          const updatedAchievements = state.achievements.map(a =>
            a.id === id
              ? {
                  ...a,
                  isLocked: false,
                  unlockedAt: new Date().toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric',
                  }),
                }
              : a
          );

          setTimeout(triggerAchievementReview, 500);

          return {
            achievements: updatedAchievements,
            achievementProgress: snapshotAchievementProgress(updatedAchievements),
            unlockedCount: updatedAchievements.filter(a => !a.isLocked).length,
          };
        }),

      updateProgress: (id: string, current: number) =>
        set(state => {
          const achievement = state.achievements.find(a => a.id === id);
          if (!achievement || !achievement.isLocked) return state;

          const updatedAchievements = state.achievements.map(a => {
            if (a.id !== id) return a;

            const progress = a.progress ? { ...a.progress, current } : { current, total: 1 };

            if (progress.current >= progress.total) {
              setTimeout(triggerAchievementReview, 500);
              return {
                ...a,
                isLocked: false,
                unlockedAt: new Date().toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric',
                }),
                progress,
              };
            }

            return { ...a, progress };
          });

          return {
            achievements: updatedAchievements,
            achievementProgress: snapshotAchievementProgress(updatedAchievements),
            unlockedCount: updatedAchievements.filter(a => !a.isLocked).length,
          };
        }),

      isAchievementUnlocked: (id: string) => {
        const achievement = get().achievements.find(a => a.id === id);
        return achievement ? !achievement.isLocked : false;
      },

      getUnlockedAchievements: () => {
        return get().achievements.filter(a => !a.isLocked);
      },

      resetAchievements: () =>
        set({
          achievements: buildAchievementsFromProgress({}),
          achievementProgress: {},
          unlockedCount: 0,
        }),

      initializeAchievements: (achievements: Achievement[]) =>
        set({
          achievements,
          achievementProgress: snapshotAchievementProgress(achievements),
          unlockedCount: achievements.filter(a => !a.isLocked).length,
        }),
    }),
    {
      name: 'achievement-storage',
      version: 1,
      storage: asyncStorageJSONStorage,
      partialize: state => ({
        achievementProgress: state.achievementProgress,
        unlockedCount: state.unlockedCount,
        isLoaded: state.isLoaded,
      }),
      migrate: persistedState => normalizeAchievementState(persistedState),
      merge: (persistedState, currentState) => {
        const normalizedState = normalizeAchievementState(persistedState);
        return {
          ...currentState,
          ...normalizedState,
        };
      },
    }
  )
);
