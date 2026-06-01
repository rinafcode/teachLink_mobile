/**
 * STREAMING API SERVICE
 * 
 * Implements progressive rendering of large API responses using chunked transfer encoding.
 * Allows components to display data incrementally as chunks arrive, improving perceived performance
 * and reducing Time To First Byte (TTFB).
 * 
 * Features:
 * - Chunk-based data streaming with progressive state updates
 * - Support for NDJSON (newline-delimited JSON) and JSON array formats
 * - Error handling with partial response recovery
 * - Progress tracking and TTFB measurement
 * - Automatic timeout protection
 */

import { getEnv } from "../../config";
import { appLogger } from "../../utils/logger";
import { getAccessToken } from "../secureStorage";

/**
 * Represents a single chunk received from the streaming endpoint
 */
export interface StreamChunk<T> {
  data: T;
  index: number;
  timestamp: number;
  isLastChunk: boolean;
}

/**
 * Configuration for streaming requests
 */
export interface StreamingConfig {
  /** Callback invoked for each chunk received */
  onChunk?: <T>(chunk: StreamChunk<T>) => void;
  /** Callback for overall progress (0-100) */
  onProgress?: (progress: number) => void;
  /** Called when first byte is received (for TTFB measurement) */
  onFirstByte?: (ttfb: number) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Format: 'ndjson' or 'json-array' (default: 'ndjson') */
  format?: 'ndjson' | 'json-array';
  /** Optional authorization token override */
  token?: string;
}

/**
 * Streaming response metadata
 */
export interface StreamingMetadata {
  /** Time to first byte in milliseconds */
  ttfb: number;
  /** Total chunks received */
  totalChunks: number;
  /** Total response time in milliseconds */
  totalTime: number;
  /** Content length if available */
  contentLength?: number;
  /** Bytes received so far */
  bytesReceived: number;
}

class StreamingApiService {
  private baseURL = getEnv("EXPO_PUBLIC_API_BASE_URL");

  /**
   * Stream data from an endpoint using fetch streaming API
   * Supports NDJSON (newline-delimited JSON) format for optimal progressive rendering
   * 
   * @example
   * ```typescript
   * const results: any[] = [];
   * await streamingApi.stream('/api/search/results', {
   *   onChunk: (chunk) => {
   *     results.push(chunk.data);
   *     updateUI(results);
   *   },
   *   onFirstByte: (ttfb) => console.log(`TTFB: ${ttfb}ms`),
   * });
   * ```
   */
  async stream<T = unknown>(
    endpoint: string,
    config: StreamingConfig = {}
  ): Promise<T[]> {
    const {
      onChunk,
      onProgress,
      onFirstByte,
      onError,
      timeout = 30000,
      format = 'ndjson',
      token: overrideToken,
    } = config;

    const startTime = Date.now();
    let firstByteTime: number | null = null;
    const results: T[] = [];
    let chunkIndex = 0;
    let bytesReceived = 0;

    try {
      // Get authorization token
      const token = overrideToken || (await getAccessToken());
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Add streaming preference header
      headers['Accept'] = format === 'ndjson' ? 'application/x-ndjson' : 'application/json';

      const url = `${this.baseURL}${endpoint}`;

      const response = await Promise.race([
        fetch(url, { headers }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Streaming request timeout')), timeout)
        ),
      ]);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : undefined;

      // Get the response body reader
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      // Process chunks as they arrive
      while (true) {
        const { done, value } = await reader.read();

        // Record TTFB on first byte
        if (firstByteTime === null) {
          firstByteTime = Date.now() - startTime;
          onFirstByte?.(firstByteTime);

          appLogger.infoSync('Streaming started', {
            endpoint,
            ttfb: firstByteTime,
          });
        }

        if (done) break;

        bytesReceived += value.length;
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        // Parse chunks based on format
        if (format === 'ndjson') {
          buffer = await this.parseNDJSON<T>(
            buffer,
            results,
            chunkIndex,
            onChunk,
            onProgress,
            totalBytes,
            bytesReceived
          );
          chunkIndex = results.length;
        } else if (format === 'json-array') {
          // For JSON arrays, accumulate until complete
          try {
            const parsed = JSON.parse(buffer);
            if (Array.isArray(parsed)) {
              results.length = 0;
              results.push(...parsed);
              chunkIndex = parsed.length;

              onChunk?.({
                data: parsed as unknown as T,
                index: 0,
                timestamp: Date.now(),
                isLastChunk: false,
              });

              if (totalBytes) {
                onProgress?.(Math.min(100, (bytesReceived / totalBytes) * 100));
              }
            }
          } catch {
            // JSON not yet complete, continue reading
          }
        }
      }

      const totalTime = Date.now() - startTime;

      // Log streaming completion metrics
      appLogger.infoSync('Streaming completed', {
        endpoint,
        ttfb: firstByteTime,
        totalTime,
        chunksReceived: chunkIndex,
        bytesReceived,
      });

      // Final progress update
      onProgress?.(100);

      return results;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);

      appLogger.errorSync('Streaming error', err, {
        endpoint,
        elapsed: Date.now() - startTime,
      });

      throw err;
    }
  }

  /**
   * Parse NDJSON format (one JSON object per line)
   * @private
   */
  private async parseNDJSON<T>(
    buffer: string,
    results: T[],
    startIndex: number,
    onChunk?: (chunk: StreamChunk<T>) => void,
    onProgress?: (progress: number) => void,
    totalBytes?: number,
    bytesReceived?: number
  ): Promise<string> {
    const lines = buffer.split('\n');

    // Keep the last incomplete line in the buffer
    const incompleteLastLine = lines[lines.length - 1];
    const completedLines = lines.slice(0, -1);

    for (let i = 0; i < completedLines.length; i++) {
      const line = completedLines[i].trim();
      if (!line) continue;

      try {
        const parsed = JSON.parse(line) as T;
        const index = startIndex + i;
        results.push(parsed);

        onChunk?.({
          data: parsed,
          index,
          timestamp: Date.now(),
          isLastChunk: false,
        });

        if (totalBytes && bytesReceived) {
          onProgress?.(Math.min(99, (bytesReceived / totalBytes) * 100));
        }
      } catch (parseError) {
        appLogger.warnSync('Failed to parse NDJSON line', {
          line: line.substring(0, 100),
          error: parseError instanceof Error ? parseError.message : String(parseError),
        });
      }
    }

    return incompleteLastLine;
  }

  /**
   * Stream with automatic retry on failure
   * Useful for unreliable connections
   */
  async streamWithRetry<T = unknown>(
    endpoint: string,
    config: StreamingConfig & { maxRetries?: number } = {}
  ): Promise<T[]> {
    const { maxRetries = 3, ...streamConfig } = config;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        appLogger.infoSync(`Streaming attempt ${attempt}/${maxRetries}`, { endpoint });
        return await this.stream<T>(endpoint, streamConfig);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 4000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('Streaming failed after retries');
  }

  /**
   * Measure TTFB for a streaming endpoint
   * Useful for performance monitoring
   */
  async measureTTFB(endpoint: string, token?: string): Promise<number> {
    return new Promise((resolve, reject) => {
      this.stream(endpoint, {
        token,
        onFirstByte: (ttfb) => resolve(ttfb),
        onError: reject,
      }).catch(reject);
    });
  }
}

export const streamingApi = new StreamingApiService();
