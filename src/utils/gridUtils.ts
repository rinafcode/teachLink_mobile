/**
 * Core utilities for the AdvancedDataGrid component.
 *
 * Provides pure functions for sorting, filtering, pagination,
 * data serialization, and cell-level validation — all independent
 * of React so they are straightforward to unit-test.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Supported column data types, used to drive sort and filter behaviour. */
export type ColumnType = 'string' | 'number' | 'boolean' | 'date';

/** Direction of a column sort. */
export type SortDirection = 'asc' | 'desc';

/** Active sort state for the grid. */
export interface SortConfig {
  /** The column key currently being sorted. */
  columnKey: string;
  /** Current sort direction. */
  direction: SortDirection;
}

/**
 * Operators available for column filters.
 * Numeric operators (`gt`, `lt`, `gte`, `lte`) are only meaningful
 * on `number` or `date` typed columns.
 */
export type FilterOperator = 'contains' | 'equals' | 'startsWith' | 'gt' | 'lt' | 'gte' | 'lte';

/** A single active filter applied to a specific column. */
export interface FilterEntry {
  /** The column key this filter targets. */
  columnKey: string;
  /** The user-supplied filter value. */
  value: string;
  /** Comparison operator to apply. Defaults to `'contains'` for string columns. */
  operator: FilterOperator;
}

/**
 * Definition of a single grid column.
 * The generic `T` is the row data type.
 */
export interface ColumnDef<T = Record<string, unknown>> {
  /** Unique column key — must match a property in the row data. */
  key: keyof T & string;
  /** Display title shown in the column header. */
  title: string;
  /** Data type used to select the appropriate sort/filter logic. */
  type?: ColumnType;
  /** Whether this column can be sorted by the user. */
  sortable?: boolean;
  /** Whether a filter input is shown for this column. */
  filterable?: boolean;
  /** Whether cells in this column support inline editing. */
  editable?: boolean;
  /** Minimum rendered width of the column in logical pixels. */
  minWidth?: number;
  /**
   * Optional validation function for edited cell values.
   * Return an error string on failure, or `null` when the value is valid.
   */
  validate?: (value: string) => string | null;
}

/** A row must expose an `id` used as the stable React key. */
export type GridRow = Record<string, unknown> & { id: string | number };

/** Supported export serialization formats. */
export type ExportFormat = 'csv' | 'json';

/** Represents a cell that is currently being edited. */
export interface EditingCell {
  /** The `id` of the row being edited. */
  rowId: string | number;
  /** The column key of the cell being edited. */
  columnKey: string;
  /** Current uncommitted value in the text input. */
  draft: string;
}

// ─── Sorting ─────────────────────────────────────────────────────────────────

/**
 * Return a new sorted copy of `rows` using the provided `config`.
 * Null / undefined values are always placed at the end regardless of direction.
 */
export function sortRows<T extends GridRow>(
  rows: T[],
  config: SortConfig,
  columns: ColumnDef<T>[]
): T[] {
  const col = columns.find((c) => c.key === config.columnKey);
  const type = col?.type ?? 'string';
  const { columnKey, direction } = config;
  const multiplier = direction === 'asc' ? 1 : -1;

  return [...rows].sort((a, b) => {
    const aVal = a[columnKey];
    const bVal = b[columnKey];

    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (type === 'number') {
      return (Number(aVal) - Number(bVal)) * multiplier;
    }

    if (type === 'date') {
      const aTime = new Date(aVal as string).getTime();
      const bTime = new Date(bVal as string).getTime();
      return (aTime - bTime) * multiplier;
    }

    // Boolean: true sorts before false in asc
    if (type === 'boolean') {
      const aNum = aVal ? 1 : 0;
      const bNum = bVal ? 1 : 0;
      return (aNum - bNum) * multiplier;
    }

    return String(aVal).localeCompare(String(bVal)) * multiplier;
  });
}

