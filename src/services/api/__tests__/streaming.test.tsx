/**
 * STREAMING API - COMPREHENSIVE TEST SUITE
 * 
 * Tests for streaming API service, hook, and components
 * Covers unit tests, integration tests, and performance tests
 */

import { renderHook, waitFor, act } from '@testing-library/react-native';
import { render, screen } from '@testing-library/react-native';
import React from 'react';
import { View, Text } from 'react-native';

import { streamingApi } from '../src/services/api/streaming';
import { useStreamingData, useTTFBMeasurement } from '../src/hooks/useStreamingData';
import { StreamingProgressBar } from '../src/components/common/StreamingProgressBar';

// ─── Mock Data ──────────────────────────────────────────────────────────────

interface MockItem {
  id: string;
  title: string;
  description?: string;
}

const mockStreamingData: MockItem[] = [
  { id: '1', title: 'Item 1', description: 'First item' },
  { id: '2', title: 'Item 2', description: 'Second item' },
  { id: '3', title: 'Item 3', description: 'Third item' },
  { id: '4', title: 'Item 4', description: 'Fourth item' },
  { id: '5', title: 'Item 5', description: 'Fifth item' },
];

// Mock fetch for testing
global.fetch = jest.fn();

const mockNDJSONResponse = (items: MockItem[]) => {
  const ndjson = items.map(item => JSON.stringify(item)).join('\n');
  return new Response(ndjson, {
    status: 200,
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
    },
  });
};

// ─── STREAMING API SERVICE TESTS ────────────────────────────────────────────

describe('StreamingApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('stream()', () => {
    it('should stream NDJSON data successfully', async () => {
      const chunks: MockItem[] = [];
      const onChunk = jest.fn((chunk: any) => {
        chunks.push(chunk.data);
      });

      (global.fetch as jest.Mock).mockResolvedValue(
        mockNDJSONResponse(mockStreamingData)
      );

      const result = await streamingApi.stream<MockItem>('/api/test', {
        onChunk,
        format: 'ndjson',
      });

      expect(result).toHaveLength(mockStreamingData.length);
      expect(onChunk).toHaveBeenCalled();
      expect(chunks).toEqual(mockStreamingData);
    });

    it('should track TTFB (Time To First Byte)', async () => {
      const onFirstByte = jest.fn();

      (global.fetch as jest.Mock).mockResolvedValue(
        mockNDJSONResponse(mockStreamingData)
      );

      await streamingApi.stream<MockItem>('/api/test', {
        onFirstByte,
        format: 'ndjson',
      });

      expect(onFirstByte).toHaveBeenCalled();
      expect(onFirstByte).toHaveBeenCalledWith(expect.any(Number));
    });

    it('should track progress', async () => {
      const onProgress = jest.fn();

      (global.fetch as jest.Mock).mockResolvedValue(
        mockNDJSONResponse(mockStreamingData)
      );

      await streamingApi.stream<MockItem>('/api/test', {
        onProgress,
        format: 'ndjson',
      });

      expect(onProgress).toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledWith(100); // Final progress
    });

    it('should handle streaming errors', async () => {
      const onError = jest.fn();
      const error = new Error('Network error');

      (global.fetch as jest.Mock).mockRejectedValue(error);

      try {
        await streamingApi.stream<MockItem>('/api/test', {
          onError,
        });
      } catch (err) {
        expect(onError).toHaveBeenCalledWith(expect.any(Error));
      }
    });

    it('should timeout if response takes too long', async () => {
      (global.fetch as jest.Mock).mockImplementation(
        () => new Promise((resolve) => {
          setTimeout(() => resolve(mockNDJSONResponse(mockStreamingData)), 60000);
        })
      );

      try {
        await streamingApi.stream<MockItem>('/api/test', {
          timeout: 100, // Very short timeout
        });
      } catch (err: any) {
        expect(err.message).toContain('timeout');
      }
    });
  });

  describe('streamWithRetry()', () => {
    it('should retry on failure', async () => {
      let attempts = 0;

      (global.fetch as jest.Mock).mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve(mockNDJSONResponse(mockStreamingData));
      });

      const result = await streamingApi.streamWithRetry<MockItem>(
        '/api/test',
        { maxRetries: 3, format: 'ndjson' }
      );

      expect(attempts).toBe(3);
      expect(result).toHaveLength(mockStreamingData.length);
    });

    it('should fail after max retries exceeded', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(
        new Error('Persistent network error')
      );

      try {
        await streamingApi.streamWithRetry<MockItem>('/api/test', {
          maxRetries: 2,
        });
      } catch (err: any) {
        expect(err.message).toContain('failed after retries');
      }
    });

    it('should apply exponential backoff', async () => {
      const timings: number[] = [];
      let lastTime = Date.now();

      (global.fetch as jest.Mock).mockImplementation(() => {
        timings.push(Date.now() - lastTime);
        lastTime = Date.now();

        if (timings.length < 2) {
          return Promise.reject(new Error('Retry me'));
        }
        return Promise.resolve(mockNDJSONResponse(mockStreamingData));
      });

      await streamingApi.streamWithRetry<MockItem>('/api/test', {
        maxRetries: 2,
      });

      // Second delay should be longer than first (exponential backoff)
      expect(timings[1]).toBeGreaterThan(timings[0]);
    });
  });

  describe('measureTTFB()', () => {
    it('should measure and return TTFB', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(
        mockNDJSONResponse(mockStreamingData)
      );

      const ttfb = await streamingApi.measureTTFB('/api/test');

      expect(ttfb).toBeGreaterThan(0);
      expect(ttfb).toBeLessThan(5000); // Should be relatively quick
    });
  });
});

