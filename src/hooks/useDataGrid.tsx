import { useCallback, useMemo, useReducer } from 'react';

import {
  ColumnDef,
  EditingCell,
  ExportFormat,
  FilterEntry,
  FilterOperator,
  GridRow,
  PaginationResult,
  SortConfig,
  SortDirection,
  filterRows,
  paginateRows,
  serializeToCSV,
  serializeToJSON,
  sortRows,
  toggleSortDirection,
  validateCellValue,
} from '../utils/gridUtils';
import { logger } from '../utils/logger';

// ─── State shape ─────────────────────────────────────────────────────────────

interface DataGridState {
  sortConfig: SortConfig | null;
  filters: FilterEntry[];
  page: number;
  pageSize: number;
  editingCell: EditingCell | null;
  editError: string | null;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

type DataGridAction =
  | { type: 'SET_SORT'; columnKey: string; direction: SortDirection }
  | { type: 'CLEAR_SORT' }
  | { type: 'SET_FILTER'; columnKey: string; value: string; operator: FilterOperator }
  | { type: 'CLEAR_FILTER'; columnKey: string }
  | { type: 'CLEAR_ALL_FILTERS' }
  | { type: 'GO_TO_PAGE'; page: number }
  | { type: 'SET_PAGE_SIZE'; pageSize: number }
  | { type: 'START_EDITING'; rowId: string | number; columnKey: string; draft: string }
  | { type: 'UPDATE_DRAFT'; draft: string }
  | { type: 'SET_EDIT_ERROR'; error: string | null }
  | { type: 'COMMIT_EDIT' }
  | { type: 'CANCEL_EDIT' };

function reducer(state: DataGridState, action: DataGridAction): DataGridState {
  switch (action.type) {
    case 'SET_SORT':
      return {
        ...state,
        sortConfig: { columnKey: action.columnKey, direction: action.direction },
        page: 1,
      };

    case 'CLEAR_SORT':
      return { ...state, sortConfig: null };

    case 'SET_FILTER': {
      const without = state.filters.filter((f) => f.columnKey !== action.columnKey);
      const updated: FilterEntry[] = action.value.trim()
        ? [
            ...without,
            { columnKey: action.columnKey, value: action.value, operator: action.operator },
          ]
        : without;
      return { ...state, filters: updated, page: 1 };
    }

    case 'CLEAR_FILTER':
      return {
        ...state,
        filters: state.filters.filter((f) => f.columnKey !== action.columnKey),
        page: 1,
      };

    case 'CLEAR_ALL_FILTERS':
      return { ...state, filters: [], page: 1 };

    case 'GO_TO_PAGE':
      return { ...state, page: action.page };

    case 'SET_PAGE_SIZE':
      return { ...state, pageSize: action.pageSize, page: 1 };

    case 'START_EDITING':
      return {
        ...state,
        editingCell: { rowId: action.rowId, columnKey: action.columnKey, draft: action.draft },
        editError: null,
      };

    case 'UPDATE_DRAFT':
      if (!state.editingCell) return state;
      return {
        ...state,
        editingCell: { ...state.editingCell, draft: action.draft },
        editError: null,
      };

    case 'SET_EDIT_ERROR':
      return { ...state, editError: action.error };

    case 'COMMIT_EDIT':
    case 'CANCEL_EDIT':
      return { ...state, editingCell: null, editError: null };

    default:
      return state;
  }
}

// ─── Hook options ─────────────────────────────────────────────────────────────

/** Configuration options accepted by `useDataGrid`. */
export interface UseDataGridOptions<T extends GridRow> {
  /** Initial page size. Defaults to `20`. */
  defaultPageSize?: number;
  /** Initial sort column key. */
  defaultSortKey?: keyof T & string;
  /** Initial sort direction. Defaults to `'asc'`. */
  defaultSortDirection?: SortDirection;
  /**
   * Called after a cell edit is committed and validated.
   * The parent is responsible for applying the change to its data source.
   */
  onRowUpdate?: (rowId: string | number, columnKey: string, value: string) => void;
}

/** The object returned by `useDataGrid`. */
export interface UseDataGridReturn<T extends GridRow> {
  // ── Derived data ──
  /** Rows after filtering, sorting, and pagination. */
  paginatedRows: T[];
  /** Rows after filtering and sorting (before pagination). */
  processedRows: T[];
  /** Pagination metadata for the current view. */
  pagination: PaginationResult<T>;

  // ── Sort state ──
  sortConfig: SortConfig | null;
  /** Toggle sort on a column. Cycles: none → asc → desc → none. */
  sort: (columnKey: string) => void;
  clearSort: () => void;

  // ── Filter state ──
  filters: FilterEntry[];
  setFilter: (columnKey: string, value: string, operator?: FilterOperator) => void;
  clearFilter: (columnKey: string) => void;
  clearAllFilters: () => void;

  // ── Pagination ──
  page: number;
  pageSize: number;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;

  // ── Inline editing ──
  editingCell: EditingCell | null;
  editError: string | null;
  startEditing: (rowId: string | number, columnKey: string, currentValue: unknown) => void;
  updateDraft: (value: string) => void;
  commitEdit: () => void;
  cancelEditing: () => void;

