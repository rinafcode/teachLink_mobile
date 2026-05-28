import { ArrowDown, ArrowUp, ArrowUpDown, Filter, FilterX } from 'lucide-react-native';
import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItemInfo,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { GridExporter } from './GridExporter';
import { GridFiltering } from './GridFiltering';
import { InlineEditing } from './InlineEditing';
import { useDataGrid, UseDataGridOptions } from '../../hooks/useDataGrid';
import { ColumnDef, ExportFormat, GridRow, SortConfig, SortDirection } from '../../utils/gridUtils';
import { ErrorBoundary } from '../common/ErrorBoundary';

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Props for the AdvancedDataGrid component.
 */
export interface AdvancedDataGridProps<T extends GridRow = GridRow> extends UseDataGridOptions<T> {
  /** Column definitions that describe the schema and capabilities of each column. */
  columns: ColumnDef<T>[];
  /** The full dataset. The grid does not mutate this array. */
  rows: T[];
  /** Show or hide the column filter row. Defaults to `true`. */
  showFilters?: boolean;
  /** Show or hide the export toolbar. Defaults to `true`. */
  showExporter?: boolean;
  /** Show a loading overlay while data is being fetched. */
  loading?: boolean;
  /** Message shown when the filtered result set is empty. */
  emptyMessage?: string;
  /** Optional `testID` forwarded to the root container. */
  testID?: string;
}

/**
 * A feature-rich, virtualized data grid for React Native.
 *
 * Capabilities:
 * - Column sorting (cycle: none → asc → desc → none)
 * - Per-column text filtering with active indicator
 * - Inline cell editing with per-column validation
 * - Pagination with configurable page size
 * - One-tap data export to CSV or JSON via the native share sheet
 * - Virtualized row rendering for smooth performance on large datasets
 *
 * @example
 * <AdvancedDataGrid
 *   columns={columns}
 *   rows={data}
 *   defaultPageSize={15}
 *   onRowUpdate={(id, key, value) => updateRow(id, key, value)}
 * />
 */
export const AdvancedDataGrid = <T extends GridRow = GridRow>({
  columns,
  rows,
  showFilters = true,
  showExporter = true,
  loading = false,
  emptyMessage = 'No data to display',
  testID,
  ...gridOptions
}: AdvancedDataGridProps<T>) => {
  const grid = useDataGrid(rows, columns, gridOptions);

  const {
    paginatedRows,
    pagination,
    sortConfig,
    sort,
    filters,
    setFilter,
    clearAllFilters,
    page,
    pageSize,
    goToPage,
    editingCell,
    editError,
    startEditing,
    updateDraft,
    commitEdit,
    cancelEditing,
    exportData,
  } = grid;

  // ── Stable column widths ─────────────────────────────────────────────────
  const columnWidths = useMemo(() => columns.map(c => c.minWidth ?? 120), [columns]);

  const totalWidth = useMemo(() => columnWidths.reduce((sum, w) => sum + w, 0), [columnWidths]);

  // ── Row renderer (memoized to avoid re-renders on unrelated state changes) ─
  const renderRow = useCallback(
    ({ item, index }: ListRenderItemInfo<T>) => (
      <DataRow
        key={String(item.id)}
        row={item}
        rowIndex={index}
        columns={columns}
        columnWidths={columnWidths}
        editingCell={editingCell}
        editError={editError}
        onStartEdit={startEditing}
        onChangeDraft={updateDraft}
        onCommit={commitEdit}
        onCancel={cancelEditing}
      />
    ),
    [
      columns,
      columnWidths,
      editingCell,
      editError,
      startEditing,
      updateDraft,
      commitEdit,
      cancelEditing,
    ]
  );

  const keyExtractor = useCallback((item: T) => String(item.id), []);

  const hasFilters = filters.length > 0;

  return (
    <ErrorBoundary boundaryName="AdvancedDataGrid">
      <View style={styles.root} testID={testID}>
        {/* ── Toolbar ─────────────────────────────────────────────────────── */}
        <GridToolbar
          totalRows={pagination.totalRows}
          hasFilters={hasFilters}
          onClearFilters={clearAllFilters}
          showExporter={showExporter}
          onExport={exportData}
        />

        {/* ── Scrollable grid area ─────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator style={styles.horizontalScroll}>
          <View style={{ width: totalWidth }}>
            {/* Column headers */}
            <HeaderRow
              columns={columns}
              columnWidths={columnWidths}
              sortConfig={sortConfig}
              onSort={sort}
            />

            {/* Filter inputs */}
            {showFilters && (
              <GridFiltering
                columns={columns}
                filters={filters}
                onFilterChange={setFilter}
                onClearAll={clearAllFilters}
                columnMinWidth={120}
              />
            )}

            {/* Data rows */}
            {loading ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#19c3e6" />
              </View>
            ) : paginatedRows.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>{emptyMessage}</Text>
              </View>
            ) : (
              <FlatList
                data={paginatedRows}
                renderItem={renderRow}
                keyExtractor={keyExtractor}
                removeClippedSubviews
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={5}
                scrollEnabled={false}
                nestedScrollEnabled={false}
              />
            )}
          </View>
        </ScrollView>

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        <PaginationBar
          currentPage={page}
          totalPages={pagination.totalPages}
          totalRows={pagination.totalRows}
          pageSize={pageSize}
          onGoToPage={goToPage}
        />
      </View>
    </ErrorBoundary>
  );
};

