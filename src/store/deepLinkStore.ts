import { create } from 'zustand';

import { Course } from '../types/course';

interface DeepLinkState {
  prewarmedCourse: Course | null;
  deepLinkError: string | null;
  setPrewarmedCourse: (course: Course) => void;
  clearPrewarmedCourse: () => void;
  setDeepLinkError: (error: string | null) => void;
}

export const useDeepLinkStore = create<DeepLinkState>(set => ({
  prewarmedCourse: null,
  deepLinkError: null,
  setPrewarmedCourse: course => set({ prewarmedCourse: course }),
  clearPrewarmedCourse: () => set({ prewarmedCourse: null }),
  setDeepLinkError: error => set({ deepLinkError: error }),
}));
