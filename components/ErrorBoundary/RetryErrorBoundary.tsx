import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { DefaultErrorFallback } from './DefaultErrorFallback';
import { appLogger } from '../../src/utils/logger';

/**
 * Props for {@link RetryErrorBoundary}.
 */
export interface RetryErrorBoundaryProps {
  /** Child tree guarded by the boundary. */
  children: ReactNode;
  /** Maximum number of automatic retries before the fallback UI is shown. Default: 3. */
  maxRetries?: number;
  /** Delay (ms) before the first retry; subsequent retries grow exponentially. Default: 500. */
  baseDelayMs?: number;
  /** Called every time an error is caught, with the current retry count. */
  onError?: (error: Error, errorInfo: ErrorInfo, retryCount: number) => void;
  /** Called when a retry re-renders the child tree successfully. */
  onRetrySuccess?: (retryCount: number) => void;
  /** Called when retries are exhausted or the error is classified as non-transient. */
  onMaxRetriesReached?: (error: Error) => void;
  /** Fallback UI. A React node, or a render function receiving the error and a manual retry handler. */
  fallback?: ReactNode | ((error: Error, retry: () => void) => ReactNode);
  /**
   * Classifies an error as transient (retryable). When omitted, every error is treated
   * as transient. Returning `false` skips retries and shows the fallback immediately.
   */
  isTransient?: (error: Error) => boolean;
}

/**
 * Internal state for {@link RetryErrorBoundary}.
 */
export interface ErrorBoundaryState {
  /** Whether an error is currently caught and awaiting retry or fallback. */
  hasError: boolean;
  /** The most recently caught error. */
  error: Error | null;
  /** Number of retries already attempted for the current failure streak. */
  retryCount: number;
  /** Whether a retry has been scheduled and is pending. */
  isRetrying: boolean;
  /** Total successful retries since mount (exposed for metrics). */
  retrySuccessCount: number;
  /** Total failed/abandoned retries since mount (exposed for metrics). */
  retryFailureCount: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const MAX_BACKOFF_MS = 10_000;

/**
 * Error boundary that automatically retries transient render errors with exponential
 * backoff before surfacing a fallback UI.
 *
 * React error boundaries only catch errors thrown during render, in lifecycle methods,
 * and in child constructors — NOT in event handlers, async callbacks, or SSR. "Retrying"
 * here means: after an error is caught, the boundary clears its error state after a
 * backoff delay and re-renders the child tree. A clean render counts as a successful
 * retry; another throw increments the retry count.
 *
 * Backoff schedule (with defaults): 500ms → 1000ms → 2000ms, capped at 10000ms.
 */
export class RetryErrorBoundary extends Component<RetryErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(props: RetryErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
      retrySuccessCount: 0,
      retryFailureCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      isRetrying: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const maxRetries = this.props.maxRetries ?? DEFAULT_MAX_RETRIES;

    appLogger.errorSync('Error boundary caught error', error, {
      error: error.message,
      retryCount: this.state.retryCount,
      stack: error.stack,
    });

    if (this.state.retryCount < maxRetries) {
      if (this.isTransient(error)) {
        this.setState({ isRetrying: true });
        this.scheduleRetry();
      } else {
        appLogger.warnSync('Error boundary skipping retry for non-transient error', {
          error: error.message,
          retryCount: this.state.retryCount,
        });
        this.setState(prev => ({ retryFailureCount: prev.retryFailureCount + 1 }));
        this.props.onMaxRetriesReached?.(error);
      }
      this.props.onError?.(error, errorInfo, this.state.retryCount);
    } else {
      appLogger.warnSync('Max retries reached for error boundary', {
        error: error.message,
        retryCount: this.state.retryCount,
      });
      this.setState(prev => ({ retryFailureCount: prev.retryFailureCount + 1 }));
      this.props.onMaxRetriesReached?.(error);
      this.props.onError?.(error, errorInfo, this.state.retryCount);
    }
  }

  componentDidUpdate(_prevProps: RetryErrorBoundaryProps, prevState: ErrorBoundaryState): void {
    // A retry succeeded when the error state clears after at least one retry attempt and
    // the child re-renders without throwing again (otherwise `hasError` would be true).
    if (prevState.hasError && !this.state.hasError && this.state.retryCount > 0) {
      this.setState(prev => ({ retrySuccessCount: prev.retrySuccessCount + 1 }));
      appLogger.infoSync('Error boundary retry succeeded', {
        retryCount: this.state.retryCount,
      });
      this.props.onRetrySuccess?.(this.state.retryCount);
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  private isTransient(error: Error): boolean {
    return this.props.isTransient ? this.props.isTransient(error) : true;
  }

  private scheduleRetry(): void {
    const baseDelayMs = this.props.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
    const delay = Math.min(baseDelayMs * Math.pow(2, this.state.retryCount), MAX_BACKOFF_MS);

    appLogger.infoSync('Error boundary scheduling retry', {
      retryCount: this.state.retryCount,
      delayMs: delay,
    });

    this.retryTimeout = setTimeout(() => {
      this.retryTimeout = null;
      this.setState(prev => ({
        hasError: false,
        error: null,
        isRetrying: false,
        retryCount: prev.retryCount + 1,
      }));
    }, delay);
  }

  private handleManualRetry = (): void => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    this.setState({
      hasError: false,
      error: null,
      retryCount: 0,
      isRetrying: false,
    });
  };

  private renderFallback(error: Error): ReactNode {
    const { fallback } = this.props;
    if (typeof fallback === 'function') {
      return fallback(error, this.handleManualRetry);
    }
    return fallback ?? <DefaultErrorFallback error={error} onRetry={this.handleManualRetry} />;
  }

  render(): ReactNode {
    const maxRetries = this.props.maxRetries ?? DEFAULT_MAX_RETRIES;

    if (this.state.hasError && this.state.error) {
      const exhausted = this.state.retryCount >= maxRetries || !this.isTransient(this.state.error);

      if (exhausted) {
        return this.renderFallback(this.state.error);
      }

      // A retry is pending. Re-rendering `children` now would immediately throw again and
      // spin React's error path synchronously, so show a subtle indicator until the
      // scheduled retry clears the error state.
      return (
        <View style={styles.retryContainer} accessibilityLabel="Retrying">
          <ActivityIndicator />
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  retryContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});

export default RetryErrorBoundary;
