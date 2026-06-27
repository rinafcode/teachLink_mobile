import { render, fireEvent, act } from '@testing-library/react-native';
import React from 'react';
import { Text, View } from 'react-native';

import {
  SwipeableCoordinatorProvider,
  useSwipeableCoordinator,
} from '../../components/mobile/SwipeableCoordinator';
import { SwipeableRow } from '../../components/mobile/SwipeableRow';

// Mock expo-haptics for this test file
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn().mockResolvedValue(undefined),
  ImpactFeedbackStyle: { Medium: 'medium' },
}));

describe('SwipeableRow and Coordinator Suite', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders children correctly', () => {
    const { getByText } = render(
      <SwipeableRow id="test-1" onDelete={jest.fn()}>
        <Text>Test Row Content</Text>
      </SwipeableRow>
    );

    expect(getByText('Test Row Content')).toBeTruthy();
  });

  it('renders Delete action when onDelete is provided', () => {
    const { getByTestId, getByText } = render(
      <SwipeableRow id="test-1" onDelete={jest.fn()} deleteLabel="Remove">
        <Text>Content</Text>
      </SwipeableRow>
    );

    expect(getByTestId('delete-btn-test-1')).toBeTruthy();
    expect(getByText('Remove')).toBeTruthy();
  });

  it('renders Archive action when onArchive is provided', () => {
    const { getByTestId, getByText } = render(
      <SwipeableRow id="test-1" onArchive={jest.fn()} archiveLabel="Save to Archive">
        <Text>Content</Text>
      </SwipeableRow>
    );

    expect(getByTestId('archive-btn-test-1')).toBeTruthy();
    expect(getByText('Save to Archive')).toBeTruthy();
  });

  it('executes onDelete callback when delete button is tapped', async () => {
    const onDeleteMock = jest.fn();
    const { getByTestId } = render(
      <SwipeableRow id="test-1" onDelete={onDeleteMock}>
        <Text>Content</Text>
      </SwipeableRow>
    );

    const deleteBtn = getByTestId('delete-btn-test-1');
    await act(async () => {
      fireEvent.press(deleteBtn);
    });

    expect(onDeleteMock).toHaveBeenCalledTimes(1);
  });

  it('executes onArchive callback when archive button is tapped', async () => {
    const onArchiveMock = jest.fn();
    const { getByTestId } = render(
      <SwipeableRow id="test-1" onArchive={onArchiveMock}>
        <Text>Content</Text>
      </SwipeableRow>
    );

    const archiveBtn = getByTestId('archive-btn-test-1');
    await act(async () => {
      fireEvent.press(archiveBtn);
    });

    expect(onArchiveMock).toHaveBeenCalledTimes(1);
  });

  it('cooperates with coordinator to close other open rows', () => {
    const closeRow1 = jest.fn();
    const closeRow2 = jest.fn();

    const TestComponent = () => {
      const { registerRow, onRowSwipeStart } = useSwipeableCoordinator();

      React.useEffect(() => {
        registerRow('row-1', closeRow1);
        registerRow('row-2', closeRow2);
      }, [registerRow]);

      return (
        <View>
          <Text testID="trigger-row-1" onPress={() => onRowSwipeStart('row-1')}>
            Row 1
          </Text>
          <Text testID="trigger-row-2" onPress={() => onRowSwipeStart('row-2')}>
            Row 2
          </Text>
        </View>
      );
    };

    const { getByTestId } = render(
      <SwipeableCoordinatorProvider>
        <TestComponent />
      </SwipeableCoordinatorProvider>
    );

    // Swipe start on row-1
    fireEvent.press(getByTestId('trigger-row-1'));
    expect(closeRow1).not.toHaveBeenCalled();

    // Swipe start on row-2 should close row-1
    fireEvent.press(getByTestId('trigger-row-2'));
    expect(closeRow1).toHaveBeenCalledTimes(1);
    expect(closeRow2).not.toHaveBeenCalled();
  });
});
