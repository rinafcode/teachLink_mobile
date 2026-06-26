# Lifecycle Optimization

This document explains how the app handles background/foreground transitions to reduce CPU and battery usage.

What we do

- Detect app background/foreground via React Native `AppState` in `src/components/AppLifecycleManager.tsx`.
- Expose `isInBackground` in `src/store/deviceStore.ts` so services and hooks can react.
- `syncService` stops automatic sync timers when the app is backgrounded and resumes on foreground.
- `useDeviceUiComplexity()` now forces the lowest UI complexity when backgrounded, which disables heavy animations and reduces frame rate.
- App background/foreground transitions are tracked via analytics events `app_background` / `app_foreground`.

Files

- `src/components/AppLifecycleManager.tsx` – listens to `AppState` and updates the device store.
- `src/store/deviceStore.ts` – new `isInBackground` boolean + setter.
- `src/services/syncService.ts` – responds to `isInBackground` by stopping/starting auto-sync.
- `src/hooks/useDeviceUiComplexity.ts` – respects `isInBackground` to pause animations.

Acceptance criteria mapping

- Detect app background/foreground state: implemented in `AppLifecycleManager`.
- Pause animations when backgrounded: `useDeviceUiComplexity` forces low complexity.
- Stop sync timers when backgrounded: `syncService` stops auto-sync.
- Resume on foreground: `syncService` restarts auto-sync on foreground.
- Test battery impact & Monitor background activity: transitions emit analytics events; further tooling can consume them for reports.

Notes

This approach prefers central, low-impact changes:
- Most components already consult `useDeviceUiComplexity()` to decide on heavy effects. For components that don't, consider adding a check for `useDeviceStore(state => state.isInBackground)`.
- For long-running native timers or background tasks, consider platform-specific background task APIs (not covered here).
