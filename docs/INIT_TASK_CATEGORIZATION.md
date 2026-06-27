# Init Task Categorization

## Overview

App initialization is split into **critical** (runs immediately) and **deferred** (runs after user interactions) tasks to improve Time To Interactive (TTI).

## Critical Path (runs immediately)

These tasks must complete before the user can interact with the app.

| Task | Location | Reason |
|------|----------|--------|
| Font loading | `App.tsx` prepareApp | Required for text rendering |
| Cache version invalidation | `App.tsx` prepareApp | Ensures consistent app state |
| Splash screen hide | `App.tsx` prepareApp | Unblocks the UI |
| Crash reporting init | `App.tsx` useEffect #2 | Global error catching |
| Secure storage init | `App.tsx` useEffect #2 | Keychain/Keystore readiness |
| Global unhandled rejection handler | `App.tsx` useEffect #2 | Error fallback |
| Notification navigation setup | `App.tsx` useEffect #2 | Deep link handling |
| Notification received listener | `App.tsx` useEffect #2 | In-app notification display |
| Launch-from-notification check | `App.tsx` useEffect #2 | Initial notification handling |

## Deferred Path (runs after interactions)

These tasks are wrapped in `InteractionManager.runAfterInteractions()`.

| Task | Location | Reason |
|------|----------|--------|
| Socket connection | `App.tsx` deferred block | Network I/O, not needed for initial render |
| Feature capability detection | `App.tsx` deferred block | Permission checks, async |
| Push notification registration | `App.tsx` deferred block | Permission dialog + network |
| Request queue monitoring | `App.tsx` deferred block | Background network polling |
| Background sync service | `App.tsx` deferred block | Periodic data sync |
| In-app review init | `App.tsx` deferred block | Engagement tracking |
| Cache warming | `App.tsx` deferred block | Prefetch course list & profile |

## Performance Targets

| Metric | Before | After (Target) |
|--------|--------|----------------|
| TTI | 2.5s | 1.2s (-52%) |
| Core interaction | 2.0s | 0.3s (-85%) |

## Testing

Run on slow device equivalent (e.g. iPhone SE 1st gen) to verify:
- Core app interaction < 500ms
- Home screen interactable within 300ms
- Deferred tasks complete without blocking the UI
- Analytics init, cache warming, and socket connection happen after primary render
