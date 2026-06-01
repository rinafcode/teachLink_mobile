import fs from 'fs';
import path from 'path';

import { createLazyRoute } from '@/utils/lazyRoute';

describe('createLazyRoute', () => {
  it('returns a component function with a display name', () => {
    const LoadingFallback = () => null;
    const LoadedScreen = () => null;

    const Route = createLazyRoute({
      importFn: () => Promise.resolve({ default: LoadedScreen }),
      LoadingFallback,
      boundaryName: 'TestRoute',
    });

    expect(typeof Route).toBe('function');
    expect(Route.displayName).toBe('LazyRoute(TestRoute)');
  });

  it('preserves the boundary name in displayName for debugging', () => {
    const Route = createLazyRoute({
      importFn: () => Promise.resolve({ default: () => null }),
      LoadingFallback: () => null,
      boundaryName: 'CourseViewerRoute',
    });

    expect(Route.displayName).toBe('LazyRoute(CourseViewerRoute)');
  });
});

describe('Expo route lazy-loading coverage', () => {
  const repoRoot = path.resolve(__dirname, '../../..');
  const routeFiles = [
    'app/(tabs)/index.tsx',
    'app/(tabs)/search.tsx',
    'app/(tabs)/profile.tsx',
    'app/course-viewer.tsx',
    'app/quiz.tsx',
    'app/settings.tsx',
    'app/profile/[userId].tsx',
    'app/qr-scanner.tsx',
  ];

  it.each(routeFiles)('%s uses createLazyRoute', relativePath => {
    const source = fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');
    expect(source).toContain('createLazyRoute');
  });

  it('documents the lazy-loading pattern', () => {
    const docPath = path.join(repoRoot, 'docs/lazy-loading.md');
    expect(fs.existsSync(docPath)).toBe(true);
    const doc = fs.readFileSync(docPath, 'utf8');
    expect(doc).toContain('createLazyRoute');
    expect(doc).toContain('ErrorBoundary');
    expect(doc).toContain('Suspense');
  });
});
