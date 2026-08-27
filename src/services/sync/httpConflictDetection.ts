/**
 * Unified conflict detection for HTTP 409 responses.
 *
 * Before this module, conflict detection was duplicated in three places:
 *   1. axios.config.ts — the 409 response handler
 *   2. syncService.ts — isConflictError() / extractConflictPayload()
 *   3. syncEntityManager — used by the WebSocket sync path
 *
 * This module provides the single detection entry point for HTTP-originated
 * conflicts. The WebSocket path continues to use syncEntityManager which
 * calls conflictResolver.ts directly.
 *
 * See docs/conflict-resolution-strategy.md for the full strategy.
 */

import type { ConflictData } from '../../store/conflictStore';

/** Runtime shape validator for 409 conflict response bodies. */
export function isConflictResponseShape(data: unknown): data is {
  serverVersion?: unknown;
  serverVersionNumber?: number;
  localVersion?: unknown;
  entityType?: string;
  entityId?: string;
  message?: string;
} {
  return data !== null && data !== undefined && typeof data === 'object';
}

/**
 * Detect whether an error is a sync conflict (HTTP 409).
 * Centralises the check that was previously duplicated in syncService.ts
 * (isConflictError) and axios.config.ts (status === 409).
 */
export function isConflictError(error: any): boolean {
  return (
    error?.status === 409 ||
    error?.response?.status === 409 ||
    error?.code === 'CONFLICT'
  );
}

/**
 * Build a ConflictData record from a 409 HTTP response.
 *
 * Used by the axios.config.ts response interceptor to feed the unified
 * conflictStore, and replaces the inline construction that was there before.
 */
export function buildConflictDataFromHttpError(params: {
  responseData: ReturnType<typeof isConflictResponseShape> extends boolean ? any : never;
  requestConfig: {
    data?: unknown;
    url?: string;
    method?: string;
    headers?: Record<string, unknown>;
  };
}): ConflictData {
  const { responseData, requestConfig } = params;

  const clientVersionHeader = requestConfig.headers?.['X-Last-Known-Version'];
  const clientTimestampHeader = requestConfig.headers?.['X-Client-Timestamp'];
  const entityTypeHeader = requestConfig.headers?.['X-Entity-Type'];
  const entityIdHeader = requestConfig.headers?.['X-Entity-Id'];

  return {
    id: `conflict_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
    entityId: responseData?.entityId ?? String(entityIdHeader ?? ''),
    entityType: responseData?.entityType ?? String(entityTypeHeader ?? 'unknown'),
    localData: requestConfig.data,
    serverData: responseData?.serverVersion,
    localVersion: clientVersionHeader ? Number(clientVersionHeader) : undefined,
    serverVersion: responseData?.serverVersionNumber,
    clientTimestamp: clientTimestampHeader ? Number(clientTimestampHeader) : Date.now(),
    serverTimestamp: Date.now(),
    endpoint: requestConfig.url ?? '',
    method: (requestConfig.method ?? 'UNKNOWN').toUpperCase(),
    detectedAt: Date.now(),
  };
}

/**
 * Extract conflict payload from an error for logging / event emission.
 * Replaces syncService.extractConflictPayload.
 */
export function extractConflictPayload(error: any): any {
  return error?.response?.data ?? error?.data ?? error?.body ?? null;
}
