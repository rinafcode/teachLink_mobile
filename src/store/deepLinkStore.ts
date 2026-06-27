import { create } from 'zustand';

import { Course } from '../types/course';

interface DeepLinkState {
  prewarmedCourse: Course | null;
  deepLinkError: string | null;
  pendingDeepLink: string | null;
  isHandled: boolean;
  setPrewarmedCourse: (course: Course) => void;
  clearPrewarmedCourse: () => void;
  setDeepLinkError: (error: string | null) => void;
  setPendingDeepLink: (url: string) => void;
  clearPendingLink: () => void;
}

export const useDeepLinkStore = create<DeepLinkState>(set => ({
  prewarmedCourse: null,
  deepLinkError: null,
  pendingDeepLink: null,
  isHandled: false,
  setPrewarmedCourse: course => set({ prewarmedCourse: course }),
  clearPrewarmedCourse: () => set({ prewarmedCourse: null }),
  setDeepLinkError: error => set({ deepLinkError: error }),
  setPendingDeepLink: url => set({ pendingDeepLink: url, isHandled: false }),
  clearPendingLink: () => set({ pendingDeepLink: null, isHandled: true }),
}));
