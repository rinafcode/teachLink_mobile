import * as Sentry from '@sentry/react-native';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { crashReportingService } from '../../services/crashReporting';
import { appLogger } from '../../utils/logger';

/**
 * Props passed to a function `fallback` render prop.
 */
export interface ErrorBoundaryFallbackProps {
  /** The error that was caught. */
  error: Error | null;
  /** Additional error information from React. */
  errorInfo: ErrorInfo | null;
  /** Resets the boundary and re-renders the child tree. */
  resetError: () => void;
}

/**
 * Props for the ErrorBoundary component.
 *
 * This is the single error-boundary implementation for the app. It is a strict
 * superset of the original `ErrorBoundary` surface (`children`, `fallback`,
 * `boundaryName`, `onError`, `onReset`) and additionally folds in the optional
 * automatic-retry behaviour of the former `RetryErrorBoundary` (`autoRetry`,
 * `maxRetries`, `baseDelayMs`, `isTransient`, `onRetrySuccess`,
 * `onMaxRetriesReached`) and the route-key auto-reset of the former
 * `ScreenErrorBoundary` (`resetKeys`). Auto-retry is opt-in: consumers that do
 * not pass `autoRetry` (or `maxRetries`) behave exactly as the original
 * boundary — an error is reported and the fallback is shown immediately.
 */
export interface ErrorBoundaryProps {
  /** Child components to be wrapped by the error boundary. */
  children: ReactNode;
  /** Fallback UI to display when an error occurs. Can be a React node or a function receiving error props. */
  fallback?: ReactNode | ((props: ErrorBoundaryFallbackProps) => ReactNode);
  /** Optional name used to identify the boundary in logs and Sentry tags. */
  boundaryName?: string;
  /** Called when an error is caught. */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Called when the boundary is reset (Retry button or `resetKeys` change). */
  onReset?: () => void;

  /**
   * Enables silent automatic retries with exponential backoff for transient
   * render errors before showing the fallback UI.
   */
  autoRetry?: boolean;
  /** Maximum automatic retries before the fallback UI is shown. Default: 3. */
  maxRetries?: number;
  /** Delay (ms) before the first retry; subsequent retries grow exponentially. Default: 500. */
  baseDelayMs?: number;
  /**
   * Classifies an error as transient (retryable). When omitted, every error is
   * treated as transient. Returning `false` skips retries and shows the fallback
   * immediately.
   */
  isTransient?: (error: Error) => boolean;
  /** Called when an automatic retry re-renders the child tree successfully. */
  onRetrySuccess?: (retryCount: number) => void;
  /** Called when retries are exhausted or the error is classified as non-transient. */
  onMaxRetriesReached?: (error: Error) => void;

  /**
   * When any value in this array changes while an error is caught, the boundary
   * auto-resets. Pass a route key so navigating to/from a screen clears a stale error.
   */
  resetKeys?: ReadonlyArray<unknown>;
}

/**
 * Internal state for {@link ErrorBoundary}.
 */