  // ── Export ──
  exportData: (format: ExportFormat) => string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages all state for the AdvancedDataGrid component.
 *
 * Handles sorting, column filtering, pagination, inline editing with
 * validation, and data export serialization. The hook is intentionally
 * data-agnostic — it operates on the `rows` and `columns` passed in and
 * delegates mutation side-effects back to the caller via `onRowUpdate`.
 *
 * @example
 * const grid = useDataGrid(rows, columns, { defaultPageSize: 10 });
 */
export function useDataGrid<T extends GridRow>(
  rows: T[],
  columns: ColumnDef<T>[],
  options: UseDataGridOptions<T> = {}
): UseDataGridReturn<T> {
  const {
    defaultPageSize = 20,
    defaultSortKey,
    defaultSortDirection = 'asc',
    onRowUpdate,
  } = options;

  const [state, dispatch] = useReducer(reducer, {
    sortConfig: defaultSortKey
      ? { columnKey: defaultSortKey, direction: defaultSortDirection }
      : null,
    filters: [],
    page: 1,
    pageSize: defaultPageSize,
    editingCell: null,
    editError: null,
  });

  // ── Derive processed rows (filter → sort) ───────────────────────────────
  const processedRows = useMemo(() => {
    const filtered = filterRows(rows, state.filters);
    return state.sortConfig ? sortRows(filtered, state.sortConfig, columns) : filtered;
  }, [rows, state.filters, state.sortConfig, columns]);

  // ── Paginate ─────────────────────────────────────────────────────────────
  const pagination = useMemo(
    () => paginateRows(processedRows, state.page, state.pageSize),
    [processedRows, state.page, state.pageSize]
  );

  // ── Sort actions ─────────────────────────────────────────────────────────
  const sort = useCallback(
    (columnKey: string) => {
      if (state.sortConfig?.columnKey === columnKey) {
        if (state.sortConfig.direction === 'desc') {
          dispatch({ type: 'CLEAR_SORT' });
        } else {
          dispatch({
            type: 'SET_SORT',
            columnKey,
            direction: toggleSortDirection(state.sortConfig.direction),
          });
        }
      } else {
        dispatch({ type: 'SET_SORT', columnKey, direction: 'asc' });
      }
    },
    [state.sortConfig]
  );

  const clearSort = useCallback(() => dispatch({ type: 'CLEAR_SORT' }), []);

  // ── Filter actions ────────────────────────────────────────────────────────
  const setFilter = useCallback(
    (columnKey: string, value: string, operator: FilterOperator = 'contains') => {
      dispatch({ type: 'SET_FILTER', columnKey, value, operator });
    },
    []
  );

  const clearFilter = useCallback(
    (columnKey: string) => dispatch({ type: 'CLEAR_FILTER', columnKey }),
    []
  );

  const clearAllFilters = useCallback(() => dispatch({ type: 'CLEAR_ALL_FILTERS' }), []);

  // ── Pagination actions ────────────────────────────────────────────────────
  const goToPage = useCallback((page: number) => dispatch({ type: 'GO_TO_PAGE', page }), []);
  const setPageSize = useCallback(
    (size: number) => dispatch({ type: 'SET_PAGE_SIZE', pageSize: size }),
    []
  );

  // ── Editing actions ───────────────────────────────────────────────────────
  const startEditing = useCallback(
    (rowId: string | number, columnKey: string, currentValue: unknown) => {
      const col = columns.find((c) => c.key === columnKey);
      if (!col?.editable) {
        logger.warn(`[useDataGrid] Column "${columnKey}" is not editable.`);
        return;
      }
      dispatch({
        type: 'START_EDITING',
        rowId,
        columnKey,
        draft: currentValue == null ? '' : String(currentValue),
      });
    },
    [columns]
  );

  const updateDraft = useCallback(
    (value: string) => dispatch({ type: 'UPDATE_DRAFT', draft: value }),
    []
  );

  const commitEdit = useCallback(() => {
    if (!state.editingCell) return;

    const { rowId, columnKey, draft } = state.editingCell;
    const col = columns.find((c) => c.key === columnKey);

    if (col) {
      const error = validateCellValue(draft, col as ColumnDef);
      if (error) {
        dispatch({ type: 'SET_EDIT_ERROR', error });
        return;
      }
    }

    try {
      onRowUpdate?.(rowId, columnKey, draft);
    } catch (err) {
      logger.error('[useDataGrid] onRowUpdate threw an error:', err);
    }

    dispatch({ type: 'COMMIT_EDIT' });
  }, [state.editingCell, columns, onRowUpdate]);

  const cancelEditing = useCallback(() => dispatch({ type: 'CANCEL_EDIT' }), []);

  // ── Export ────────────────────────────────────────────────────────────────
  const exportData = useCallback(
    (format: ExportFormat): string => {
      if (format === 'json') {
        return serializeToJSON(processedRows, columns as ColumnDef[]);
      }
      return serializeToCSV(processedRows, columns as ColumnDef[]);
    },
    [processedRows, columns]
  );

  return {
    paginatedRows: pagination.rows,
    processedRows,
    pagination,
    sortConfig: state.sortConfig,
    sort,
    clearSort,
    filters: state.filters,
    setFilter,
    clearFilter,
    clearAllFilters,
    page: pagination.currentPage,
    pageSize: state.pageSize,
    goToPage,
    setPageSize,
    editingCell: state.editingCell,
    editError: state.editError,
    startEditing,
    updateDraft,
    commitEdit,
    cancelEditing,
    exportData,
  };
}

export default useDataGrid;