// ─── USE STREAMING DATA HOOK TESTS ──────────────────────────────────────────

describe('useStreamingData Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch data on mount with autoFetch=true', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockNDJSONResponse(mockStreamingData)
    );

    const { result } = renderHook(() =>
      useStreamingData<MockItem>('/api/test', { autoFetch: true })
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toHaveLength(mockStreamingData.length);
  });

  it('should not fetch on mount with autoFetch=false', async () => {
    const { result } = renderHook(() =>
      useStreamingData<MockItem>('/api/test', { autoFetch: false })
    );

    expect(result.current.data).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
  });

  it('should track streaming progress', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockNDJSONResponse(mockStreamingData)
    );

    const { result } = renderHook(() =>
      useStreamingData<MockItem>('/api/test', { autoFetch: true })
    );

    await waitFor(() => {
      expect(result.current.progress).toBe(100);
    });
  });

  it('should record TTFB', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockNDJSONResponse(mockStreamingData)
    );

    const { result } = renderHook(() =>
      useStreamingData<MockItem>('/api/test', { autoFetch: true })
    );

    await waitFor(() => {
      expect(result.current.ttfb).toBeGreaterThan(0);
    });
  });

  it('should deduplicate items by key', async () => {
    const duplicateData = [
      ...mockStreamingData,
      mockStreamingData[0], // Duplicate
    ];

    (global.fetch as jest.Mock).mockResolvedValue(
      mockNDJSONResponse(duplicateData)
    );

    const { result } = renderHook(() =>
      useStreamingData<MockItem>('/api/test', {
        autoFetch: true,
        deduplicateKey: 'id',
      })
    );

    await waitFor(() => {
      expect(result.current.data).toHaveLength(mockStreamingData.length);
    });
  });

  it('should apply transformation function', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockNDJSONResponse(mockStreamingData)
    );

    const { result } = renderHook(() =>
      useStreamingData<MockItem & { transformed: boolean }>(
        '/api/test',
        {
          autoFetch: true,
          transform: (item) => ({
            ...item,
            transformed: true,
          }),
        }
      )
    );

    await waitFor(() => {
      expect(result.current.data.length).toBeGreaterThan(0);
      result.current.data.forEach((item) => {
        expect((item as any).transformed).toBe(true);
      });
    });
  });

  it('should allow manual fetch', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockNDJSONResponse(mockStreamingData)
    );

    const { result } = renderHook(() =>
      useStreamingData<MockItem>('/api/test', { autoFetch: false })
    );

    expect(result.current.data).toHaveLength(0);

    await act(async () => {
      await result.current.fetch();
    });

    expect(result.current.data).toHaveLength(mockStreamingData.length);
  });

  it('should allow retry on error', async () => {
    (global.fetch as jest.Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce(mockNDJSONResponse(mockStreamingData));

    const { result } = renderHook(() =>
      useStreamingData<MockItem>('/api/test', { autoFetch: true })
    );

    await waitFor(() => {
      expect(result.current.error).toBeDefined();
    });

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.data).toHaveLength(mockStreamingData.length);
      expect(result.current.error).toBeNull();
    });
  });

  it('should reset state', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockNDJSONResponse(mockStreamingData)
    );

    const { result } = renderHook(() =>
      useStreamingData<MockItem>('/api/test', { autoFetch: true })
    );

    await waitFor(() => {
      expect(result.current.data).toHaveLength(mockStreamingData.length);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toHaveLength(0);
    expect(result.current.progress).toBe(0);
    expect(result.current.ttfb).toBeNull();
  });
});

