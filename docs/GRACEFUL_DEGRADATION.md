# Graceful Degradation Strategy

This document outlines TeachLink Mobile's approach to graceful degradation when device features or permissions are unavailable.

## Goals

- Avoid crashes when hardware or permissions are missing.
- Provide clear user feedback and fallback UX.
- Maintain core app functionality with degraded capabilities.

## Features Covered

- Camera (photo capture & gallery)
- Push Notifications
- Location

## Strategy

1. Detect capabilities at startup using `src/services/featureCapabilities.ts`.
2. Persist degradation state in `src/store/degradationStore.ts`.
3. Provide hooks with fallbacks: `src/hooks/useCamera.ts`, `src/hooks/useLocation.ts`.
4. Provide UI components to inform users: `src/components/DegradationBanner.tsx`.
5. Use `locationService` to attempt GPS, then cached, then manual entry.
6. Use in-app notifications when push notifications unavailable.

## Developer Notes

- When adding new features that require hardware or permissions, update `featureCapabilities` and `degradationStore` accordingly.
- Use `degradationStore.addNotification()` to notify users about degraded features.
- Prefer non-blocking initialization; detect capabilities asynchronously.

## Testing

- Test on simulator to verify push notification degradation behavior.
- Deny permissions to test camera fallback to library and manual location entry.
- Test devices without GPS to ensure manual flow works.

