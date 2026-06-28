/**
 * Tests for #660 — Conflict store for offline-first conflict resolution
 */
import { useConflictStore, type ConflictData } from '../../store/conflictStore';

// Mock axios client
jest.mock('../../services/api/axios.config', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  appLogger: { errorSync: jest.fn(), warnSync: jest.fn(), infoSync: jest.fn() },
}));

const createMockConflict = (overrides?: Partial<ConflictData>): ConflictData => ({
  id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  entityId: 'note-123',
  entityType: 'note',
  localData: { title: 'Local Title', content: 'Local content' },
  serverData: { title: 'Server Title', content: 'Server content' },
  localVersion: 1,
  serverVersion: 2,
  clientTimestamp: Date.now() - 5000,
  serverTimestamp: Date.now(),
  endpoint: '/api/notes/123',
  method: 'PUT',
  detectedAt: Date.now(),
  ...overrides,
});

describe('conflictStore — offline-first conflict resolution (#660)', () => {
  beforeEach(() => {
    // Reset store to initial state
    useConflictStore.setState({
      conflicts: [],
      activeConflict: null,
      isModalVisible: false,
      resolutionHistory: [],
      isResolving: false,
    });
    jest.clearAllMocks();
  });

  describe('addConflict', () => {
    it('adds a new conflict to the queue', () => {
      const conflict = createMockConflict();

      useConflictStore.getState().addConflict(conflict);

      const state = useConflictStore.getState();
      expect(state.conflicts).toHaveLength(1);
      expect(state.conflicts[0]).toEqual(conflict);
    });

    it('auto-shows modal for first conflict when no modal is visible', () => {
      const conflict = createMockConflict();

      useConflictStore.getState().addConflict(conflict);

      const state = useConflictStore.getState();
      expect(state.isModalVisible).toBe(true);
      expect(state.activeConflict).toEqual(conflict);
    });

    it('replaces existing conflict for same entity', () => {
      const conflict1 = createMockConflict({ id: 'conflict-1' });
      const conflict2 = createMockConflict({
        id: 'conflict-2',
        localData: { title: 'Updated Local' },
      });

      useConflictStore.getState().addConflict(conflict1);
      useConflictStore.getState().addConflict(conflict2);

      const state = useConflictStore.getState();
      expect(state.conflicts).toHaveLength(1);
      expect(state.conflicts[0].id).toBe('conflict-2');
      expect((state.conflicts[0].localData as any).title).toBe('Updated Local');
    });

    it('queues multiple conflicts for different entities', () => {
      const conflict1 = createMockConflict({ entityId: 'note-1' });
      const conflict2 = createMockConflict({ entityId: 'note-2' });

      useConflictStore.getState().addConflict(conflict1);
      useConflictStore.getState().addConflict(conflict2);

      const state = useConflictStore.getState();
      expect(state.conflicts).toHaveLength(2);
    });
  });

  describe('removeConflict', () => {
    it('removes a conflict by id', () => {
      const conflict = createMockConflict({ id: 'to-remove' });
      useConflictStore.setState({ conflicts: [conflict] });

      useConflictStore.getState().removeConflict('to-remove');

      expect(useConflictStore.getState().conflicts).toHaveLength(0);
    });

    it('clears activeConflict if it matches the removed conflict', () => {
      const conflict = createMockConflict({ id: 'active-conflict' });
      useConflictStore.setState({
        conflicts: [conflict],
        activeConflict: conflict,
        isModalVisible: true,
      });

      useConflictStore.getState().removeConflict('active-conflict');

      const state = useConflictStore.getState();
      expect(state.conflicts).toHaveLength(0);
      expect(state.activeConflict).toBeNull();
    });

    it('does not affect other conflicts', () => {
      const conflict1 = createMockConflict({ id: 'keep', entityId: 'note-1' });
      const conflict2 = createMockConflict({ id: 'remove', entityId: 'note-2' });
      useConflictStore.setState({ conflicts: [conflict1, conflict2] });

      useConflictStore.getState().removeConflict('remove');

      const state = useConflictStore.getState();
      expect(state.conflicts).toHaveLength(1);
      expect(state.conflicts[0].id).toBe('keep');
    });
  });

  describe('clearAllConflicts', () => {
    it('clears all conflicts and hides modal', () => {
      const conflicts = [
        createMockConflict({ entityId: 'note-1' }),
        createMockConflict({ entityId: 'note-2' }),
      ];
      useConflictStore.setState({
        conflicts,
        activeConflict: conflicts[0],
        isModalVisible: true,
      });

      useConflictStore.getState().clearAllConflicts();

      const state = useConflictStore.getState();
      expect(state.conflicts).toHaveLength(0);
      expect(state.activeConflict).toBeNull();
      expect(state.isModalVisible).toBe(false);
    });
  });

  describe('showModal / hideModal', () => {
    it('showModal displays the first conflict if none specified', () => {
      const conflict = createMockConflict();
      useConflictStore.setState({ conflicts: [conflict] });

      useConflictStore.getState().showModal();

      const state = useConflictStore.getState();
      expect(state.isModalVisible).toBe(true);
      expect(state.activeConflict).toEqual(conflict);
    });

    it('showModal displays a specific conflict when provided', () => {
      const conflict1 = createMockConflict({ id: 'c1', entityId: 'note-1' });
      const conflict2 = createMockConflict({ id: 'c2', entityId: 'note-2' });
      useConflictStore.setState({ conflicts: [conflict1, conflict2] });

      useConflictStore.getState().showModal(conflict2);

      const state = useConflictStore.getState();
      expect(state.activeConflict?.id).toBe('c2');
    });

    it('hideModal sets isModalVisible to false', () => {
      useConflictStore.setState({ isModalVisible: true });

      useConflictStore.getState().hideModal();

      expect(useConflictStore.getState().isModalVisible).toBe(false);
    });
  });

  describe('resolveConflict', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const apiClient = require('../../services/api/axios.config').default;

    beforeEach(() => {
      apiClient.mockReset();
      apiClient.mockResolvedValue({ data: {} });
    });

    it('resolves with local choice and sends data to server', async () => {
      const conflict = createMockConflict({ id: 'resolve-local' });
      useConflictStore.setState({
        conflicts: [conflict],
        activeConflict: conflict,
        isModalVisible: true,
      });

      await useConflictStore.getState().resolveConflict('resolve-local', 'local');

      expect(apiClient).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'put',
          url: '/api/notes/123',
          data: conflict.localData,
          headers: expect.objectContaining({
            'X-Force-Override': 'true',
            'X-Conflict-Resolution': 'local',
          }),
        })
      );

      const state = useConflictStore.getState();
      expect(state.conflicts).toHaveLength(0);
      expect(state.resolutionHistory).toHaveLength(1);
      expect(state.resolutionHistory[0].choice).toBe('local');
    });

    it('resolves with server choice without sending request', async () => {
      const conflict = createMockConflict({ id: 'resolve-server' });
      useConflictStore.setState({
        conflicts: [conflict],
        activeConflict: conflict,
        isModalVisible: true,
      });

      await useConflictStore.getState().resolveConflict('resolve-server', 'server');

      // Server choice should NOT call the API (just accept server data)
      expect(apiClient).not.toHaveBeenCalled();

      const state = useConflictStore.getState();
      expect(state.conflicts).toHaveLength(0);
      expect(state.resolutionHistory[0].choice).toBe('server');
    });

    it('resolves with merge choice using provided merged data', async () => {
      const conflict = createMockConflict({ id: 'resolve-merge' });
      const mergedData = { title: 'Merged Title', content: 'Merged content' };
      useConflictStore.setState({
        conflicts: [conflict],
        activeConflict: conflict,
        isModalVisible: true,
      });

      await useConflictStore.getState().resolveConflict('resolve-merge', 'merge', mergedData);

      expect(apiClient).toHaveBeenCalledWith(
        expect.objectContaining({
          data: mergedData,
          headers: expect.objectContaining({
            'X-Conflict-Resolution': 'merge',
          }),
        })
      );

      const state = useConflictStore.getState();
      expect(state.resolutionHistory[0].resolvedData).toEqual(mergedData);
    });

    it('shows next conflict after resolution', async () => {
      const conflict1 = createMockConflict({ id: 'c1', entityId: 'note-1' });
      const conflict2 = createMockConflict({ id: 'c2', entityId: 'note-2' });
      useConflictStore.setState({
        conflicts: [conflict1, conflict2],
        activeConflict: conflict1,
        isModalVisible: true,
      });

      await useConflictStore.getState().resolveConflict('c1', 'server');

      const state = useConflictStore.getState();
      expect(state.conflicts).toHaveLength(1);
      expect(state.activeConflict?.id).toBe('c2');
      expect(state.isModalVisible).toBe(true);
    });

    it('hides modal when all conflicts are resolved', async () => {
      const conflict = createMockConflict({ id: 'last-conflict' });
      useConflictStore.setState({
        conflicts: [conflict],
        activeConflict: conflict,
        isModalVisible: true,
      });

      await useConflictStore.getState().resolveConflict('last-conflict', 'server');

      const state = useConflictStore.getState();
      expect(state.conflicts).toHaveLength(0);
      expect(state.activeConflict).toBeNull();
      expect(state.isModalVisible).toBe(false);
    });

    it('sets isResolving during resolution', async () => {
      const conflict = createMockConflict();
      useConflictStore.setState({ conflicts: [conflict] });

      // Create a promise we can control
      let resolveApiCall: () => void;
      const apiPromise = new Promise<void>(resolve => {
        resolveApiCall = resolve;
      });
      apiClient.mockReturnValue(apiPromise);

      const resolvePromise = useConflictStore.getState().resolveConflict(conflict.id, 'local');

      // Should be resolving
      expect(useConflictStore.getState().isResolving).toBe(true);

      // Complete the API call
      resolveApiCall!();
      await resolvePromise;

      // Should no longer be resolving
      expect(useConflictStore.getState().isResolving).toBe(false);
    });

    it('handles API errors gracefully', async () => {
      const conflict = createMockConflict();
      useConflictStore.setState({
        conflicts: [conflict],
        activeConflict: conflict,
        isModalVisible: true,
      });
      apiClient.mockRejectedValue(new Error('Network error'));

      await expect(
        useConflictStore.getState().resolveConflict(conflict.id, 'local')
      ).rejects.toThrow('Network error');

      // Should reset isResolving even on error
      expect(useConflictStore.getState().isResolving).toBe(false);
      // Conflict should still be in the queue
      expect(useConflictStore.getState().conflicts).toHaveLength(1);
    });

    it('logs warning for non-existent conflict', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const logger = require('../../utils/logger').logger;

      await useConflictStore.getState().resolveConflict('non-existent', 'local');

      expect(logger.warn).toHaveBeenCalledWith('Conflict not found: non-existent');
    });
  });

  describe('getConflictById', () => {
    it('returns the conflict with matching id', () => {
      const conflict = createMockConflict({ id: 'find-me' });
      useConflictStore.setState({ conflicts: [conflict] });

      const found = useConflictStore.getState().getConflictById('find-me');

      expect(found).toEqual(conflict);
    });

    it('returns undefined for non-existent id', () => {
      const found = useConflictStore.getState().getConflictById('not-found');

      expect(found).toBeUndefined();
    });
  });

  describe('getPendingCount', () => {
    it('returns the number of pending conflicts', () => {
      const conflicts = [
        createMockConflict({ entityId: 'note-1' }),
        createMockConflict({ entityId: 'note-2' }),
        createMockConflict({ entityId: 'note-3' }),
      ];
      useConflictStore.setState({ conflicts });

      expect(useConflictStore.getState().getPendingCount()).toBe(3);
    });

    it('returns 0 when no conflicts', () => {
      expect(useConflictStore.getState().getPendingCount()).toBe(0);
    });
  });

  describe('resolutionHistory', () => {
    it('keeps last 50 resolutions', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const apiClient = require('../../services/api/axios.config').default;
      apiClient.mockResolvedValue({ data: {} });

      // Add 55 conflicts and resolve them
      for (let i = 0; i < 55; i++) {
        const conflict = createMockConflict({ id: `c-${i}`, entityId: `note-${i}` });
        useConflictStore.setState({
          conflicts: [conflict],
          activeConflict: conflict,
        });
        await useConflictStore.getState().resolveConflict(`c-${i}`, 'server');
      }

      const history = useConflictStore.getState().resolutionHistory;
      expect(history.length).toBeLessThanOrEqual(50);
    });
  });
});