// ─── STREAMING PROGRESS BAR COMPONENT TESTS ─────────────────────────────────

describe('StreamingProgressBar Component', () => {
  it('should render when streaming', () => {
    render(
      <StreamingProgressBar
        progress={50}
        isStreaming={true}
        chunkCount={5}
        ttfb={250}
      />
    );

    expect(screen.getByText('50%')).toBeVisible();
  });

  it('should not render when not streaming and progress is 0', () => {
    const { container } = render(
      <StreamingProgressBar
        progress={0}
        isStreaming={false}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should display metrics when showMetrics is true', () => {
    render(
      <StreamingProgressBar
        progress={75}
        isStreaming={true}
        chunkCount={10}
        ttfb={300}
        showMetrics={true}
      />
    );

    expect(screen.getByText(/75%/)).toBeVisible();
    expect(screen.getByText(/10 items/)).toBeVisible();
    expect(screen.getByText(/⚡ TTFB: 300ms/)).toBeVisible();
  });

  it('should hide metrics when showMetrics is false', () => {
    render(
      <StreamingProgressBar
        progress={75}
        isStreaming={true}
        showMetrics={false}
      />
    );

    expect(screen.queryByText(/75%/)).toBeNull();
  });

  it('should display total time when streaming is complete', () => {
    render(
      <StreamingProgressBar
        progress={100}
        isStreaming={false}
        totalTime={5000}
        showMetrics={true}
      />
    );

    expect(screen.getByText(/Total: 5.0s/)).toBeVisible();
  });
});

// ─── USE TTFB MEASUREMENT HOOK TESTS ────────────────────────────────────────

describe('useTTFBMeasurement Hook', () => {
  it('should measure and return TTFB', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockNDJSONResponse(mockStreamingData)
    );

    const { result } = renderHook(() =>
      useTTFBMeasurement('/api/test')
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.ttfb).toBeGreaterThan(0);
  });

  it('should handle measurement errors', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(
      new Error('Network error')
    );

    const { result } = renderHook(() =>
      useTTFBMeasurement('/api/test')
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeDefined();
  });
});

// ─── INTEGRATION TESTS ──────────────────────────────────────────────────────

describe('Streaming Integration', () => {
  it('should work end-to-end: hook + component', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(
      mockNDJSONResponse(mockStreamingData)
    );

    const TestComponent = () => {
      const { data, isStreaming, progress, ttfb } = useStreamingData<MockItem>(
        '/api/test',
        { autoFetch: true }
      );

      return (
        <View>
          <StreamingProgressBar
            progress={progress}
            isStreaming={isStreaming}
            ttfb={ttfb}
          />
          {data.map((item) => (
            <Text key={item.id}>{item.title}</Text>
          ))}
        </View>
      );
    };

    render(<TestComponent />);

    // Progress bar appears while streaming
    await waitFor(() => {
      expect(screen.getByText(/\d+%/)).toBeVisible();
    });

    // Content appears as data streams
    await waitFor(() => {
      mockStreamingData.forEach((item) => {
        expect(screen.getByText(item.title)).toBeVisible();
      });
    });
  });
});

// ─── PERFORMANCE TESTS ──────────────────────────────────────────────────────

describe('Streaming Performance', () => {
  it('should measure TTFB improvement over traditional fetch', async () => {
    const largeDataSet = Array.from({ length: 1000 }, (_, i) => ({
      id: String(i),
      title: `Item ${i}`,
    }));

    (global.fetch as jest.Mock).mockResolvedValue(
      mockNDJSONResponse(largeDataSet)
    );

    const startTime = performance.now();
    let ttfbTime: number | null = null;

    await streamingApi.stream(
      '/api/large',
      {
        onFirstByte: (ttfb) => {
          ttfbTime = ttfb;
        },
        format: 'ndjson',
      }
    );

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    // TTFB should be significantly less than total time
    expect(ttfbTime).toBeLessThan(totalTime * 0.5);
  });

  it('should handle large datasets efficiently', async () => {
    const largeDataSet = Array.from({ length: 10000 }, (_, i) => ({
      id: String(i),
      title: `Item ${i}`,
      description: `Description for item ${i}`,
    }));

    (global.fetch as jest.Mock).mockResolvedValue(
      mockNDJSONResponse(largeDataSet)
    );

    const startTime = performance.now();

    const result = await streamingApi.stream(
      '/api/large',
      { format: 'ndjson' }
    );

    const endTime = performance.now();

    expect(result).toHaveLength(largeDataSet.length);
    expect(endTime - startTime).toBeLessThan(5000); // Should complete in reasonable time
  });
});
