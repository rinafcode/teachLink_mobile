import {
  ColumnDef,
  FilterEntry,
  GridRow,
  SortConfig,
  filterRows,
  paginateRows,
  serializeToCSV,
  serializeToJSON,
  sortRows,
  toggleSortDirection,
  validateCellValue,
} from '../../src/utils/gridUtils';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

interface User extends GridRow {
  id: number;
  name: string;
  age: number;
  active: boolean;
  joinedAt: string;
}

const users: User[] = [
  { id: 1, name: 'Alice', age: 30, active: true, joinedAt: '2022-01-15' },
  { id: 2, name: 'Bob', age: 24, active: false, joinedAt: '2023-06-01' },
  { id: 3, name: 'Charlie', age: 35, active: true, joinedAt: '2021-11-20' },
  { id: 4, name: 'Diana', age: 28, active: false, joinedAt: '2024-03-10' },
];

const columns: ColumnDef<User>[] = [
  { key: 'id', title: 'ID', type: 'number', sortable: true },
  { key: 'name', title: 'Name', type: 'string', sortable: true, filterable: true, editable: true },
  { key: 'age', title: 'Age', type: 'number', sortable: true, filterable: true, editable: true },
  { key: 'active', title: 'Active', type: 'boolean', sortable: true },
  { key: 'joinedAt', title: 'Joined', type: 'date', sortable: true },
];

// ─── sortRows ─────────────────────────────────────────────────────────────────

describe('sortRows', () => {
  it('sorts strings ascending', () => {
    const config: SortConfig = { columnKey: 'name', direction: 'asc' };
    const result = sortRows(users, config, columns);
    expect(result.map((u) => u.name)).toEqual(['Alice', 'Bob', 'Charlie', 'Diana']);
  });

  it('sorts strings descending', () => {
    const config: SortConfig = { columnKey: 'name', direction: 'desc' };
    const result = sortRows(users, config, columns);
    expect(result.map((u) => u.name)).toEqual(['Diana', 'Charlie', 'Bob', 'Alice']);
  });

  it('sorts numbers ascending', () => {
    const config: SortConfig = { columnKey: 'age', direction: 'asc' };
    const result = sortRows(users, config, columns);
    expect(result.map((u) => u.age)).toEqual([24, 28, 30, 35]);
  });

  it('sorts numbers descending', () => {
    const config: SortConfig = { columnKey: 'age', direction: 'desc' };
    const result = sortRows(users, config, columns);
    expect(result.map((u) => u.age)).toEqual([35, 30, 28, 24]);
  });

  it('sorts dates ascending', () => {
    const config: SortConfig = { columnKey: 'joinedAt', direction: 'asc' };
    const result = sortRows(users, config, columns);
    expect(result[0].joinedAt).toBe('2021-11-20');
    expect(result[result.length - 1].joinedAt).toBe('2024-03-10');
  });

  it('sorts booleans ascending (false before true)', () => {
    const config: SortConfig = { columnKey: 'active', direction: 'asc' };
    const result = sortRows(users, config, columns);
    expect(result[0].active).toBe(false);
    expect(result[result.length - 1].active).toBe(true);
  });

  it('does not mutate the original array', () => {
    const original = [...users];
    sortRows(users, { columnKey: 'name', direction: 'asc' }, columns);
    expect(users).toEqual(original);
  });

  it('places null values at the end', () => {
    const withNull: GridRow[] = [
      { id: 1, name: 'Z' },
      { id: 2, name: null },
      { id: 3, name: 'A' },
    ];
    const cols: ColumnDef[] = [{ key: 'name', title: 'Name', type: 'string', sortable: true }];
    const result = sortRows(withNull, { columnKey: 'name', direction: 'asc' }, cols);
    expect(result[result.length - 1].name).toBeNull();
  });
});

// ─── filterRows ───────────────────────────────────────────────────────────────

describe('filterRows', () => {
  it('returns all rows when filters array is empty', () => {
    const result = filterRows(users, []);
    expect(result).toBe(users); // same reference
  });

  it('filters by contains (case-insensitive)', () => {
    const filters: FilterEntry[] = [{ columnKey: 'name', value: 'ali', operator: 'contains' }];
    const result = filterRows(users, filters);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alice');
  });

  it('filters by equals', () => {
    const filters: FilterEntry[] = [{ columnKey: 'name', value: 'Bob', operator: 'equals' }];
    const result = filterRows(users, filters);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Bob');
  });

  it('filters by startsWith', () => {
    const filters: FilterEntry[] = [{ columnKey: 'name', value: 'C', operator: 'startsWith' }];
    const result = filterRows(users, filters);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Charlie');
  });

  it('filters by gt (greater than)', () => {
    const filters: FilterEntry[] = [{ columnKey: 'age', value: '29', operator: 'gt' }];
    const result = filterRows(users, filters);
    expect(result.map((u) => u.age)).toEqual(expect.arrayContaining([30, 35]));
    expect(result).toHaveLength(2);
  });

  it('filters by lte (less than or equal)', () => {
    const filters: FilterEntry[] = [{ columnKey: 'age', value: '28', operator: 'lte' }];
    const result = filterRows(users, filters);
    expect(result.map((u) => u.age)).toEqual(expect.arrayContaining([24, 28]));
  });

  it('applies multiple filters (AND logic)', () => {
    const filters: FilterEntry[] = [
      { columnKey: 'name', value: 'ali', operator: 'contains' },
      { columnKey: 'age', value: '29', operator: 'gt' },
    ];
    const result = filterRows(users, filters);
    // Only Alice: name contains 'ali' AND age > 29
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Alice');
  });

  it('skips blank filter values', () => {
    const filters: FilterEntry[] = [{ columnKey: 'name', value: '  ', operator: 'contains' }];
    const result = filterRows(users, filters);
    expect(result).toHaveLength(users.length);
  });

  it('returns empty array when nothing matches', () => {
    const filters: FilterEntry[] = [{ columnKey: 'name', value: 'XYZ', operator: 'equals' }];
    const result = filterRows(users, filters);
    expect(result).toHaveLength(0);
  });
});

