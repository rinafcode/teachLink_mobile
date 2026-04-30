import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Rarity levels for achievement badges
 */
export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * Achievement data structure
 */
export interface Achievement {
  /** Unique identifier for the achievement */
  id: string;
  /** Display name of the achievement */
  name: string;
  /** Description of what the achievement represents */
  description?: string;
  /** URL to an icon image for the achievement */
  iconUrl?: string;
  /** Emoji to display as the achievement icon */
  emoji?: string;
  /** Rarity level of the achievement */
  rarity?: BadgeRarity;
  /** Date when the achievement was unlocked */
  unlockedAt?: string;
  /** Whether the achievement is locked/not yet earned */
  isLocked?: boolean;
  /** Progress towards unlocking the achievement */
  progress?: { current: number; total: number };
}

/**
 * Achievement type definitions for tracking
 */
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
  /** Array of all achievements (both locked and unlocked) */
  achievements: Achievement[];
  /** Number of unlocked achievements */
  unlockedCount: number;
  
  // Actions
  /** Unlock an achievement by ID */
  unlockAchievement: (id: string) => void;
  /** Update progress on an achievement */
  updateProgress: (id: string, current: number) => void;
  /** Check if an achievement is unlocked */
  isAchievementUnlocked: (id: string) => boolean;
  /** Get all unlocked achievements */
  getUnlockedAchievements: () => Achievement[];
  /** Reset all achievements (for testing) */
  resetAchievements: () => void;
  /** Initialize achievements with default set */
  initializeAchievements: (achievements: Achievement[]) => void;
}

/**
 * Default achievements available in the app
 */
export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: AchievementType.FIRST_LESSON,
    name: 'First Steps',
    emoji: '👣',
    rarity: 'common',
    description: 'Completed your very first lesson.',
    isLocked: true,
  },
  {
    id: AchievementType.WEEK_STREAK,
    name: 'Week Warrior',
    emoji: '🔥',
    rarity: 'rare',
    description: 'Maintained a 7-day learning streak.',
    isLocked: true,
  },
  {
    id: AchievementType.TEN_COURSES,
    name: 'Course Champion',
    emoji: '🏆',
    rarity: 'epic',
    description: 'Successfully completed 10 courses.',
    isLocked: true,
    progress: { current: 0, total: 10 },
  },
  {
    id: AchievementType.FIFTY_CONNECTIONS,
    name: 'Social Star',
    emoji: '⭐',
    rarity: 'rare',
    description: 'Built a network of 50 connections.',
    isLocked: true,
    progress: { current: 0, total: 50 },
  },
  {
    id: AchievementType.HUNDRED_HOURS,
    name: 'Deep Diver',
    emoji: '🤿',
    rarity: 'common',
    description: 'Accumulated 100+ hours of learning.',
    isLocked: true,
    progress: { current: 0, total: 100 },
  },
  {
    id: AchievementType.TOP_ONE_PERCENT,
    name: 'Legend',
    emoji: '👑',
    rarity: 'legendary',
    description: 'Reach the top 1% of all learners.',
    isLocked: true,
    progress: { current: 0, total: 10 },
  },
  {
    id: AchievementType.MENTOR,
    name: 'Mentor',
    emoji: '🎓',
    rarity: 'epic',
    description: 'Help 20 other learners succeed.',
    isLocked: true,
    progress: { current: 0, total: 20 },
  },
  {
    id: AchievementType.SPEED_RUN,
    name: 'Speed Run',
    emoji: '⚡',
    rarity: 'rare',
    description: 'Complete an entire course in one day.',
    isLocked: true,
  },
];

export const useAchievementStore = create<AchievementState>()(
  persist(
    (set, get) => ({
      achievements: DEFAULT_ACHIEVEMENTS,
      unlockedCount: 0,

      unlockAchievement: (id: string) =>
        set((state) => {
          const achievement = state.achievements.find((a) => a.id === id);
          if (!achievement || !achievement.isLocked) return state;

          const updatedAchievements = state.achievements.map((a) =>
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

          return {
            achievements: updatedAchievements,
            unlockedCount: updatedAchievements.filter((a) => !a.isLocked).length,
          };
        }),

      updateProgress: (id: string, current: number) =>
        set((state) => {
          const achievement = state.achievements.find((a) => a.id === id);
          if (!achievement || !achievement.isLocked) return state;

          const updatedAchievements = state.achievements.map((a) => {
            if (a.id !== id) return a;

            const progress = a.progress ? { ...a.progress, current } : { current, total: 1 };
            
            // Auto-unlock if progress is complete
            if (progress.current >= progress.total) {
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
            unlockedCount: updatedAchievements.filter((a) => !a.isLocked).length,
          };
        }),

      isAchievementUnlocked: (id: string) => {
        const achievement = get().achievements.find((a) => a.id === id);
        return achievement ? !achievement.isLocked : false;
      },

      getUnlockedAchievements: () => {
        return get().achievements.filter((a) => !a.isLocked);
      },

      resetAchievements: () =>
        set({
          achievements: DEFAULT_ACHIEVEMENTS,
          unlockedCount: 0,
        }),

      initializeAchievements: (achievements: Achievement[]) =>
        set({
          achievements,
          unlockedCount: achievements.filter((a) => !a.isLocked).length,
        }),
    }),
    {
      name: 'achievement-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        achievements: state.achievements,
        unlockedCount: state.unlockedCount,
      }),
    }
  )
);