// ─── GridToolbar ──────────────────────────────────────────────────────────────

interface GridToolbarProps {
  totalRows: number;
  hasFilters: boolean;
  onClearFilters: () => void;
  showExporter: boolean;
  onExport: (format: ExportFormat) => string;
}

const GridToolbar = ({
  totalRows,
  hasFilters,
  onClearFilters,
  showExporter,
  onExport,
}: GridToolbarProps) => {
  return (
    <View style={styles.toolbar}>
      <View style={styles.toolbarLeft}>
        <Text style={styles.rowCount}>
          {totalRows} {totalRows === 1 ? 'row' : 'rows'}
        </Text>
        {hasFilters && (
          <TouchableOpacity
            onPress={onClearFilters}
            style={styles.clearFiltersBtn}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear all active filters"
          >
            <FilterX size={14} color="#EF4444" />
            <Text style={styles.clearFiltersText}>Clear filters</Text>
          </TouchableOpacity>
        )}
        {!hasFilters && (
          <View style={styles.filterIndicator}>
            <Filter size={12} color="#9CA3AF" />
          </View>
        )}
      </View>
      {showExporter && <GridExporter onExport={onExport} disabled={totalRows === 0} />}
    </View>
  );
};

// ─── HeaderRow ────────────────────────────────────────────────────────────────

interface HeaderRowProps<T extends GridRow> {
  columns: ColumnDef<T>[];
  columnWidths: number[];
  sortConfig: SortConfig | null;
  onSort: (columnKey: string) => void;
}

