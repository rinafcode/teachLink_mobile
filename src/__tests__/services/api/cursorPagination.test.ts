import {
    buildCursor,
    CursorPageRequest,
    paginateWithCursor,
    parseCursor,
} from '@/services/api/cursorPagination';

describe('cursorPagination', () => {
  it('encodes and decodes cursor values cleanly', () => {
    const cursor = buildCursor('course-123', 'id', 'asc');
    const payload = parseCursor(cursor);

    expect(typeof cursor).toBe('string');
    expect(payload).toEqual({ lastId: 'course-123', orderBy: 'id', direction: 'asc' });
  });

  it('paginates a large dataset consistently and without duplicates', () => {
    const items = Array.from({ length: 100 }, (_, index) => ({
      id: `course-${String(index + 1).padStart(3, '0')}`,
      title: `Course ${index + 1}`,
    }));

    let cursor: string | undefined;
    const seen = new Set<string>();
    const results: string[] = [];

    for (let page = 0; page < 10; page += 1) {
      const request: CursorPageRequest = {
        limit: 10,
        cursor,
        orderBy: 'id',
        direction: 'asc',
      };

      const response = paginateWithCursor(items, request);
      response.items.forEach((item) => {
        expect(seen.has(item.id)).toBe(false);
        seen.add(item.id);
        results.push(item.id);
      });

      if (!response.hasMore) {
        break;
      }

      expect(response.nextCursor).not.toBeNull();
      cursor = response.nextCursor ?? undefined;
    }

    expect(results).toHaveLength(100);
    expect(results[0]).toBe('course-001');
    expect(results[results.length - 1]).toBe('course-100');
  });

  it('supports descending ordering and stable cursor continuation', () => {
    const items = Array.from({ length: 30 }, (_, index) => ({
      id: `course-${String(index + 1).padStart(3, '0')}`,
      title: `Course ${index + 1}`,
    }));

    const firstPage = paginateWithCursor(items, { limit: 5, direction: 'desc' });

    expect(firstPage.items[0].id).toBe('course-030');
    expect(firstPage.hasMore).toBe(true);
    expect(firstPage.nextCursor).toBeTruthy();

    const secondPage = paginateWithCursor(items, {
      limit: 5,
      direction: 'desc',
      cursor: firstPage.nextCursor ?? undefined,
    });

    expect(secondPage.items[0].id).toBe('course-025');
    expect(secondPage.items).toHaveLength(5);
    expect(secondPage.hasMore).toBe(true);
  });
});
