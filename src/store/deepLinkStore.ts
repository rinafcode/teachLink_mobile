import { create } from 'zustand';
import { Course } from '../types/course';

interface DeepLinkState {
  prewarmedCourse: Course | null;
  setPrewarmedCourse: (course: Course) => void;
  clearPrewarmedCourse: () => void;
}

export const useDeepLinkStore = create<DeepLinkState>(set => ({
  prewarmedCourse: null,
  setPrewarmedCourse: course => set({ prewarmedCourse: course }),
  clearPrewarmedCourse: () => set({ prewarmedCourse: null }),
}));
