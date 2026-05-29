# Deep Linking Pre-warming Strategy

## Overview

To optimize app launch performance from deep links and push notifications, TeachLink implements a deep link pre-warming strategy. This fetches necessary data and hydrates the application state _before_ the initial navigation occurs, masking the loading time behind the native splash screen.

## Strategy Steps

1. **Detection**: Upon app start, `DeepLinkPrewarmProvider` checks for an initial deep link URL or a pending notification response (via `getInitialDeepLinkUrl`).
2. **Parsing**: The URL is parsed into structured routing data (e.g., extracting a `courseId` or `conversationId`).
3. **Pre-warming (Data Fetching)**: `prewarmDeepLinkData` intercepts the parsed route. If the route requires data, it initiates an API or local storage fetch while `SplashScreen.preventAutoHideAsync()` keeps the splash screen visible.
4. **State Preparation**: The fetched data is injected into the global store (`useDeepLinkStore`).
5. **Navigation**: Once the state is prepared, the splash screen is dismissed (`SplashScreen.hideAsync()`), and the app routes directly to the fully-rendered target screen via `router.replace()`, eliminating loading spinners.

## Fallbacks

- A 5-second timeout ensures that if a network request hangs during pre-warming, the splash screen will still hide and allow the user into the app.
- If the data cannot be fetched, navigation will proceed normally, allowing the destination screen to render its own loading/fallback UI.

## Key Files Involved

- **`src/components/common/DeepLinkPrewarmProvider.tsx`**: Orchestrates the splash screen lifecycle, calls data fetching, and triggers routing.
- **`src/utils/deepLinkPrewarm.ts`**: Contains the logic for determining what data needs to be fetched based on route parameters and fetching that data.
- **`src/utils/notificationHandlers.ts`**: Maps application URLs and push notifications to app-specific events and properties.
- **`src/navigation/linking.ts`**: Core React Navigation configuration outlining deep link prefixes and path structures.
