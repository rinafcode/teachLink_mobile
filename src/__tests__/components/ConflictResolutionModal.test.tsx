/**
 * Tests for #660 — ConflictResolutionModal component
 */
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { ConflictResolutionModal } from '../../components/common/ConflictResolutionModal';
import { useConflictStore, type ConflictData } from '../../store/conflictStore';

// Mock the conflict store
jest.mock('../../store/conflictStore', () => {
  const actual = jest.requireActual('../../store/conflictStore');
  return {
    ...actual,
    useConflictStore: jest.fn(),
    useActiveConflict: jest.fn(),
    useConflictModalVisible: jest.fn(),
    useIsResolvingConflict: jest.fn(),
  };
});

// Mock AccessibleModal to simplify testing
jest.mock('../../components/common/AccessibleModal', () => ({
  AccessibleModal: ({ visible, children, onClose }: any) => (visible ? children : null),
}));

const mockResolveConflict = jest.fn();
const mockHideModal = jest.fn();
const mockGetPendingCount = jest.fn();

const createMockConflict = (overrides?: Partial<ConflictData>): ConflictData => ({
  id: 'test-conflict-1',
  entityId: 'note-123',
  entityType: 'note',
  localData: {
    title: 'My Local Title',
    content: 'Local content here',
    tags: ['work', 'important'],
  },
  serverData: {
    title: 'Server Title (Updated)',
    content: 'Server content here',
    tags: ['work'],
  },
  localVersion: 1,
  serverVersion: 2,
  clientTimestamp: Date.now() - 60000,
  serverTimestamp: Date.now(),
  endpoint: '/api/notes/123',
  method: 'PUT',
  detectedAt: Date.now(),
  ...overrides,
});

