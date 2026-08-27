import {
  applyLocalMutation,
  buildConflict,
  createVersionedEntity,
  detectConflict,
  processServerUpdate,
  resolveConflict,
} from '../../../src/services/sync/conflictResolver';
import {
  isConflictError,
  isConflictResponseShape,
  buildConflictDataFromHttpError,
  extractConflictPayload,
} from '../../../src/services/sync/httpConflictDetection';
import syncEntityManager from '../../../src/services/sync/syncEntityManager';

describe('sync conflict resolution', () => {
  beforeEach(() => {
    syncEntityManager.clear();
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('tracks versions and detects simultaneous edit conflicts', () => {
    const base = createVersionedEntity(
      'course-1',
      'course',
      { title: 'Intro', summary: 'Base' },
      'client-a',
      1,
    );
    const local = applyLocalMutation(base, { title: 'Client title' });
    const server = {
      ...base,
      data: { title: 'Intro', summary: 'Server summary' },
      version: 2,
      clientId: 'server',
    };

    expect(local.clientSeq).toBe(1);
    expect(detectConflict(local, server)).toBe(true);
  });

  it('merges simultaneous edits without losing independent client changes', () => {
    const base = createVersionedEntity(
      'course-1',
      'course',
      {
        title: 'Intro',
        summary: 'Base',
        metadata: { level: 'beginner', duration: 10 },
      },
      'client-a',
      1,
    );
    const local = applyLocalMutation(base, {
      title: 'Client title',
      metadata: { level: 'intermediate', duration: 10 },
    });
    const server = {
      ...base,
      data: {
        title: 'Intro',
        summary: 'Server summary',
        metadata: { level: 'beginner', duration: 12 },
      },
      version: 2,
      clientId: 'server',
    };

    const result = resolveConflict(buildConflict(local, server, base), 'merge');

    expect(result.resolved.data).toEqual({
      title: 'Client title',
      summary: 'Server summary',
      metadata: { level: 'intermediate', duration: 12 },
    });
    expect(result.clientPreservedFields).toEqual(['title', 'metadata.level']);
    expect(result.serverOverriddenFields).toEqual([]);
    expect(result.resolved.version).toBe(2);
    expect(result.resolved.clientSeq).toBe(0);
  });

  it('uses server value when both sides edit the same field during merge', () => {
    const base = createVersionedEntity(
      'note-1',
      'note',
      { body: 'Original', tags: ['lesson'] },
      'client-a',
      4,
    );
    const local = applyLocalMutation(base, { body: 'Client edit' });
    const server = {
      ...base,
      data: { body: 'Server edit', tags: ['lesson'] },
      version: 5,
      clientId: 'server',
    };

    const result = resolveConflict(buildConflict(local, server, base), 'merge');

    expect(result.resolved.data.body).toBe('Server edit');
    expect(result.serverOverriddenFields).toEqual(['body']);
  });

  it('supports server-wins, client-wins, and last-write-wins strategies', () => {
    const local = createVersionedEntity('msg-1', 'message', { body: 'Local' }, 'client-a', 1);
    const server = createVersionedEntity('msg-1', 'message', { body: 'Server' }, 'server', 2);
    const conflict = buildConflict({ ...local, clientSeq: 1, timestamp: 200 }, { ...server, timestamp: 100 });

    expect(resolveConflict(conflict, 'server-wins').resolved.data.body).toBe('Server');
    expect(resolveConflict(conflict, 'client-wins').resolved.data.body).toBe('Local');
    expect(resolveConflict(conflict, 'last-write-wins').resolved.data.body).toBe('Local');
  });

  it('applies non-conflicting server updates and keeps the version store consistent', () => {
    const base = syncEntityManager.trackRawEntity(
      'course-2',
      'course',
      { title: 'Intro', summary: 'Base' },
      'client-a',
      1,
    );
    const server = {
      ...base,
      data: { title: 'Intro', summary: 'Server summary' },
      version: 2,
      clientId: 'server',
    };

    const result = processServerUpdate(syncEntityManager.getLocal('course', 'course-2'), server);
    syncEntityManager.handleServerEntity(server);

    expect(result.hadConflict).toBe(false);
    expect(syncEntityManager.getLocal('course', 'course-2')?.data).toEqual(server.data);
    expect(syncEntityManager.getBase('course', 'course-2')?.version).toBe(2);
  });

  it('uses the sync manager to resolve and persist a simultaneous edit', () => {
    const base = syncEntityManager.trackRawEntity(
      'course-3',
      'course',
      { title: 'Intro', summary: 'Base' },
      'client-a',
      1,
    );
    syncEntityManager.applyLocalPatch('course', 'course-3', { title: 'Client title' });

    const result = syncEntityManager.handleServerEntity(
      {
        ...base,
        data: { title: 'Intro', summary: 'Server summary' },
        version: 2,
        clientId: 'server',
      },
      'merge',
    );

    expect(result.hadConflict).toBe(true);
    expect(syncEntityManager.getLocal('course', 'course-3')?.data).toEqual({
      title: 'Client title',
      summary: 'Server summary',
    });
    expect(syncEntityManager.getLocal('course', 'course-3')?.clientSeq).toBe(0);
  });

  it('syncEntityManager.resolveRawConflict delegates to conflictResolver', () => {
    const result = syncEntityManager.resolveRawConflict(
      { body: 'Local' },
      { body: 'Server' },
      'server-wins',
    );

    expect(result.hadConflict).toBe(true);
    expect(result.resolved.data.body).toBe('Server');
  });
});

// ─── Unified HTTP conflict detection (httpConflictDetection.ts) ───────────────

describe('httpConflictDetection — unified conflict detection', () => {
  describe('isConflictError', () => {
    it('detects 409 via status property', () => {
      expect(isConflictError({ status: 409 })).toBe(true);
    });

    it('detects 409 via response.status', () => {
      expect(isConflictError({ response: { status: 409 } })).toBe(true);
    });

    it('detects 409 via code property', () => {
      expect(isConflictError({ code: 'CONFLICT' })).toBe(true);
    });

    it('returns false for non-409 errors', () => {
      expect(isConflictError({ status: 500 })).toBe(false);
      expect(isConflictError({ status: 404 })).toBe(false);
      expect(isConflictError(null)).toBe(false);
    });
  });

  describe('isConflictResponseShape', () => {
    it('accepts valid conflict response objects', () => {
      expect(isConflictResponseShape({ serverVersion: {} })).toBe(true);
      expect(isConflictResponseShape({ entityId: '1', entityType: 'note' })).toBe(true);
    });

    it('rejects null, undefined, and non-objects', () => {
      expect(isConflictResponseShape(null)).toBe(false);
      expect(isConflictResponseShape(undefined)).toBe(false);
      expect(isConflictResponseShape('string')).toBe(false);
      expect(isConflictResponseShape(42)).toBe(false);
    });
  });

  describe('buildConflictDataFromHttpError', () => {
    it('constructs a ConflictData record from a 409 response', () => {
      const conflictData = buildConflictDataFromHttpError({
        responseData: {
          entityId: 'note-1',
          entityType: 'note',
          serverVersion: { body: 'Server text' },
          serverVersionNumber: 5,
        },
        requestConfig: {
          data: { body: 'Local text' },
          url: '/api/notes/note-1',
          method: 'PUT',
          headers: {
            'X-Last-Known-Version': '4',
            'X-Entity-Type': 'note',
            'X-Entity-Id': 'note-1',
          },
        },
      });

      expect(conflictData.entityId).toBe('note-1');
      expect(conflictData.entityType).toBe('note');
      expect(conflictData.localData).toEqual({ body: 'Local text' });
      expect(conflictData.serverData).toEqual({ body: 'Server text' });
      expect(conflictData.localVersion).toBe(4);
      expect(conflictData.serverVersion).toBe(5);
      expect(conflictData.endpoint).toBe('/api/notes/note-1');
      expect(conflictData.method).toBe('PUT');
      expect(conflictData.id).toMatch(/^conflict_/);
    });

    it('falls back to defaults for missing response data', () => {
      const conflictData = buildConflictDataFromHttpError({
        responseData: undefined,
        requestConfig: {
          data: { body: 'Local' },
          url: '/api/items',
          method: 'POST',
          headers: {},
        },
      });

      expect(conflictData.entityType).toBe('unknown');
      expect(conflictData.entityId).toBe('');
      expect(conflictData.localVersion).toBeUndefined();
      expect(conflictData.serverVersion).toBeUndefined();
    });
  });

  describe('extractConflictPayload', () => {
    it('extracts payload from response.data', () => {
      expect(extractConflictPayload({ response: { data: 'payload' } })).toBe('payload');
    });

    it('falls back to error.data and error.body', () => {
      expect(extractConflictPayload({ data: 'fallback' })).toBe('fallback');
      expect(extractConflictPayload({ body: 'body-fallback' })).toBe('body-fallback');
    });

    it('returns null for errors without payload', () => {
      expect(extractConflictPayload({})).toBeNull();
      expect(extractConflictPayload(null)).toBeNull();
    });
  });
});
