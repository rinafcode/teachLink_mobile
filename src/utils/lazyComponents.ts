/**
 * Lazy Components Registry
 *
 * Centralized registry of all lazy-loaded components with code splitting
 * and bundle size optimization.
 */

import { createLazyComponent } from './lazyLoading';

/**
 * Heavy optional components that should be lazy-loaded
 * to reduce initial bundle size
 */

// Video Player Components
export const LazyMobileVideoPlayer = createLazyComponent<any>(
  'MobileVideoPlayer',
  () => import('../components/mobile/MobileVideoPlayer'),
  'LazyMobileVideoPlayer'
);

export const LazyVideoControls = createLazyComponent<any>(
  'VideoControls',
  () => import('../components/mobile/VideoControls'),
  'LazyVideoControls'
);

// Data Grid Components
export const LazyAdvancedDataGrid = createLazyComponent<any>(
  'AdvancedDataGrid',
  () => import('../components/grid/AdvancedDataGrid'),
  'LazyAdvancedDataGrid'
);

// Profile Components
export const LazyMobileProfile = createLazyComponent<any>(
  'MobileProfile',
  () => import('../components/mobile/MobileProfile'),
  'LazyMobileProfile'
);

export const LazyAvatarCamera = createLazyComponent<any>(
  'AvatarCamera',
  () => import('../components/mobile/AvatarCamera'),
  'LazyAvatarCamera'
);

// Settings Components
export const LazyMobileSettings = createLazyComponent<any>(
  'MobileSettings',
  () => import('../components/mobile/MobileSettings'),
  'LazyMobileSettings'
);

// Course Viewer Components
export const LazyCourseViewerContent = createLazyComponent<any>(
  'CourseViewerContent',
  () =>
    import('../components/mobile/MobileCourseViewer').then(mod => ({
      default: mod.CourseViewerContent || mod.default,
    })),
  'LazyCourseViewerContent'
);

// Quiz Components
export const LazyMobileQuizManager = createLazyComponent<any>(
  'MobileQuizManager',
  () => import('../components/mobile/MobileQuizManager'),
  'LazyMobileQuizManager'
);

// Search Components
export const LazyMobileSearch = createLazyComponent<any>(
  'MobileSearch',
  () => import('../components/mobile/MobileSearch'),
  'LazyMobileSearch'
);

// Camera/QR Components
export const LazyQRScanner = createLazyComponent<any>(
  'QRScanner',
  () => import('../components/mobile/QRScanner'),
  'LazyQRScanner'
);

// Download Manager
export const LazyDownloadQueue = createLazyComponent<any>(
  'DownloadQueue',
  () => import('../components/mobile/DownloadQueue'),
  'LazyDownloadQueue'
);

// Virtual List for large data
export const LazyVirtualList = createLazyComponent<any>(
  'VirtualList',
  () => import('../components/mobile/VirtualList'),
  'LazyVirtualList'
);

/**
 * Registry of all lazy components with metadata
 */
export const lazyComponentRegistry = {
  videoPlayer: {
    component: LazyMobileVideoPlayer,
    name: 'MobileVideoPlayer',
    category: 'media',
    estimatedSize: '180KB',
    description: 'Video player with quality switching and gestures',
  },
  videoControls: {
    component: LazyVideoControls,
    name: 'VideoControls',
    category: 'media',
    estimatedSize: '45KB',
    description: 'Video player controls UI',
  },
  dataGrid: {
    component: LazyAdvancedDataGrid,
    name: 'AdvancedDataGrid',
    category: 'data',
    estimatedSize: '120KB',
    description: 'Virtualized data grid with sorting and filtering',
  },
  profile: {
    component: LazyMobileProfile,
    name: 'MobileProfile',
    category: 'profile',
    estimatedSize: '150KB',
    description: 'User profile view with achievements',
  },
  avatarCamera: {
    component: LazyAvatarCamera,
    name: 'AvatarCamera',
    category: 'media',
    estimatedSize: '85KB',
    description: 'Avatar camera and photo selection',
  },
  settings: {
    component: LazyMobileSettings,
    name: 'MobileSettings',
    category: 'settings',
    estimatedSize: '160KB',
    description: 'App settings and preferences',
  },
  courseViewer: {
    component: LazyCourseViewerContent,
    name: 'CourseViewerContent',
    category: 'education',
    estimatedSize: '200KB',
    description: 'Course content viewer',
  },
  quiz: {
    component: LazyMobileQuizManager,
    name: 'MobileQuizManager',
    category: 'education',
    estimatedSize: '175KB',
    description: 'Quiz player and manager',
  },
  search: {
    component: LazyMobileSearch,
    name: 'MobileSearch',
    category: 'search',
    estimatedSize: '95KB',
    description: 'Search interface',
  },
  qrScanner: {
    component: LazyQRScanner,
    name: 'QRScanner',
    category: 'camera',
    estimatedSize: '110KB',
    description: 'QR code scanner',
  },
  downloads: {
    component: LazyDownloadQueue,
    name: 'DownloadQueue',
    category: 'media',
    estimatedSize: '70KB',
    description: 'Download queue manager',
  },
  virtualList: {
    component: LazyVirtualList,
    name: 'VirtualList',
    category: 'ui',
    estimatedSize: '50KB',
    description: 'Virtualized list component',
  },
};

/**
 * Calculate total estimated bundle savings
 */
export function getEstimatedBundleSavings(): {
  totalSavings: number;
  totalSavingsPercent: number;
  components: { name: string; sizeSaved: string }[];
} {
  const components = Object.values(lazyComponentRegistry);
  let totalSavings = 0;

  const componentSizes = components.map(comp => {
    const sizeStr = comp.estimatedSize.replace('KB', '');
    const sizeNum = parseFloat(sizeStr);
    totalSavings += sizeNum;
    return {
      name: comp.name,
      sizeSaved: comp.estimatedSize,
    };
  });

  // Assuming initial bundle ~2.8 MB
  const initialBundleSize = 2800; // KB
  const totalSavingsPercent = (totalSavings / initialBundleSize) * 100;

  return {
    totalSavings,
    totalSavingsPercent: Math.round(totalSavingsPercent * 10) / 10,
    components: componentSizes,
  };
}