export interface ErrorBoundaryState {
  /** Whether an error is currently caught. */
  hasError: boolean;
  /** The most recently caught error. */
  error: Error | null;
  /** Additional error information from React. */
  errorInfo: ErrorInfo | null;
  /** Key used to force a re-render of children after a reset. */
  resetKey: number;
  /** Number of automatic retries attempted for the current failure streak. */
  retryCount: number;
  /** Whether a retry is scheduled and pending. */
  isRetrying: boolean;
  /** Total successful retries since mount. */
  retrySuccessCount: number;
  /** Total failed/abandoned retries since mount. */
  retryFailureCount: number;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_BASE_DELAY_MS = 500;
const MAX_BACKOFF_MS = 10_000;

/**
 * The single error boundary used across the app.
 *
 * React error boundaries only catch errors thrown during render, in lifecycle
 * methods, and in child constructors; they do not catch event-handler or async
 * errors. When `autoRetry` is enabled, a caught error is retried after an
 * exponential backoff (`baseDelayMs * 2 ^ retryCount`, capped at 10 s); a clean
 * render counts as a successful retry, another throw increments the retry count.
 * Every caught error is reported to Sentry with an `errorBoundary` tag plus the
 * local logger, regardless of the retry configuration.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      resetKey: 0,
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
      errorInfo: null,
      isRetrying: false,
    };
  }

  private retrying(): boolean {
    return this.props.autoRetry === true || this.props.maxRetries !== undefined;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const boundaryName = this.props.boundaryName ?? 'ErrorBoundary';

    try {
      Sentry.withScope(scope => {
        scope.setExtra('componentStack', errorInfo.componentStack);
        scope.setExtra('boundaryName', boundaryName);
        scope.setTag('errorBoundary', boundaryName);
        Sentry.captureException(error);
      });

      crashReportingService.reportError(error, boundaryName, {
        componentStack: errorInfo.componentStack,
      });
    } catch (reportingError) {
      appLogger.errorSync('Error reporting failed:', reportingError);
    }

    // Always log locally as a fallback for development and non-configured monitoring.
    appLogger.errorSync(`[${boundaryName}] Caught runtime error:`, error.message);
    appLogger.errorSync(error);
    appLogger.errorSync(`[${boundaryName}] Component stack:\n${errorInfo.componentStack}`);

    this.props.onError?.(error, errorInfo);

    if (this.retrying()) {
      const maxRetries = this.props.maxRetries ?? DEFAULT_MAX_RETRIES;

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
      } else {
        appLogger.warnSync('Max retries reached for error boundary', {
          error: error.message,
          retryCount: this.state.retryCount,
        });
        this.setState(prev => ({ retryFailureCount: prev.retryFailureCount + 1 }));
        this.props.onMaxRetriesReached?.(error);
      }
    }

    this.setState({ error, errorInfo });
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState): void {
    const resetKeysChanged = this.didResetKeysChange(prevProps.resetKeys, this.props.resetKeys);

    // A retry succeeded when the error state clears after at least one retry attempt
    // and the child re-renders without throwing again (otherwise `hasError` stays true).
    if (this.retrying() && !resetKeysChanged) {
      if (prevState.hasError && !this.state.hasError && this.state.retryCount > 0) {
        this.setState(prev => ({ retrySuccessCount: prev.retrySuccessCount + 1 }));
        appLogger.infoSync('Error boundary retry succeeded', {
          retryCount: this.state.retryCount,
        });
        this.props.onRetrySuccess?.(this.state.retryCount);
      }
    }

    // Reset the boundary when the resetKeys change (e.g. the route key), so a recovered
    // screen re-mounts cleanly instead of staying on the fallback.
    if (this.state.hasError && resetKeysChanged) {
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: 0,
        isRetrying: false,
      });
    }
  }

  componentWillUnmount(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
  }

  private didResetKeysChange(
    prev: ReadonlyArray<unknown> | undefined,
    next: ReadonlyArray<unknown> | undefined
  ): boolean {
    if (prev === next) return false;
    if (!prev || !next || prev.length !== next.length) return true;
    return prev.some((value, index) => !Object.is(value, next[index]));
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
        errorInfo: null,
        isRetrying: false,
        retryCount: prev.retryCount + 1,
      }));
    }, delay);
  }

  handleReset = (): void => {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }
    this.setState(prev => ({
      hasError: false,
      error: null,
      errorInfo: null,
      resetKey: prev.resetKey + 1,
      retryCount: 0,
      isRetrying: false,
    }));

    this.props.onReset?.();
  };

  renderFallback() {
    const fallbackProps: ErrorBoundaryFallbackProps = {
      error: this.state.error,
      errorInfo: this.state.errorInfo,
      resetError: this.handleReset,
    };

    if (typeof this.props.fallback === 'function') {
      return this.props.fallback(fallbackProps);
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.subtitle}>We could not display this section. Try again.</Text>

          {__DEV__ && this.state.error?.message ? (
            <Text style={styles.errorText}>{this.state.error.message}</Text>
          ) : null}

          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  render() {
    const maxRetries = this.props.maxRetries ?? DEFAULT_MAX_RETRIES;

    if (this.state.hasError && this.state.error) {
      if (this.retrying()) {
        const exhausted =
          this.state.retryCount >= maxRetries || !this.isTransient(this.state.error);

        if (exhausted) {
          return this.renderFallback();
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

      return this.renderFallback();
    }

    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#b91c1c',
    fontFamily: 'monospace',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  retryContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
});

export default ErrorBoundary;
