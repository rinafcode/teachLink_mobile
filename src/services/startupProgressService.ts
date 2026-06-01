import { create } from 'zustand';

/**
 * Represents a single initialization step being tracked
 */
export interface StartupStep {
  id: string;
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  startTime?: number;
  endTime?: number;
  estimatedDuration: number; // in milliseconds
  error?: string;
}

/**
 * Store for tracking app startup progress
 */
interface StartupProgressState {
  steps: Map<string, StartupStep>;
  isInitializing: boolean;
  totalEstimatedTime: number;
  startTime?: number;
  
  // Actions
  registerStep: (id: string, name: string, estimatedDuration: number) => void;
  startStep: (id: string) => void;
  completeStep: (id: string) => void;
  failStep: (id: string, error: string) => void;
  setInitializing: (initializing: boolean) => void;
  reset: () => void;
  
  // Computed values
  getProgress: () => number;
  getRemainingTime: () => number;
  getCompletedSteps: () => StartupStep[];
  getInProgressStep: () => StartupStep | undefined;
}

const useStartupProgressStore = create<StartupProgressState>((set, get) => ({
  steps: new Map(),
  isInitializing: true,
  totalEstimatedTime: 0,
  startTime: undefined,

  registerStep: (id: string, name: string, estimatedDuration: number) => {
    set((state) => {
      const newSteps = new Map(state.steps);
      newSteps.set(id, {
        id,
        name,
        status: 'pending',
        estimatedDuration,
      });
      return {
        steps: newSteps,
        totalEstimatedTime: Array.from(newSteps.values()).reduce(
          (sum, step) => sum + step.estimatedDuration,
          0
        ),
      };
    });
  },

  startStep: (id: string) => {
    set((state) => {
      const newSteps = new Map(state.steps);
      const step = newSteps.get(id);
      if (step) {
        step.status = 'in-progress';
        step.startTime = Date.now();
      }
      return { steps: newSteps };
    });
  },

  completeStep: (id: string) => {
    set((state) => {
      const newSteps = new Map(state.steps);
      const step = newSteps.get(id);
      if (step) {
        step.status = 'completed';
        step.endTime = Date.now();
      }
      return { steps: newSteps };
    });
  },

  failStep: (id: string, error: string) => {
    set((state) => {
      const newSteps = new Map(state.steps);
      const step = newSteps.get(id);
      if (step) {
        step.status = 'failed';
        step.error = error;
        step.endTime = Date.now();
      }
      return { steps: newSteps };
    });
  },

  setInitializing: (initializing: boolean) => {
    set((state) => ({
      isInitializing: initializing,
      startTime: initializing && !state.startTime ? Date.now() : state.startTime,
    }));
  },

  reset: () => {
    set({
      steps: new Map(),
      isInitializing: true,
      totalEstimatedTime: 0,
      startTime: undefined,
    });
  },

  getProgress: () => {
    const state = get();
    if (state.totalEstimatedTime === 0) return 0;

    let totalTime = 0;
    Array.from(state.steps.values()).forEach((step) => {
      if (step.status === 'completed') {
        totalTime += step.estimatedDuration;
      } else if (step.status === 'in-progress' && step.startTime) {
        const elapsedTime = Math.min(
          Date.now() - step.startTime,
          step.estimatedDuration
        );
        totalTime += elapsedTime;
      }
    });

    return Math.min((totalTime / state.totalEstimatedTime) * 100, 100);
  },

  getRemainingTime: () => {
    const state = get();
    if (!state.startTime) return state.totalEstimatedTime;

    const elapsedTime = Date.now() - state.startTime;
    const remainingTime = Math.max(state.totalEstimatedTime - elapsedTime, 0);
    return remainingTime;
  },

  getCompletedSteps: () => {
    const state = get();
    return Array.from(state.steps.values()).filter(
      (step) => step.status === 'completed'
    );
  },

  getInProgressStep: () => {
    const state = get();
    return Array.from(state.steps.values()).find(
      (step) => step.status === 'in-progress'
    );
  },
}));

/**
 * Service for managing app startup progress tracking
 * Provides methods to register, start, and complete initialization steps
 */
class StartupProgressService {
  /**
   * Register an initialization step with estimated duration
   */
  registerStep(id: string, name: string, estimatedDurationMs: number) {
    useStartupProgressStore.getState().registerStep(id, name, estimatedDurationMs);
  }

  /**
   * Mark a step as in-progress
   */
  startStep(id: string) {
    useStartupProgressStore.getState().startStep(id);
  }

  /**
   * Mark a step as completed
   */
  completeStep(id: string) {
    useStartupProgressStore.getState().completeStep(id);
  }

  /**
   * Mark a step as failed with an error message
   */
  failStep(id: string, error: string) {
    useStartupProgressStore.getState().failStep(id, error);
  }

  /**
   * Set initialization state
   */
  setInitializing(initializing: boolean) {
    useStartupProgressStore.getState().setInitializing(initializing);
  }

  /**
   * Get the current progress percentage (0-100)
   */
  getProgress(): number {
    return useStartupProgressStore.getState().getProgress();
  }

  /**
   * Get the estimated remaining time in milliseconds
   */
  getRemainingTime(): number {
    return useStartupProgressStore.getState().getRemainingTime();
  }

  /**
   * Get all completed steps
   */
  getCompletedSteps() {
    return useStartupProgressStore.getState().getCompletedSteps();
  }

  /**
   * Get the currently in-progress step
   */
  getInProgressStep() {
    return useStartupProgressStore.getState().getInProgressStep();
  }

  /**
   * Reset progress tracking
   */
  reset() {
    useStartupProgressStore.getState().reset();
  }

  /**
   * Get the store state
   */
  getStore() {
    return useStartupProgressStore;
  }
}

export const startupProgressService = new StartupProgressService();
export { useStartupProgressStore };