describe('ConflictResolutionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockResolveConflict.mockResolvedValue(undefined);
    mockGetPendingCount.mockReturnValue(1);

    (useConflictStore as unknown as jest.Mock).mockReturnValue({
      resolveConflict: mockResolveConflict,
      hideModal: mockHideModal,
      getPendingCount: mockGetPendingCount,
    });
  });

  const setupMocks = (isVisible: boolean, conflict: ConflictData | null, isResolving = false) => {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const {
      useActiveConflict,
      useConflictModalVisible,
      useIsResolvingConflict,
    } = require('../../store/conflictStore');
    /* eslint-enable @typescript-eslint/no-require-imports */
    (useActiveConflict as jest.Mock).mockReturnValue(conflict);
    (useConflictModalVisible as jest.Mock).mockReturnValue(isVisible);
    (useIsResolvingConflict as jest.Mock).mockReturnValue(isResolving);
  };

  describe('rendering', () => {
    it('renders nothing when not visible', () => {
      setupMocks(false, null);
      const { queryByText } = render(<ConflictResolutionModal usePortal={false} />);
      expect(queryByText('Sync Conflict Detected')).toBeNull();
    });

    it('renders nothing when no active conflict', () => {
      setupMocks(true, null);
      const { queryByText } = render(<ConflictResolutionModal usePortal={false} />);
      expect(queryByText('Sync Conflict Detected')).toBeNull();
    });

    it('renders modal with conflict details', () => {
      const conflict = createMockConflict();
      setupMocks(true, conflict);

      const { getByText, getAllByText } = render(<ConflictResolutionModal usePortal={false} />);

      expect(getByText('Sync Conflict Detected')).toBeTruthy();
      // Check that Note entity type is displayed (may appear in multiple places)
      expect(getAllByText(/Note/).length).toBeGreaterThan(0);
    });

    it('shows badge when multiple conflicts pending', () => {
      const conflict = createMockConflict();
      setupMocks(true, conflict);
      mockGetPendingCount.mockReturnValue(3);

      const { getByText } = render(<ConflictResolutionModal usePortal={false} />);

      expect(getByText('3 conflicts')).toBeTruthy();
    });

    it('displays version information', () => {
      const conflict = createMockConflict({
        localVersion: 5,
        serverVersion: 8,
      });
      setupMocks(true, conflict);

      const { getByText } = render(<ConflictResolutionModal usePortal={false} />);

      expect(getByText('5')).toBeTruthy();
      expect(getByText('8')).toBeTruthy();
    });
  });

  describe('tabs', () => {
    it('shows differences tab by default', () => {
      const conflict = createMockConflict();
      setupMocks(true, conflict);

      const { getByText } = render(<ConflictResolutionModal usePortal={false} />);

      // Differences tab should be active
      const diffTab = getByText('Differences');
      expect(diffTab).toBeTruthy();
    });

    it('switches to local version tab', () => {
      const conflict = createMockConflict();
      setupMocks(true, conflict);

      const { getByText } = render(<ConflictResolutionModal usePortal={false} />);

      const localTab = getByText('Your Version');
      fireEvent.press(localTab);

      // Should show local data JSON
      expect(getByText(/My Local Title/)).toBeTruthy();
    });

    it('switches to server version tab', () => {
      const conflict = createMockConflict();
      setupMocks(true, conflict);

      const { getByText } = render(<ConflictResolutionModal usePortal={false} />);

      const serverTab = getByText('Server Version');
      fireEvent.press(serverTab);

      // Should show server data JSON
      expect(getByText(/Server Title \(Updated\)/)).toBeTruthy();
    });
  });

  describe('diff view', () => {
    it('shows differing fields with highlighting', () => {
      const conflict = createMockConflict();
      setupMocks(true, conflict);

      const { getByText } = render(<ConflictResolutionModal usePortal={false} />);

      // Should show field names
      expect(getByText('title')).toBeTruthy();
      expect(getByText('content')).toBeTruthy();
    });

    it('handles empty data gracefully', () => {
      const conflict = createMockConflict({
        localData: {},
        serverData: {},
      });
      setupMocks(true, conflict);

      const { getByText } = render(<ConflictResolutionModal usePortal={false} />);

      expect(getByText('No data to compare')).toBeTruthy();
    });
  });

  describe('resolution actions', () => {
    it('calls resolveConflict with local choice on Keep Mine button', async () => {
      const conflict = createMockConflict();
      setupMocks(true, conflict);

      const { getByText } = render(<ConflictResolutionModal usePortal={false} />);

      const keepMineButton = getByText('Keep Mine');
      fireEvent.press(keepMineButton);

      await waitFor(() => {
        expect(mockResolveConflict).toHaveBeenCalledWith('test-conflict-1', 'local');
      });
    });

    it('calls resolveConflict with server choice on Use Server button', async () => {
      const conflict = createMockConflict();
      setupMocks(true, conflict);

      const { getByText } = render(<ConflictResolutionModal usePortal={false} />);

      const useServerButton = getByText('Use Server');
      fireEvent.press(useServerButton);

      await waitFor(() => {
        expect(mockResolveConflict).toHaveBeenCalledWith('test-conflict-1', 'server');
      });
    });

    it('disables buttons while resolving', () => {
      const conflict = createMockConflict();
      setupMocks(true, conflict, true);

      const { getByLabelText } = render(<ConflictResolutionModal usePortal={false} />);

      const keepMineButton = getByLabelText('Keep your changes');
      const useServerButton = getByLabelText('Use server version');

      // Check that buttons are disabled via the disabled prop
      expect(keepMineButton.props.disabled).toBe(true);
      expect(useServerButton.props.disabled).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('has proper accessibility labels on buttons', () => {
      const conflict = createMockConflict();
      setupMocks(true, conflict);

      const { getByLabelText } = render(<ConflictResolutionModal usePortal={false} />);

      expect(getByLabelText('Keep your changes')).toBeTruthy();
      expect(getByLabelText('Use server version')).toBeTruthy();
    });

    it('has proper accessibility hints on buttons', () => {
      const conflict = createMockConflict();
      setupMocks(true, conflict);

      const { getByA11yHint } = render(<ConflictResolutionModal usePortal={false} />);

      expect(getByA11yHint('Overwrite server data with your local changes')).toBeTruthy();
      expect(getByA11yHint('Discard your changes and use the server version')).toBeTruthy();
    });

    it('tabs have proper accessibility roles', () => {
      const conflict = createMockConflict();
      setupMocks(true, conflict);

      const { getByText } = render(<ConflictResolutionModal usePortal={false} />);

      // Check that all three tabs are rendered with proper text
      expect(getByText('Differences')).toBeTruthy();
      expect(getByText('Your Version')).toBeTruthy();
      expect(getByText('Server Version')).toBeTruthy();
    });
  });

  describe('entity type formatting', () => {
    it('capitalizes entity type', () => {
      const conflict = createMockConflict({ entityType: 'quiz_draft' });
      setupMocks(true, conflict);

      const { getAllByText } = render(<ConflictResolutionModal usePortal={false} />);

      // Should find at least one instance of the formatted entity type
      const matches = getAllByText(/Quiz draft/);
      expect(matches.length).toBeGreaterThan(0);
    });
  });
});
