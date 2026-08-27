import { act, fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';

import { ErrorBoundary } from '../../components/common/ErrorBoundary';
import { appLogger } from '../../utils/logger';

jest.mock('@sentry/react-native', () => ({
  withScope: jest.fn(),
  captureException: jest.fn(),
}));

jest.mock('../../services/crashReporting', () => ({
  crashReportingService: { reportError: jest.fn() },
}));

jest.mock('../../utils/logger', () => ({
  appLogger: {
    errorSync: jest.fn(),
    warnSync: jest.fn(),
    infoSync: jest.fn(),
  },
}));

import * as Sentry from '@sentry/react-native';
import { crashReportingService } from '../../services/crashReporting';

const withScope = Sentry.withScope as jest.Mock;
const captureException = Sentry.captureException as jest.Mock;
const reportError = crashReportingService.reportError as jest.Mock;
const infoSync = appLogger.infoSync as jest.Mock;

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

describe('ErrorBoundary', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let mockScope: { setTag: jest.Mock; setExtra: jest.Mock };

  beforeEach(() => {
    jest.useFakeTimers();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockScope = { setTag: jest.fn(), setExtra: jest.fn() };
    withScope.mockImplementation(callback => callback(mockScope));
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('default (non-retrying) behaviour', () => {
    it('renders children when no error is thrown', () => {
      const { getByText, queryByText } = render(
        <ErrorBoundary boundaryName="Test">
          <Text>hello world</Text>
        </ErrorBoundary>
      );

      expect(getByText('hello world')).toBeTruthy();
      expect(queryByText('Something went wrong')).toBeNull();
    });

    it('renders the fallback and reports to Sentry with the boundary tag when a child throws', () => {
      const control: ThrowControl = { shouldThrow: true };

      const { getByText } = render(
        <ErrorBoundary boundaryName="TestScreen">
          <Flaky control={control} />
        </ErrorBoundary>
      );

      expect(getByText('Something went wrong')).toBeTruthy();
      expect(captureException).toHaveBeenCalled();
      expect(mockScope.setTag).toHaveBeenCalledWith('errorBoundary', 'TestScreen');
      expect(mockScope.setExtra).toHaveBeenCalled();
      expect(reportError).toHaveBeenCalled();
    });

    it('recovers when the Retry button is pressed and the child then renders', () => {
      const control: ThrowControl = { shouldThrow: true };

      const { getByText, queryByText } = render(
        <ErrorBoundary boundaryName="Test">
          <Flaky control={control} />
        </ErrorBoundary>
      );

      expect(getByText('Something went wrong')).toBeTruthy();

      control.shouldThrow = false;
      act(() => {
        fireEvent.press(getByText('Try Again'));
      });

      expect(queryByText('recovered')).toBeTruthy();
    });
  });

  describe('automatic retry', () => {
    it('does not retry when autoRetry is not set', () => {
      const control: ThrowControl = { shouldThrow: true };

      render(
        <ErrorBoundary boundaryName="Test">
          <Flaky control={control} />
        </ErrorBoundary>
      );

      expect(scheduleDelays()).toEqual([]);
    });

    it('retries automatically and renders children once the error clears', () => {
      const control: ThrowControl = { shouldThrow: true };

      const { getByLabelText, queryByText } = render(
        <ErrorBoundary boundaryName="Test" autoRetry baseDelayMs={500}>
          <Flaky control={control} />
        </ErrorBoundary>
      );

      expect(getByLabelText('Retrying')).toBeTruthy();
      expect(queryByText('recovered')).toBeNull();

      control.shouldThrow = false;
      act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(queryByText('recovered')).toBeTruthy();
    });

    it('shows the fallback UI after the max number of retries is exhausted', () => {
      const control: ThrowControl = { shouldThrow: true };

      const { getByText } = render(
        <ErrorBoundary boundaryName="Test" autoRetry baseDelayMs={500} maxRetries={3}>
          <Flaky control={control} />
        </ErrorBoundary>
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
        <ErrorBoundary boundaryName="Test" autoRetry baseDelayMs={500} maxRetries={3}>
          <Flaky control={control} />
        </ErrorBoundary>
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
        <ErrorBoundary boundaryName="Test" autoRetry baseDelayMs={500} onRetrySuccess={onRetrySuccess}>
          <Flaky control={control} />
        </ErrorBoundary>
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
        <ErrorBoundary
          boundaryName="Test"
          autoRetry
          baseDelayMs={500}
          maxRetries={3}
          onMaxRetriesReached={onMaxRetriesReached}
        >
          <Flaky control={control} />
        </ErrorBoundary>
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
        <ErrorBoundary
          boundaryName="Test"
          autoRetry
          onMaxRetriesReached={onMaxRetriesReached}
          isTransient={() => false}
        >
          <Flaky control={control} />
        </ErrorBoundary>
      );

      expect(getByText('Something went wrong')).toBeTruthy();
      expect(scheduleDelays()).toEqual([]);
      expect(onMaxRetriesReached).toHaveBeenCalledTimes(1);
    });

    it('resets the retry count to 0 when the manual "Try Again" button is pressed', () => {
      const control: ThrowControl = { shouldThrow: true };
      const ref = React.createRef<ErrorBoundary>();

      const { getByText } = render(
        <ErrorBoundary ref={ref} boundaryName="Test" autoRetry baseDelayMs={500} maxRetries={3}>
          <Flaky control={control} />
        </ErrorBoundary>
      );

      act(() => jest.advanceTimersByTime(500));
      act(() => jest.advanceTimersByTime(1000));
      act(() => jest.advanceTimersByTime(2000));

      expect(ref.current?.state.retryCount).toBe(3);

      act(() => {
        fireEvent.press(getByText('Try Again'));
      });

      expect(ref.current?.state.retryCount).toBe(0);
    });

    it('clears any pending retry timeout when unmounted', () => {
      const control: ThrowControl = { shouldThrow: true };
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = render(
        <ErrorBoundary boundaryName="Test" autoRetry baseDelayMs={500}>
          <Flaky control={control} />
        </ErrorBoundary>
      );

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('resetKeys auto-reset', () => {
    it('auto-recovers when a reset key changes while an error is caught', () => {
      const control: ThrowControl = { shouldThrow: true };

      const { getByText, rerender, queryByText } = render(
        <ErrorBoundary boundaryName="Test" resetKeys={['route-a']}>
          <Flaky control={control} />
        </ErrorBoundary>
      );

      expect(getByText('Something went wrong')).toBeTruthy();

      control.shouldThrow = false;
      rerender(
        <ErrorBoundary boundaryName="Test" resetKeys={['route-b']}>
          <Flaky control={control} />
        </ErrorBoundary>
      );

      expect(queryByText('recovered')).toBeTruthy();
    });
  });
});
