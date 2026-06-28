import * as Sentry from '@sentry/react-native';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button, Text, View } from 'react-native';

interface Props {
  children: ReactNode;
  screenName: string;
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