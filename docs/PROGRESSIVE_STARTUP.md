# Progressive App Startup with Visible Progress

## Overview

This feature implements a progressive app startup system that displays initialization progress to the user, improving perceived performance and building user confidence during app launch.

## Features

✨ **Visual Progress Indicator**
- Animated progress bar showing completion percentage
- Real-time step-by-step progress display
- Current step name display

🎯 **User Confidence**
- Transparent initialization process
- Shows what the app is doing
- Displays estimated time remaining
- Prevents the blank screen perception

📊 **Performance Tracking**
- Tracks initialization steps with estimated duration
- Monitors actual vs. estimated time
- Supports step failure tracking
- Helps identify startup bottlenecks

## Architecture

### Components

#### 1. `StartupProgressService` (`src/services/startupProgressService.ts`)
Central service for managing app startup progress tracking.

**Key Methods:**
- `registerStep(id, name, estimatedDurationMs)` - Register an initialization step
- `startStep(id)` - Mark a step as in-progress
- `completeStep(id)` - Mark a step as completed
- `failStep(id, error)` - Mark a step as failed with error
- `getProgress()` - Get current progress percentage (0-100)
- `getRemainingTime()` - Get estimated remaining time in ms
- `setInitializing(boolean)` - Set app initialization state

**State Management:**
- Uses Zustand for reactive state management
- Maintains a Map of steps with status and timing information
- Computes progress percentage based on completed steps
- Calculates remaining time based on elapsed and total time

#### 2. `StartupProgressOverlay` Component (`src/components/common/StartupProgressOverlay.tsx`)
React Native component that displays the progress UI on the splash screen.

**Features:**
- Animated progress bar with smooth transitions
- Progress percentage display (0-100%)
- Step counter (e.g., "3 of 4 steps")
- Current step name display
- Estimated time remaining countdown
- List of all steps with status indicators:
  - ✓ Completed (green)
  - ⟳ In Progress (blue)
  - ✕ Failed (red)
  - ○ Pending (gray)
- Error messages for failed steps

**Visual Design:**
- Clean, modern Material Design UI
- Color-coded step status
- Responsive layout that works on all screen sizes
- Animated progress bar for smooth UX

#### 3. Updated `App.tsx`
Integrated progress tracking into the main app initialization:

1. Registers startup steps:
   - `fonts` - Loading custom fonts (estimated 500ms)
   - `cache` - Clearing outdated caches (estimated 800ms)
   - `auth` - Checking authentication state (estimated 1000ms)
   - `data` - Loading initial data (estimated 1500ms)

2. Tracks each step through its lifecycle
3. Displays progress overlay during initialization
4. Hides progress when app is ready

## Usage

### Basic Setup

The progress tracking is automatically integrated into the app startup flow in `App.tsx`. The `StartupProgressOverlay` component is rendered during app initialization and automatically hides when `appIsReady` is true.

### Adding Custom Steps

To add custom initialization steps:

```typescript
import { startupProgressService } from './src/services/startupProgressService';

// Register a step with estimated duration
startupProgressService.registerStep('my-feature', 'Loading My Feature', 2000); // 2 seconds

// Start the step
startupProgressService.startStep('my-feature');

try {
  // Do initialization work
  await initializeMyFeature();
  
  // Complete the step
  startupProgressService.completeStep('my-feature');
} catch (error) {
  // Mark as failed
  startupProgressService.failStep('my-feature', error.message);
}
```

### Accessing Progress Information

```typescript
import { startupProgressService } from './src/services/startupProgressService';

// Get current progress (0-100)
const progress = startupProgressService.getProgress();

// Get remaining time in milliseconds
const remainingMs = startupProgressService.getRemainingTime();

// Get completed steps
const completed = startupProgressService.getCompletedSteps();

// Get current in-progress step
const current = startupProgressService.getInProgressStep();

// Reset for next app start (usually not needed)
startupProgressService.reset();
```

### Listening to Progress Changes

The `useStartupProgressStore` hook allows you to react to progress changes:

```typescript
import { useStartupProgressStore } from '@/services/startupProgressService';

function MyComponent() {
  const { isInitializing, steps } = useStartupProgressStore();
  const progress = useStartupProgressStore.getState().getProgress();

  return (
    <div>
      {isInitializing && <p>Initializing: {progress}%</p>}
    </div>
  );
}
```

## Performance Considerations

### Estimated Durations
The estimated durations for each step are based on typical device performance:
- **Fonts**: 500ms - Loading custom fonts from storage
- **Cache**: 800ms - Clearing outdated app caches
- **Auth**: 1000ms - Validating authentication state and tokens
- **Data**: 1500ms - Fetching initial app data

These can be adjusted based on actual performance measurements on target devices.

### Optimization Tips

1. **Measure Actual Times**: On slow devices, measure actual initialization time and adjust estimates
2. **Parallel Steps**: Consider running non-blocking steps in parallel to reduce total time
3. **Lazy Loading**: Defer non-critical initialization to after the app is visible
4. **Caching**: Cache initialization data to speed up subsequent app starts
5. **Code Splitting**: Use dynamic imports for large features

## Testing

### Testing on Slow Devices

To simulate slow device performance:

1. **Slow Motion**: Use Android/iOS developer settings to slow down animations
2. **Network Throttling**: Use Chrome DevTools or system settings to throttle network
3. **CPU Throttling**: Use developer settings to reduce CPU performance
4. **Custom Steps**: Add artificial delays to steps to test estimated time accuracy

Example test:
```typescript
startupProgressService.registerStep('test', 'Test Step', 5000); // 5 second estimate
startupProgressService.startStep('test');
await new Promise(r => setTimeout(r, 10000)); // Simulate 10 second actual time
startupProgressService.completeStep('test');
```

## Troubleshooting

### Progress Not Showing
1. Ensure `StartupProgressOverlay` is rendered in the component hierarchy
2. Check that `startupProgressService.setInitializing(true)` is called
3. Verify steps are registered before they're started

### Incorrect Time Estimates
1. Measure actual initialization times on target devices
2. Adjust estimated durations in `prepareApp()`
3. Account for network latency and device capabilities

### Steps Not Completing
1. Ensure all steps are properly registered
2. Check for errors in initialization logic
3. Verify `completeStep()` or `failStep()` is called for each step

## Related Issues

- #28 - App startup performance improvements
- #22 - User experience during app launch
- #331 - Progressive app startup with visible progress

## Future Enhancements

- [ ] Track startup metrics for analytics
- [ ] A/B test estimated durations with different devices
- [ ] Add sound/haptic feedback during progress
- [ ] Support for user interruption (cancel initialization)
- [ ] Background initialization while showing app content
- [ ] Multi-step progress with sub-tasks
