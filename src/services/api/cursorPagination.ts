export type CursorDirection = 'asc' | 'desc';

export interface CursorPageRequest {
  limit?: number;
  cursor?: string;
  orderBy?: string;
  direction?: CursorDirection;
}

export interface CursorPageResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

interface CursorPayload {
  lastId: string;
  orderBy: string;
  direction: CursorDirection;
}

const DEFAULT_LIMIT = 20;
const DEFAULT_ORDER_BY = 'id';
const DEFAULT_DIRECTION: CursorDirection = 'asc';

function encodeCursorPayload(payload: CursorPayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

function decodeCursorPayload(cursor?: string): CursorPayload | null {
  if (!cursor) {
    return null;
  }

  try {
    return JSON.parse(decodeURIComponent(cursor)) as CursorPayload;
  } catch {
    return null;
  }
}

/**
 * Build an opaque cursor for a paginated item boundary.
 * The cursor is a URL-safe encoded JSON payload.
 */
export function buildCursor(lastId: string, orderBy = DEFAULT_ORDER_BY, direction: CursorDirection = DEFAULT_DIRECTION): string {
  return encodeCursorPayload({ lastId, orderBy, direction });
}

/**
 * Parse a cursor returned by the API.
 * Returns null for invalid or missing values.
 */
export function parseCursor(cursor?: string): CursorPayload | null {
  return decodeCursorPayload(cursor);
}

/**
 * Create a cache key for paginated list requests.
 */
export function buildCursorCacheKey(request: CursorPageRequest): string {
  const { limit = DEFAULT_LIMIT, cursor = '', orderBy = DEFAULT_ORDER_BY, direction = DEFAULT_DIRECTION } = request;
  return `cursor-page:${limit}:${cursor || 'start'}:${orderBy}:${direction}`;
}

/**
 * Pure helper for cursor-based pagination on an in-memory list.
 * This is useful for tests, local fallbacks, and backend integration.
 */
export function paginateWithCursor<T extends { id: string }>(
  items: T[],
  request: CursorPageRequest = {},
): CursorPageResponse<T> {
  const limit = Math.max(1, request.limit ?? DEFAULT_LIMIT);
  const orderBy = request.orderBy ?? DEFAULT_ORDER_BY;
  const direction = request.direction ?? DEFAULT_DIRECTION;

  const cursorPayload = decodeCursorPayload(request.cursor);

  const normalized = [...items].sort((left, right) => {
    const leftValue = String((left as any)[orderBy] ?? left.id);
    const rightValue = String((right as any)[orderBy] ?? right.id);

    if (leftValue === rightValue) {
      return left.id.localeCompare(right.id);
    }

    return leftValue.localeCompare(rightValue);
  });

  if (direction === 'desc') {
    normalized.reverse();
  }

  const startIndex = cursorPayload && cursorPayload.orderBy === orderBy && cursorPayload.direction === direction
    ? normalized.findIndex((item) => item.id === cursorPayload.lastId) + 1
    : 0;

  const paginated = normalized.slice(Math.max(0, startIndex), Math.max(0, startIndex) + limit);
  const lastItem = paginated[paginated.length - 1];
  const hasMore = (Math.max(0, startIndex) + paginated.length) < normalized.length;
  const nextCursor = hasMore && lastItem
    ? buildCursor(lastItem.id, orderBy, direction)
    : null;

  return {
    items: paginated,
    nextCursor,
    hasMore,
  };
}
