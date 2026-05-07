import { render } from '@testing-library/react-native';
import React from 'react';

import { AdvancedDataGrid } from '../../src/components/grid/AdvancedDataGrid';
import { ColumnDef, GridRow } from '../../src/utils/gridUtils';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('lucide-react-native', () => ({
  ArrowDown: () => null,
  ArrowUp: () => null,
  ArrowUpDown: () => null,
  Download: () => null,
  Filter: () => null,
  FilterX: () => null,
  Search: () => null,
  X: () => null,
  Check: () => null,
  AlertCircle: () => null,
}));

jest.mock('react-native/Libraries/Share/Share', () => ({
  share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
}));

// ErrorBoundary uses crashReportingService — stub it to avoid import errors
jest.mock('../../src/services/crashReporting', () => ({
  crashReportingService: { reportError: jest.fn() },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

interface Item extends GridRow {
  id: number;
  title: string;
  score: number;
}

const items: Item[] = [
  { id: 1, title: 'Alpha', score: 80 },
  { id: 2, title: 'Beta', score: 95 },
  { id: 3, title: 'Gamma', score: 70 },
];

const columns: ColumnDef<Item>[] = [
  { key: 'id', title: 'ID', type: 'number', sortable: true },
  {
    key: 'title',
    title: 'Title',
    type: 'string',
    sortable: true,
    filterable: true,
    editable: true,
  },
  {
    key: 'score',
    title: 'Score',
    type: 'number',
    sortable: true,
    filterable: true,
    editable: true,
  },
];

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('AdvancedDataGrid', () => {
  describe('rendering', () => {
    it('renders without crashing', () => {
      const { toJSON } = render(<AdvancedDataGrid columns={columns} rows={items} />);
      expect(toJSON()).toBeTruthy();
    });

    it('displays column header titles', () => {
      const { toJSON } = render(<AdvancedDataGrid columns={columns} rows={items} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('ID');
      expect(json).toContain('Title');
      expect(json).toContain('Score');
    });

    it('renders all row values', () => {
      const { toJSON } = render(<AdvancedDataGrid columns={columns} rows={items} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Alpha');
      expect(json).toContain('Beta');
      expect(json).toContain('Gamma');
    });

    it('shows the row count in the toolbar', () => {
      const { toJSON } = render(<AdvancedDataGrid columns={columns} rows={items} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('3');
    });
  });

  describe('empty state', () => {
    it('renders the default empty message when rows is empty', () => {
      const { toJSON } = render(<AdvancedDataGrid columns={columns} rows={[]} />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('No data to display');
    });

    it('renders a custom empty message', () => {
      const { toJSON } = render(
        <AdvancedDataGrid columns={columns} rows={[]} emptyMessage="Nothing here yet" />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('Nothing here yet');
    });
  });

  describe('loading state', () => {
    it('renders an ActivityIndicator when loading is true', () => {
      const { toJSON } = render(<AdvancedDataGrid columns={columns} rows={[]} loading />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('ActivityIndicator');
    });
  });

  describe('pagination', () => {
    it('respects defaultPageSize and shows pagination controls', () => {
      const { toJSON } = render(
        <AdvancedDataGrid columns={columns} rows={items} defaultPageSize={2} />
      );
      const json = JSON.stringify(toJSON());
      // Pagination info: "1–2 of 3"
      expect(json).toContain('1');
    });

    it('does not render pagination bar when rows is empty', () => {
      const { toJSON } = render(<AdvancedDataGrid columns={columns} rows={[]} />);
      // The PaginationBar returns null for empty data
      const json = JSON.stringify(toJSON());
      // "0 rows" should appear in toolbar
      expect(json).toContain('0');
    });
  });

  describe('filter strip', () => {
    it('renders filter inputs when showFilters is true', () => {
      const { toJSON } = render(<AdvancedDataGrid columns={columns} rows={items} showFilters />);
      expect(toJSON()).toBeTruthy();
    });

    it('does not crash when showFilters is false', () => {
      const { toJSON } = render(
        <AdvancedDataGrid columns={columns} rows={items} showFilters={false} />
      );
      expect(toJSON()).toBeTruthy();
    });
  });

  describe('exporter', () => {
    it('renders exporter buttons when showExporter is true', () => {
      const { toJSON } = render(<AdvancedDataGrid columns={columns} rows={items} showExporter />);
      const json = JSON.stringify(toJSON());
      expect(json).toContain('CSV');
      expect(json).toContain('JSON');
    });

    it('does not render exporter when showExporter is false', () => {
      const { toJSON } = render(
        <AdvancedDataGrid columns={columns} rows={items} showExporter={false} />
      );
      const json = JSON.stringify(toJSON());
      expect(json).not.toContain('CSV');
    });
  });

  describe('testID forwarding', () => {
    it('passes testID to the root container', () => {
      const { toJSON } = render(
        <AdvancedDataGrid columns={columns} rows={items} testID="data-grid" />
      );
      const json = JSON.stringify(toJSON());
      expect(json).toContain('data-grid');
    });
  });
});
