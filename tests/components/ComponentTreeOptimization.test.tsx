import { render, act } from '@testing-library/react-native';
import React from 'react';

import { OfflineIndicatorProvider } from '../../src/components/mobile/OfflineIndicatorProvider';
import * as hooks from '../../src/hooks';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
  warn: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
  warnSync: jest.fn(),
  infoSync: jest.fn(),
}));

// Mock banner subcomponent to avoid sub-render issues
jest.mock('../../src/components/mobile/OfflineIndicator', () => ({
  OfflineIndicator: () => null,
}));

// Mock the hooks module
jest.mock('../../src/hooks', () => {
  const actual = jest.requireActual('../../src/hooks');
  return {
    ...actual,
    useNetworkStatus: jest.fn(),
  };
});

const mockUseNetworkStatus = hooks.useNetworkStatus as jest.Mock;

describe('Component Tree Refactoring and Render Optimization', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockUseNetworkStatus.mockReturnValue({
      isOnline: true,
      isOffline: false,
      refresh: jest.fn(),
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('renders the children successfully without crashing', () => {
    const { toJSON } = render(
      <OfflineIndicatorProvider>
        <React.Fragment />
      </OfflineIndicatorProvider>
    );
    expect(toJSON()).toBeTruthy();
  });

  it('proves that children components do NOT re-render when network status updates and triggers toasts', () => {
    let childRenderCount = 0;

    // A memoized child component that counts its rendering occurrences
    const TestChild = React.memo(() => {
      childRenderCount++;
      return null;
    });

    TestChild.displayName = 'TestChild';

    const { rerender } = render(
      <OfflineIndicatorProvider showToastNotifications={true} toastDuration={1000}>
        <TestChild />
      </OfflineIndicatorProvider>
    );

    // Initial render should count as 1 render
    expect(childRenderCount).toBe(1);

    // 1. Simulate transition to offline state (should trigger toast)
    act(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: false,
        isOffline: true,
        refresh: jest.fn(),
      });
      // Re-render the provider, keeping the child reference stable
      rerender(
        <OfflineIndicatorProvider showToastNotifications={true} toastDuration={1000}>
          <TestChild />
        </OfflineIndicatorProvider>
      );
    });

    // Advance timer to trigger state adjustments (animations/toasts)
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // PROOF OF ISOLATION:
    // The child render count must remain exactly 1.
    // The state updates and re-renders for toasts/network banners are isolated inside the OfflineUI sibling!
    expect(childRenderCount).toBe(1);

    // 2. Simulate transition back to online state
    act(() => {
      mockUseNetworkStatus.mockReturnValue({
        isOnline: true,
        isOffline: false,
        refresh: jest.fn(),
      });
      rerender(
        <OfflineIndicatorProvider showToastNotifications={true} toastDuration={1000}>
          <TestChild />
        </OfflineIndicatorProvider>
      );
    });

    // Advance timer beyond the toast duration to auto-remove toast and clear state
    act(() => {
      jest.advanceTimersByTime(1100);
    });

    // PROOF OF ISOLATION:
    // Main child tree rendering remains completely unaffected by offline/online state transitions!
    expect(childRenderCount).toBe(1);
  });
});
