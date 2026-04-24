import React, { Component, ErrorInfo, ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { crashReportingService } from '../../services/crashReporting';

interface Props {
  children: ReactNode;
  fallback?: ReactNode | ((props: ErrorBoundaryFallbackProps) => ReactNode);
  boundaryName?: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetKey: number;
}

export interface ErrorBoundaryFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  resetError: () => void;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      resetKey: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const boundaryName = this.props.boundaryName ?? 'ErrorBoundary';

    try {
      crashReportingService.reportError(error, boundaryName, {
        componentStack: errorInfo.componentStack,
      });
    } catch (reportingError) {
      console.error('Error reporting failed:', reportingError);
    }

    // Always log locally as a fallback for development and non-configured monitoring.
    console.error(`[${boundaryName}] Caught runtime error:`, error.message);
    console.error(error);
    console.error(`[${boundaryName}] Component stack:\n${errorInfo.componentStack}`);

    this.props.onError?.(error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      resetKey: this.state.resetKey + 1,
    });

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

          {this.state.error?.message ? (
            <Text style={styles.errorText}>{this.state.error.message}</Text>
          ) : null}

          <TouchableOpacity style={styles.button} onPress={this.handleReset}>
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>

          {__DEV__ && this.state.errorInfo?.componentStack ? (
            <Text style={styles.devStack}>{this.state.errorInfo.componentStack}</Text>
          ) : null}
        </View>
      </View>
    );
  }

  render() {
    if (this.state.hasError) {
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
    fontWeight: "bold",
    color: "#d32f2f",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  scrollView: {
    flex: 1,
    marginBottom: 20,
  },
  errorSection: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: '#334155',
  },
  errorText: {
    fontSize: 14,
    color: "#d32f2f",
    fontFamily: "monospace",
  },
  stackText: {
    fontSize: 12,
    fontFamily: "monospace",
    color: '#b91c1c',
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#0ea5e9",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: '600',
  },
  devStack: {
    marginTop: 14,
    fontSize: 11,
    color: '#64748b',
    fontFamily: 'monospace',
  },
});

export default ErrorBoundary;
