import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import * as Device from 'expo-device';

import { InfiniteVirtualList } from '../../src/components/mobile/InfiniteVirtualList';

// Mock expo-device
jest.mock('expo-device', () => ({
  totalMemory: 4 * 1024 * 1024 * 1024, // High-end by default (4GB)
}));

// Mock memory monitor logger to check alerts
jest.mock('../../src/utils/logger', () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
  logger: {
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

import logger from '../../src/utils/logger';

describe('InfiniteVirtualList', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderItem = ({ item }: { item: { id: string; name: string } }) => (
    <View style={{ height: 50 }}>
      <Text>{item.name}</Text>
    </View>
  );

  const keyExtractor = (item: { id: string }) => item.id;

  it('renders a small subset of items initially and loads more near bottom', () => {
    const data = Array.from({ length: 50 }, (_, i) => ({ id: String(i), name: `Item ${i}` }));
    const onEndReached = jest.fn();

    const { getByText, queryByText } = render(
      <InfiniteVirtualList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        itemHeight={50}
        onEndReached={onEndReached}
      />
    );

    // Initial items rendered
    expect(getByText('Item 0')).toBeTruthy();
    expect(getByText('Item 4')).toBeTruthy();
  });

  it('successfully handles large datasets of 10000+ items without blowing memory limits', () => {
    const largeData = Array.from({ length: 12000 }, (_, i) => ({
      id: String(i),
      name: `Large Item ${i}`,
    }));
    const onEndReached = jest.fn();

    const { getByText } = render(
      <InfiniteVirtualList
        data={largeData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        itemHeight={50}
        onEndReached={onEndReached}
        listId="SuperLargeTestList"
      />
    );

    // Assert that warnings for critical memory size are fired appropriately in logging
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('[Memory Monitor] SuperLargeTestList: CRITICAL')
    );
  });

  it('renders progress spinner at the bottom when loadingMore is true', () => {
    const data = [{ id: '1', name: 'Item 1' }];
    const onEndReached = jest.fn();

    const { getByTestId, rerender } = render(
      <InfiniteVirtualList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        itemHeight={50}
        onEndReached={onEndReached}
        loadingMore={true}
      />
    );

    expect(getByTestId('infinite-list-spinner')).toBeTruthy();

    rerender(
      <InfiniteVirtualList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        itemHeight={50}
        onEndReached={onEndReached}
        loadingMore={false}
      />
    );

    expect(() => getByTestId('infinite-list-spinner')).toThrow();
  });

  it('applies low-end device profiles when total memory is below 2GB', () => {
    // Force totalMemory to low-end
    Object.defineProperty(Device, 'totalMemory', {
      value: 1.5 * 1024 * 1024 * 1024,
      writable: true,
    });

    const data = [{ id: '1', name: 'Item 1' }];
    const onEndReached = jest.fn();

    const { getByTestId } = render(
      <InfiniteVirtualList
        data={data}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        itemHeight={50}
        onEndReached={onEndReached}
        testID="optimized-list"
      />
    );

    const list = getByTestId('optimized-list');

    // FlatList optimization parameters check
    expect(list.props.windowSize).toBe(3);
    expect(list.props.maxToRenderPerBatch).toBe(5);
    expect(list.props.initialNumToRender).toBe(5);
    expect(list.props.updateCellsBatchingPeriod).toBe(100);
  });
});
