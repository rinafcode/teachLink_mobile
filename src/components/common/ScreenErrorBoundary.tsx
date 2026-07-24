import * as Sentry from '@sentry/react-native';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Text, View } from 'react-native';

interface Props {
  children: ReactNode;
  screenName: string;
  /**
   * When any value in this array changes, the boundary automatically resets.
   * Pass the route key so navigating to/from a screen clears a stale error.
   */
  resetKeys?: ReadonlyArray<unknown>;
}

interface State {
  hasError: boolean;
}

class ScreenErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.withScope((scope) => {
      scope.setTag('screen', this.props.screenName);
      Sentry.captureException(error, { extra: errorInfo });
    });
  }

  componentDidUpdate(prevProps: Props) {
    // Reset the boundary when the resetKeys change (e.g. the route key), so a
    // recovered screen re-mounts cleanly instead of staying on the fallback.
    if (this.state.hasError && this.didResetKeysChange(prevProps.resetKeys, this.props.resetKeys)) {
      this.setState({ hasError: false });
    }
  }

  didResetKeysChange(
    prev: ReadonlyArray<unknown> | undefined,
    next: ReadonlyArray<unknown> | undefined
  ): boolean {
    if (prev === next) return false;
    if (!prev || !next || prev.length !== next.length) return true;
    return prev.some((value, index) => !Object.is(value, next[index]));
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  handleGoHome = () => {
    // This assumes you are using a navigation library that can navigate to a "Home" route.
    // You may need to adjust this depending on your navigation setup.
    // For expo-router, you might use router.replace('/');
  };

  render() {
    if (this.state.hasError) {
      return (
        <View>
          <Text>This screen encountered an error.</Text>
          <Button title="Retry" onPress={this.handleRetry} />
          <Button title="Go Home" onPress={this.handleGoHome} />
        </View>
      );
    }

    return this.props.children;
  }
}

export default ScreenErrorBoundary;

/**
 * Wraps a screen component in a ScreenErrorBoundary so a render error in one
 * screen shows an in-screen fallback instead of unmounting the whole app.
 *
 * Usage: `export default withScreenErrorBoundary(ProfileScreen, 'Profile');`
 */
export function withScreenErrorBoundary<P extends object>(
  ScreenComponent: React.ComponentType<P>,
  screenName: string
): React.FC<P> {
  const Wrapped: React.FC<P> = (props) => (
    <ScreenErrorBoundary screenName={screenName}>
      <ScreenComponent {...props} />
    </ScreenErrorBoundary>
  );

  Wrapped.displayName = `withScreenErrorBoundary(${screenName})`;
  return Wrapped;
}