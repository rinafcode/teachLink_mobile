import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import ScreenErrorBoundary from '../../components/common/ScreenErrorBoundary';

// Mock Sentry so we don't actually send errors
jest.mock('@sentry/react-native', () => ({
  withScope: jest.fn((callback) => callback({ setTag: jest.fn() })),
  captureException: jest.fn(),
}));

const ProblemChild = () => {
  throw new Error('Test error');
  return <Text>You should not see this</Text>;
};


describe('ScreenErrorBoundary', () => {
  it('should render children when there is no error', () => {
    const { getByText } = render(
      <ScreenErrorBoundary screenName="TestScreen">
        <Text>Hello World</Text>
      </ScreenErrorBoundary>
    );

    expect(getByText('Hello World')).toBeTruthy();
  });

  it('should render an error message when a child component throws an error', () => {
    const { getByText } = render(
      <ScreenErrorBoundary screenName="TestScreen">
        <ProblemChild />
      </ScreenErrorBoundary>
    );

    expect(getByText('This screen encountered an error.')).toBeTruthy();
  });

  it('should allow the user to retry rendering the child component', () => {
    const { getByText, queryByText } = render(
      <ScreenErrorBoundary screenName="TestScreen">
        <ProblemChild />
      </ScreenErrorBoundary>
    );

    expect(getByText('This screen encountered an error.')).toBeTruthy();

    fireEvent.press(getByText('Retry'));

    // After retrying, the error boundary should re-render its children.
    // In this test case, ProblemChild will throw an error again.
    expect(getByText('This screen encountered an error.')).toBeTruthy();
  });
});