// ─── paginateRows ─────────────────────────────────────────────────────────────

describe('paginateRows', () => {
  it('returns the first page', () => {
    const result = paginateRows(users, 1, 2);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].id).toBe(1);
    expect(result.totalPages).toBe(2);
    expect(result.totalRows).toBe(4);
    expect(result.currentPage).toBe(1);
  });

  it('returns the second page', () => {
    const result = paginateRows(users, 2, 2);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0].id).toBe(3);
  });

  it('clamps page below 1 to 1', () => {
    const result = paginateRows(users, 0, 2);
    expect(result.currentPage).toBe(1);
  });

  it('clamps page above totalPages to last page', () => {
    const result = paginateRows(users, 100, 2);
    expect(result.currentPage).toBe(2);
  });

  it('handles empty dataset', () => {
    const result = paginateRows([], 1, 10);
    expect(result.rows).toHaveLength(0);
    expect(result.totalPages).toBe(1);
    expect(result.totalRows).toBe(0);
  });

  it('returns partial last page', () => {
    const result = paginateRows(users, 2, 3);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].id).toBe(4);
  });
});

// ─── serializeToCSV ───────────────────────────────────────────────────────────

describe('serializeToCSV', () => {
  it('produces a header row from column titles', () => {
    const csv = serializeToCSV(users, columns);
    const firstLine = csv.split('\n')[0];
    expect(firstLine).toBe('ID,Name,Age,Active,Joined');
  });

  it('includes data rows', () => {
    const csv = serializeToCSV(users, columns);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(users.length + 1);
  });

  it('escapes cells containing commas', () => {
    const rowsWithComma: GridRow[] = [{ id: 1, name: 'Smith, John' }];
    const cols: ColumnDef[] = [{ key: 'name', title: 'Name' }];
    const csv = serializeToCSV(rowsWithComma, cols);
    expect(csv).toContain('"Smith, John"');
  });

  it('escapes cells containing double-quotes', () => {
    const rowsWithQuote: GridRow[] = [{ id: 1, name: 'He said "hi"' }];
    const cols: ColumnDef[] = [{ key: 'name', title: 'Name' }];
    const csv = serializeToCSV(rowsWithQuote, cols);
    expect(csv).toContain('"He said ""hi"""');
  });

  it('outputs empty string for null values', () => {
    const rowsWithNull: GridRow[] = [{ id: 1, name: null }];
    const cols: ColumnDef[] = [{ key: 'name', title: 'Name' }];
    const csv = serializeToCSV(rowsWithNull, cols);
    const dataLine = csv.split('\n')[1];
    expect(dataLine).toBe('');
  });
});

// ─── serializeToJSON ──────────────────────────────────────────────────────────

describe('serializeToJSON', () => {
  it('produces valid JSON', () => {
    const json = serializeToJSON(users, columns);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('includes only keys defined in columns', () => {
    const partialCols: ColumnDef<User>[] = [
      { key: 'id', title: 'ID' },
      { key: 'name', title: 'Name' },
    ];
    const parsed = JSON.parse(serializeToJSON(users, partialCols));
    parsed.forEach((row: Record<string, unknown>) => {
      expect(Object.keys(row)).toEqual(['id', 'name']);
    });
  });

  it('represents missing values as null', () => {
    const sparse: GridRow[] = [{ id: 1 }]; // 'name' is missing
    const cols: ColumnDef[] = [
      { key: 'id', title: 'ID' },
      { key: 'name', title: 'Name' },
    ];
    const parsed = JSON.parse(serializeToJSON(sparse, cols));
    expect(parsed[0].name).toBeNull();
  });

  it('serialises the correct number of rows', () => {
    const parsed = JSON.parse(serializeToJSON(users, columns));
    expect(parsed).toHaveLength(users.length);
  });
});

// ─── validateCellValue ────────────────────────────────────────────────────────

describe('validateCellValue', () => {
  it('returns null for a valid numeric string on a number column', () => {
    const col: ColumnDef = { key: 'age', title: 'Age', type: 'number' };
    expect(validateCellValue('42', col)).toBeNull();
  });

  it('returns an error for a non-numeric string on a number column', () => {
    const col: ColumnDef = { key: 'age', title: 'Age', type: 'number' };
    expect(validateCellValue('abc', col)).toBe('Must be a valid number');
  });

  it('returns null for an empty string on a number column (not required)', () => {
    const col: ColumnDef = { key: 'age', title: 'Age', type: 'number' };
    expect(validateCellValue('', col)).toBeNull();
  });

  it('uses a custom validate function when provided', () => {
    const col: ColumnDef = {
      key: 'name',
      title: 'Name',
      validate: (v) => (v.length < 2 ? 'Too short' : null),
    };
    expect(validateCellValue('A', col)).toBe('Too short');
    expect(validateCellValue('Alice', col)).toBeNull();
  });

  it('returns null for a string column with any value', () => {
    const col: ColumnDef = { key: 'name', title: 'Name', type: 'string' };
    expect(validateCellValue('anything', col)).toBeNull();
  });
});

// ─── toggleSortDirection ──────────────────────────────────────────────────────

describe('toggleSortDirection', () => {
  it('toggles asc to desc', () => {
    expect(toggleSortDirection('asc')).toBe('desc');
  });

  it('toggles desc to asc', () => {
    expect(toggleSortDirection('desc')).toBe('asc');
  });
});