// ─── Filtering ───────────────────────────────────────────────────────────────

/**
 * Return a filtered subset of `rows` where every active `FilterEntry` matches.
 * An empty `filters` array returns the original array reference unchanged.
 */
export function filterRows<T extends GridRow>(rows: T[], filters: FilterEntry[]): T[] {
  if (filters.length === 0) return rows;

  return rows.filter((row) =>
    filters.every((filter) => {
      if (filter.value.trim() === '') return true;

      const cellValue = row[filter.columnKey];
      if (cellValue == null) return false;

      const cell = String(cellValue).toLowerCase();
      const term = filter.value.toLowerCase().trim();

      switch (filter.operator) {
        case 'contains':
          return cell.includes(term);
        case 'equals':
          return cell === term;
        case 'startsWith':
          return cell.startsWith(term);
        case 'gt':
          return Number(cellValue) > Number(filter.value);
        case 'lt':
          return Number(cellValue) < Number(filter.value);
        case 'gte':
          return Number(cellValue) >= Number(filter.value);
        case 'lte':
          return Number(cellValue) <= Number(filter.value);
        default:
          return cell.includes(term);
      }
    })
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

/** Result object returned by `paginateRows`. */
export interface PaginationResult<T> {
  /** The slice of rows for the requested page. */
  rows: T[];
  /** Total number of pages given the current page size. */
  totalPages: number;
  /** Total number of rows before pagination (after filtering). */
  totalRows: number;
  /** The clamped page number that was actually used. */
  currentPage: number;
}

/**
 * Slice `rows` for the requested `page` (1-indexed) at `pageSize` per page.
 * The `page` argument is automatically clamped to the valid range.
 */
export function paginateRows<T extends GridRow>(
  rows: T[],
  page: number,
  pageSize: number
): PaginationResult<T> {
  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;

  return {
    rows: rows.slice(start, start + pageSize),
    totalPages,
    totalRows,
    currentPage,
  };
}

// ─── Export serialization ─────────────────────────────────────────────────────

/**
 * Serialize `rows` to a CSV string with a header row derived from `columns`.
 * Cell values that contain commas, double-quotes, or newlines are wrapped
 * in double-quotes with internal quotes escaped as `""`.
 */
export function serializeToCSV<T extends GridRow>(rows: T[], columns: ColumnDef<T>[]): string {
  const escapeCell = (val: unknown): string => {
    const str = val == null ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const header = columns.map((c) => escapeCell(c.title)).join(',');
  const body = rows.map((row) => columns.map((c) => escapeCell(row[c.key])).join(','));

  return [header, ...body].join('\n');
}

/**
 * Serialize `rows` to a pretty-printed JSON string.
 * Only fields defined in `columns` are included in the output.
 */
export function serializeToJSON<T extends GridRow>(rows: T[], columns: ColumnDef<T>[]): string {
  const keys = columns.map((c) => c.key);

  const payload = rows.map((row) => {
    const entry: Record<string, unknown> = {};
    keys.forEach((key) => {
      entry[key] = row[key] ?? null;
    });
    return entry;
  });

  return JSON.stringify(payload, null, 2);
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validate an edited cell value against the column's rules.
 *
 * Checks are applied in this order:
 * 1. Custom `column.validate` function (if provided)
 * 2. Built-in numeric type check
 *
 * Returns an error message on failure, or `null` when the value is valid.
 */
export function validateCellValue(value: string, column: ColumnDef): string | null {
  if (column.validate) {
    return column.validate(value);
  }

  if (column.type === 'number' && value.trim() !== '') {
    if (Number.isNaN(Number(value))) {
      return 'Must be a valid number';
    }
  }

  return null;
}

/**
 * Toggle a sort direction: `'asc'` becomes `'desc'` and vice versa.
 */
export function toggleSortDirection(current: SortDirection): SortDirection {
  return current === 'asc' ? 'desc' : 'asc';
}
