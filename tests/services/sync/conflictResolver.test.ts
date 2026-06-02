import {
  applyLocalMutation,
  buildConflict,
  createVersionedEntity,
  detectConflict,
  processServerUpdate,
  resolveConflict,
} from '../../../src/services/sync/conflictResolver';
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
});