const HeaderRow = <T extends GridRow>({
  columns,
  columnWidths,
  sortConfig,
  onSort,
}: HeaderRowProps<T>) => {
  return (
    <View style={styles.headerRow}>
      {columns.map((col, idx) => {
        const isSorted = sortConfig?.columnKey === col.key;
        const direction: SortDirection | null = isSorted ? sortConfig!.direction : null;

        return (
          <TouchableOpacity
            key={col.key}
            style={[styles.headerCell, { width: columnWidths[idx] }]}
            onPress={col.sortable ? () => onSort(col.key) : undefined}
            disabled={!col.sortable}
            activeOpacity={col.sortable ? 0.7 : 1}
            accessibilityRole={col.sortable ? 'button' : 'text'}
            accessibilityLabel={
              col.sortable
                ? `Sort by ${col.title}${isSorted ? `, currently ${direction}` : ''}`
                : col.title
            }
          >
            <Text
              style={[styles.headerText, isSorted && styles.headerTextSorted]}
              numberOfLines={1}
            >
              {col.title}
            </Text>
            {col.sortable && <SortIcon direction={direction} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// ─── SortIcon ─────────────────────────────────────────────────────────────────

const SortIcon = ({ direction }: { direction: SortDirection | null }) => {
  const color = direction ? '#19c3e6' : '#D1D5DB';
  const size = 13;

  if (direction === 'asc') return <ArrowUp size={size} color={color} />;
  if (direction === 'desc') return <ArrowDown size={size} color={color} />;
  return <ArrowUpDown size={size} color={color} />;
};

// ─── DataRow ──────────────────────────────────────────────────────────────────

interface DataRowProps<T extends GridRow> {
  row: T;
  rowIndex: number;
  columns: ColumnDef<T>[];
  columnWidths: number[];
  editingCell: ReturnType<typeof useDataGrid>['editingCell'];
  editError: string | null;
  onStartEdit: (rowId: string | number, columnKey: string, currentValue: unknown) => void;
  onChangeDraft: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}

const DataRow = <T extends GridRow>({
  row,
  rowIndex,
  columns,
  columnWidths,
  editingCell,
  editError,
  onStartEdit,
  onChangeDraft,
  onCommit,
  onCancel,
}: DataRowProps<T>) => {
  const isEvenRow = rowIndex % 2 === 0;

  return (
    <View style={[styles.dataRow, isEvenRow && styles.dataRowEven]}>
      {columns.map((col, idx) => {
        const cellIsEditing = editingCell?.rowId === row.id && editingCell?.columnKey === col.key;

        return (
          <View key={col.key} style={[styles.dataCell, { width: columnWidths[idx] }]}>
            <InlineEditing
              value={row[col.key]}
              isEditing={cellIsEditing}
              draft={cellIsEditing ? editingCell!.draft : ''}
              error={cellIsEditing ? editError : null}
              column={col as ColumnDef}
              onStartEdit={() => onStartEdit(row.id, col.key, row[col.key])}
              onChangeDraft={onChangeDraft}
              onCommit={onCommit}
              onCancel={onCancel}
            />
          </View>
        );
      })}
    </View>
  );
};

// ─── PaginationBar ────────────────────────────────────────────────────────────

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  totalRows: number;
  pageSize: number;
  onGoToPage: (page: number) => void;
}

const PaginationBar = ({
  currentPage,
  totalPages,
  totalRows,
  pageSize,
  onGoToPage,
}: PaginationBarProps) => {
  if (totalRows === 0) return null;

  const startRow = (currentPage - 1) * pageSize + 1;
  const endRow = Math.min(currentPage * pageSize, totalRows);

  return (
    <View style={styles.pagination}>
      <Text style={styles.paginationInfo}>
        {startRow}–{endRow} of {totalRows}
      </Text>

      <View style={styles.paginationControls}>
        <TouchableOpacity
          style={[styles.pageBtn, currentPage <= 1 && styles.pageBtnDisabled]}
          onPress={() => onGoToPage(1)}
          disabled={currentPage <= 1}
          accessibilityLabel="First page"
          accessibilityRole="button"
        >
          <Text style={[styles.pageBtnText, currentPage <= 1 && styles.pageBtnTextDisabled]}>
            «
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pageBtn, currentPage <= 1 && styles.pageBtnDisabled]}
          onPress={() => onGoToPage(currentPage - 1)}
          disabled={currentPage <= 1}
          accessibilityLabel="Previous page"
          accessibilityRole="button"
        >
          <Text style={[styles.pageBtnText, currentPage <= 1 && styles.pageBtnTextDisabled]}>
            ‹
          </Text>
        </TouchableOpacity>

        <Text style={styles.pageIndicator}>
          {currentPage} / {totalPages}
        </Text>

        <TouchableOpacity
          style={[styles.pageBtn, currentPage >= totalPages && styles.pageBtnDisabled]}
          onPress={() => onGoToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
          accessibilityLabel="Next page"
          accessibilityRole="button"
        >
          <Text
            style={[styles.pageBtnText, currentPage >= totalPages && styles.pageBtnTextDisabled]}
          >
            ›
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pageBtn, currentPage >= totalPages && styles.pageBtnDisabled]}
          onPress={() => onGoToPage(totalPages)}
          disabled={currentPage >= totalPages}
          accessibilityLabel="Last page"
          accessibilityRole="button"
        >
          <Text
            style={[styles.pageBtnText, currentPage >= totalPages && styles.pageBtnTextDisabled]}
          >
            »
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    overflow: 'hidden',
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  toolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#FEF2F2',
  },
  clearFiltersText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '500',
  },
  filterIndicator: {
    padding: 4,
  },
  horizontalScroll: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerCell: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#E5E7EB',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    flex: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  headerTextSorted: {
    color: '#19c3e6',
  },
  dataRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F3F4F6',
  },
  dataRowEven: {
    backgroundColor: '#FAFAFA',
  },
  dataCell: {
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: '#E5E7EB',
    justifyContent: 'center',
  },
  loadingOverlay: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  paginationInfo: {
    fontSize: 12,
    color: '#6B7280',
  },
  paginationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  pageBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
  pageBtnDisabled: {
    backgroundColor: 'transparent',
  },
  pageBtnText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '600',
  },
  pageBtnTextDisabled: {
    color: '#D1D5DB',
  },
  pageIndicator: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '600',
    paddingHorizontal: 8,
    minWidth: 56,
    textAlign: 'center',
  },
});

export default AdvancedDataGrid;
