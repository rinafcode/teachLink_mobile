import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { RetryErrorBoundary } from '../../components/ErrorBoundary/RetryErrorBoundary';
import { appLogger } from '../../src/utils/logger';

// Mock the centralised logger so retry events can be asserted and no async
// persistence / remote logging runs during tests. `jest.mock` is hoisted above the
// imports above, so the boundary picks up this mocked logger.
jest.mock('../../src/utils/logger', () => ({
  appLogger: {
    errorSync: jest.fn(),
    warnSync: jest.fn(),
    infoSync: jest.fn(),
  },
}));

const infoSync = appLogger.infoSync as jest.Mock;

/**
 * A child whose throwing behaviour is controlled by an external mutable object so the
 * test can flip it between `act` steps. This is deterministic regardless of how many
 * times React invokes the render of a throwing component.
 */
interface ThrowControl {
  shouldThrow: boolean;
  message?: string;
}

const Flaky = ({ control }: { control: ThrowControl }): React.ReactElement => {
  if (control.shouldThrow) {
    throw new Error(control.message ?? 'transient failure');
  }
  return <Text>recovered</Text>;
};

const scheduleDelays = (): number[] =>
  infoSync.mock.calls
    .filter(call => call[0] === 'Error boundary scheduling retry')
    .map(call => call[1].delayMs as number);

describe('RetryErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    // React logs caught render errors via console.error — silence the noise.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('renders children normally when no error is thrown', () => {
    const { getByText, queryByText } = render(
      <RetryErrorBoundary>
        <Text>hello world</Text>
      </RetryErrorBoundary>
    );

    expect(getByText('hello world')).toBeTruthy();
    expect(queryByText('Something went wrong')).toBeNull();
  });

  it('retries automatically and renders children once the error clears', () => {
    const control: ThrowControl = { shouldThrow: true };

    const { getByLabelText, queryByText } = render(
      <RetryErrorBoundary baseDelayMs={500}>
        <Flaky control={control} />
      </RetryErrorBoundary>
    );

    // While the retry is pending, the spinner is shown instead of children.
    expect(getByLabelText('Retrying')).toBeTruthy();
    expect(queryByText('recovered')).toBeNull();

    control.shouldThrow = false;
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(queryByText('recovered')).toBeTruthy();
  });

  it('shows the fallback UI after the max number of retries (3) is exhausted', () => {
    const control: ThrowControl = { shouldThrow: true };

    const { getByText } = render(
      <RetryErrorBoundary baseDelayMs={500} maxRetries={3}>
        <Flaky control={control} />
      </RetryErrorBoundary>
    );

    act(() => jest.advanceTimersByTime(500));
    act(() => jest.advanceTimersByTime(1000));
    act(() => jest.advanceTimersByTime(2000));

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(getByText('Try Again')).toBeTruthy();
  });

  it('uses exponential backoff delays of 500ms, 1000ms, then 2000ms', () => {
    const control: ThrowControl = { shouldThrow: true };

    render(
      <RetryErrorBoundary baseDelayMs={500} maxRetries={3}>
        <Flaky control={control} />
      </RetryErrorBoundary>
    );

    act(() => jest.advanceTimersByTime(500));
    act(() => jest.advanceTimersByTime(1000));
    act(() => jest.advanceTimersByTime(2000));

    expect(scheduleDelays()).toEqual([500, 1000, 2000]);
  });

  it('calls onRetrySuccess with the retry count when a retry succeeds', () => {
    const control: ThrowControl = { shouldThrow: true };
    const onRetrySuccess = jest.fn();

    render(
      <RetryErrorBoundary baseDelayMs={500} onRetrySuccess={onRetrySuccess}>
        <Flaky control={control} />
      </RetryErrorBoundary>
    );

    control.shouldThrow = false;
    act(() => jest.advanceTimersByTime(500));

    expect(onRetrySuccess).toHaveBeenCalledTimes(1);
    expect(onRetrySuccess).toHaveBeenCalledWith(1);
  });

  it('calls onMaxRetriesReached when retries are exhausted', () => {
    const control: ThrowControl = { shouldThrow: true, message: 'permanent boom' };
    const onMaxRetriesReached = jest.fn();

    render(
      <RetryErrorBoundary
        baseDelayMs={500}
        maxRetries={3}
        onMaxRetriesReached={onMaxRetriesReached}
      >
        <Flaky control={control} />
      </RetryErrorBoundary>
    );

    act(() => jest.advanceTimersByTime(500));
    act(() => jest.advanceTimersByTime(1000));
    act(() => jest.advanceTimersByTime(2000));

    expect(onMaxRetriesReached).toHaveBeenCalledTimes(1);
    expect(onMaxRetriesReached.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(onMaxRetriesReached.mock.calls[0][0].message).toBe('permanent boom');
  });

  it('skips retries and shows the fallback immediately when isTransient returns false', () => {
    const control: ThrowControl = { shouldThrow: true };
    const onMaxRetriesReached = jest.fn();

    const { getByText } = render(
      <RetryErrorBoundary isTransient={() => false} onMaxRetriesReached={onMaxRetriesReached}>
        <Flaky control={control} />
      </RetryErrorBoundary>
    );

    expect(getByText('Something went wrong')).toBeTruthy();
    expect(scheduleDelays()).toEqual([]);
    expect(onMaxRetriesReached).toHaveBeenCalledTimes(1);
  });

  it('resets the retry count to 0 when the manual "Try Again" button is pressed', () => {
    const control: ThrowControl = { shouldThrow: true };
    const ref = React.createRef<RetryErrorBoundary>();

    const { getByLabelText } = render(
      <RetryErrorBoundary ref={ref} baseDelayMs={500} maxRetries={3}>
        <Flaky control={control} />
      </RetryErrorBoundary>
    );

    act(() => jest.advanceTimersByTime(500));
    act(() => jest.advanceTimersByTime(1000));
    act(() => jest.advanceTimersByTime(2000));

    expect(ref.current?.state.retryCount).toBe(3);

    act(() => {
      fireEvent.press(getByLabelText('Try again'));
    });

    expect(ref.current?.state.retryCount).toBe(0);
  });

  it('clears any pending retry timeout when unmounted', () => {
    const control: ThrowControl = { shouldThrow: true };
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    const { unmount } = render(
      <RetryErrorBoundary baseDelayMs={500}>
        <Flaky control={control} />
      </RetryErrorBoundary>
    );

    // A retry is scheduled (pending timeout) right after the first failure.
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
  });
});
