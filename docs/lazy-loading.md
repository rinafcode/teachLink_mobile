# Lazy loading route components

TeachLink Mobile uses **React.lazy**, **Suspense**, and per-route **ErrorBoundary** wrappers to defer heavy screens until navigation. This reduces the initial JavaScript bundle and improves time-to-interactive (TTI).

## Pattern: `createLazyRoute`

Defined in [`src/utils/lazyRoute.tsx`](../src/utils/lazyRoute.tsx).

```tsx
import { CourseViewerSkeleton } from '@/components/mobile/CourseViewerSkeleton';
import { createLazyRoute } from '@/utils/lazyRoute';

const LazyMobileCourseViewer = createLazyRoute({
  importFn: () => import('@/components/mobile/MobileCourseViewer'),
  LoadingFallback: CourseViewerSkeleton,
  boundaryName: 'CourseViewerRoute',
});

export default function CourseViewerScreen() {
  return <LazyMobileCourseViewer course={course} onBack={() => router.back()} />;
}
```

### Rules

1. **Route files stay thin** — parse params / hooks in `app/*.tsx`; lazy-load the heavy UI module.
2. **Always provide a skeleton** — use an existing `*Skeleton` component, not `null` or a bare spinner (unless no skeleton exists yet).
3. **Named exports** — map to default for `React.lazy`:

   ```tsx
   importFn: () =>
     import('@/components/mobile/MobileSearch').then((m) => ({ default: m.MobileSearch })),
   ```

4. **Error handling** — `createLazyRoute` wraps Suspense in `ErrorBoundary` with `boundaryName` for Sentry and the in-app Retry UI.
5. **Imports** — prefer `@/components/...`, `@/utils/...` (not `@/src/...`).

## Route map

| Expo route                 | Lazy module                | Loading fallback       |
| -------------------------- | -------------------------- | ---------------------- |
| `app/(tabs)/index.tsx`     | `HomeScreenContent`        | `HomeScreenSkeleton`   |
| `app/course-viewer.tsx`    | `MobileCourseViewer`       | `CourseViewerSkeleton` |
| `app/quiz.tsx`             | `MobileQuizManager`        | `QuizSkeleton`         |
| `app/(tabs)/search.tsx`    | `MobileSearch`             | `SearchScreenSkeleton` |
| `app/(tabs)/profile.tsx`   | `MobileProfile`            | `ProfileSkeleton`      |
| `app/settings.tsx`         | `MobileSettings`           | `SettingsSkeleton`     |
| `app/profile/[userId].tsx` | `MobileProfile`            | `ProfileSkeleton`      |
| `app/qr-scanner.tsx`       | `QRScanner`                | `QRScannerSkeleton`    |
| `app/modal.tsx`            | _(small template — eager)_ | `ErrorBoundary` only   |

## Seeing lazy loading in the app (dev)

Skeletons flash quickly on a fast machine. To **see them clearly** while developing:

1. In `.env`, set `EXPO_PUBLIC_LAZY_LOAD_DELAY_MS=1500` (dev only; ignored in production builds).
2. Run `npx expo start` and open the app (web, iOS simulator, or Android emulator).
3. Navigate to Search, Profile, Settings, Course viewer, Quiz, or QR scanner — each route should show its skeleton for ~1.5s, then the screen.

In the Metro terminal, navigating to a lazy route also logs a separate bundle chunk load the first time you open that screen.

Remove or zero out `EXPO_PUBLIC_LAZY_LOAD_DELAY_MS` when you are done demoing.

## Measuring bundle impact

From the project root (no Docker required):

```bash
bash scripts/measureRouteBundle.sh
```

Or manually:

```bash
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file node_modules/expo-router/entry.js \
  --bundle-output /tmp/teachlink.bundle.js \
  --assets-dest /tmp/teachlink-assets

wc -c /tmp/teachlink.bundle.js
```

Compare byte size before and after lazy-loading changes.

## Tests

```bash
npx jest src/__tests__/utils/lazyRoute.test.tsx
```

## Related

- Closes [#377](https://github.com/rinafcode/teachLink_mobile/issues/377)
- Legacy helper: `lazyScreen` in `src/utils/LazyScreen.tsx` (deprecated — use `createLazyRoute`)
