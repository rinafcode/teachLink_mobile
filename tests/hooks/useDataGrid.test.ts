import { act, renderHook } from '@testing-library/react-native';

import { useDataGrid } from '../../src/hooks/useDataGrid';
import { ColumnDef, GridRow } from '../../src/utils/gridUtils';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

interface Product extends GridRow {
  id: number;
  name: string;
  price: number;
  category: string;
}

const products: Product[] = [
  { id: 1, name: 'Apple', price: 0.99, category: 'fruit' },
  { id: 2, name: 'Banana', price: 0.5, category: 'fruit' },
  { id: 3, name: 'Carrot', price: 1.2, category: 'vegetable' },
  { id: 4, name: 'Daikon', price: 2.0, category: 'vegetable' },
  { id: 5, name: 'Elderberry', price: 4.5, category: 'fruit' },
];

const columns: ColumnDef<Product>[] = [
  { key: 'id', title: 'ID', type: 'number', sortable: true },
  { key: 'name', title: 'Name', type: 'string', sortable: true, filterable: true, editable: true },
  {
    key: 'price',
    title: 'Price',
    type: 'number',
    sortable: true,
    filterable: true,
    editable: true,
  },
  { key: 'category', title: 'Category', type: 'string', sortable: true, filterable: true },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setup(overrides = {}) {
  return renderHook(() => useDataGrid(products, columns, { defaultPageSize: 10, ...overrides }));
}

// ─── Initial state ────────────────────────────────────────────────────────────

describe('useDataGrid — initial state', () => {
  it('returns all rows on the first page', () => {
    const { result } = setup();
    expect(result.current.paginatedRows).toHaveLength(products.length);
  });

  it('starts with no sort config', () => {
    const { result } = setup();
    expect(result.current.sortConfig).toBeNull();
  });

  it('starts with no active filters', () => {
    const { result } = setup();
    expect(result.current.filters).toHaveLength(0);
  });

  it('starts with page 1', () => {
    const { result } = setup();
    expect(result.current.page).toBe(1);
  });

  it('respects defaultSortKey option', () => {
    const { result } = renderHook(() =>
      useDataGrid(products, columns, { defaultSortKey: 'price', defaultSortDirection: 'desc' })
    );
    expect(result.current.sortConfig).toEqual({ columnKey: 'price', direction: 'desc' });
  });
});

// ─── Sorting ──────────────────────────────────────────────────────────────────

describe('useDataGrid — sorting', () => {
  it('sorts ascending on first call', () => {
    const { result } = setup();
    act(() => result.current.sort('name'));
    expect(result.current.sortConfig).toEqual({ columnKey: 'name', direction: 'asc' });
    expect(result.current.paginatedRows[0].name).toBe('Apple');
  });

  it('toggles to descending on second call to the same column', () => {
    const { result } = setup();
    act(() => result.current.sort('name'));
    act(() => result.current.sort('name'));
    expect(result.current.sortConfig?.direction).toBe('desc');
    expect(result.current.paginatedRows[0].name).toBe('Elderberry');
  });

  it('clears sort on third call to the same column', () => {
    const { result } = setup();
    act(() => result.current.sort('name'));
    act(() => result.current.sort('name'));
    act(() => result.current.sort('name'));
    expect(result.current.sortConfig).toBeNull();
  });

  it('resets to new column sort on a different column', () => {
    const { result } = setup();
    act(() => result.current.sort('name'));
    act(() => result.current.sort('price'));
    expect(result.current.sortConfig).toEqual({ columnKey: 'price', direction: 'asc' });
  });

  it('clearSort removes active sort', () => {
    const { result } = setup();
    act(() => result.current.sort('name'));
    act(() => result.current.clearSort());
    expect(result.current.sortConfig).toBeNull();
  });
});

// ─── Filtering ────────────────────────────────────────────────────────────────

describe('useDataGrid — filtering', () => {
  it('filters rows by a text value', () => {
    const { result } = setup();
    act(() => result.current.setFilter('category', 'fruit'));
    const names = result.current.paginatedRows.map((r) => r.name);
    expect(names).toEqual(expect.arrayContaining(['Apple', 'Banana', 'Elderberry']));
    expect(names).not.toContain('Carrot');
  });

  it('resets to page 1 when a filter is applied', () => {
    const { result } = setup({ defaultPageSize: 2 });
    act(() => result.current.goToPage(2));
    act(() => result.current.setFilter('category', 'fruit'));
    expect(result.current.page).toBe(1);
  });

  it('removes a filter with clearFilter', () => {
    const { result } = setup();
    act(() => result.current.setFilter('category', 'fruit'));
    act(() => result.current.clearFilter('category'));
    expect(result.current.paginatedRows).toHaveLength(products.length);
    expect(result.current.filters).toHaveLength(0);
  });

  it('clears all filters with clearAllFilters', () => {
    const { result } = setup();
    act(() => result.current.setFilter('category', 'fruit'));
    act(() => result.current.setFilter('name', 'apple'));
    act(() => result.current.clearAllFilters());
    expect(result.current.filters).toHaveLength(0);
    expect(result.current.paginatedRows).toHaveLength(products.length);
  });

  it('updating an existing filter replaces the old entry', () => {
    const { result } = setup();
    act(() => result.current.setFilter('category', 'fruit'));
    act(() => result.current.setFilter('category', 'vegetable'));
    expect(result.current.filters).toHaveLength(1);
    expect(result.current.filters[0].value).toBe('vegetable');
  });
});

// ─── Pagination ───────────────────────────────────────────────────────────────

describe('useDataGrid — pagination', () => {
  it('paginates to page 2', () => {
    const { result } = renderHook(() => useDataGrid(products, columns, { defaultPageSize: 2 }));
    act(() => result.current.goToPage(2));
    expect(result.current.page).toBe(2);
    expect(result.current.paginatedRows[0].name).toBe('Carrot');
  });

  it('exposes correct totalPages', () => {
    const { result } = renderHook(() => useDataGrid(products, columns, { defaultPageSize: 2 }));
    expect(result.current.pagination.totalPages).toBe(3);
  });

  it('setPageSize updates page size and resets to page 1', () => {
    const { result } = renderHook(() => useDataGrid(products, columns, { defaultPageSize: 2 }));
    act(() => result.current.goToPage(2));
    act(() => result.current.setPageSize(10));
    expect(result.current.pageSize).toBe(10);
    expect(result.current.page).toBe(1);
  });
});

// ─── Inline editing ───────────────────────────────────────────────────────────

describe('useDataGrid — inline editing', () => {
  it('starts editing a cell', () => {
    const { result } = setup();
    act(() => result.current.startEditing(1, 'name', 'Apple'));
    expect(result.current.editingCell).toEqual({ rowId: 1, columnKey: 'name', draft: 'Apple' });
    expect(result.current.editError).toBeNull();
  });

  it('does not start editing a non-editable column', () => {
    const { result } = setup();
    act(() => result.current.startEditing(1, 'category', 'fruit'));
    expect(result.current.editingCell).toBeNull();
  });

  it('updates draft value', () => {
    const { result } = setup();
    act(() => result.current.startEditing(1, 'name', 'Apple'));
    act(() => result.current.updateDraft('Apricot'));
    expect(result.current.editingCell?.draft).toBe('Apricot');
  });

  it('calls onRowUpdate on commit', () => {
    const onRowUpdate = jest.fn();
    const { result } = renderHook(() => useDataGrid(products, columns, { onRowUpdate }));
    act(() => result.current.startEditing(1, 'name', 'Apple'));
    act(() => result.current.updateDraft('Avocado'));
    act(() => result.current.commitEdit());
    expect(onRowUpdate).toHaveBeenCalledWith(1, 'name', 'Avocado');
  });

  it('clears editingCell after commit', () => {
    const { result } = setup();
    act(() => result.current.startEditing(1, 'name', 'Apple'));
    act(() => result.current.commitEdit());
    expect(result.current.editingCell).toBeNull();
  });

  it('sets editError on invalid numeric value', () => {
    const { result } = setup();
    act(() => result.current.startEditing(1, 'price', '0.99'));
    act(() => result.current.updateDraft('not-a-number'));
    act(() => result.current.commitEdit());
    expect(result.current.editError).toBe('Must be a valid number');
    expect(result.current.editingCell).not.toBeNull();
  });

  it('cancels editing without calling onRowUpdate', () => {
    const onRowUpdate = jest.fn();
    const { result } = renderHook(() => useDataGrid(products, columns, { onRowUpdate }));
    act(() => result.current.startEditing(1, 'name', 'Apple'));
    act(() => result.current.updateDraft('Avocado'));
    act(() => result.current.cancelEditing());
    expect(onRowUpdate).not.toHaveBeenCalled();
    expect(result.current.editingCell).toBeNull();
  });
});

// ─── Export ───────────────────────────────────────────────────────────────────

describe('useDataGrid — exportData', () => {
  it('exports CSV with a header row', () => {
    const { result } = setup();
    const csv = result.current.exportData('csv');
    expect(csv.split('\n')[0]).toBe('ID,Name,Price,Category');
  });

  it('exports valid JSON array', () => {
    const { result } = setup();
    const json = result.current.exportData('json');
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(products.length);
  });

  it('exports only filtered rows', () => {
    const { result } = setup();
    act(() => result.current.setFilter('category', 'vegetable'));
    const parsed = JSON.parse(result.current.exportData('json'));
    expect(parsed).toHaveLength(2);
    expect(parsed.every((r: Product) => r.category === 'vegetable')).toBe(true);
  });
});
