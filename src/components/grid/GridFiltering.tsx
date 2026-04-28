import { Search, X } from 'lucide-react-native';
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ColumnDef, FilterEntry, FilterOperator, GridRow } from '../../utils/gridUtils';

/**
 * Props for the GridFiltering component.
 */
export interface GridFilteringProps<T extends GridRow = GridRow> {
  /** Column definitions — only columns with `filterable: true` are rendered. */
  columns: ColumnDef<T>[];
  /** The currently active filters. */
  filters: FilterEntry[];
  /** Called when the user types into a filter input. */
  onFilterChange: (columnKey: string, value: string, operator?: FilterOperator) => void;
  /** Called when the user clears all filters at once. */
  onClearAll: () => void;
  /** Minimum column width used to align filter inputs with header cells. */
  columnMinWidth?: number;
}

/**
 * A horizontally scrollable row of per-column text filter inputs.
 *
 * Renders a `TextInput` for each column that has `filterable: true`.
 * Active filter values are highlighted so users can see which columns
 * are currently constraining the data.
 */
export const GridFiltering = <T extends GridRow = GridRow>({
  columns,
  filters,
  onFilterChange,
  onClearAll,
  columnMinWidth = 120,
}: GridFilteringProps<T>): React.ReactElement | null => {
  const filterableColumns = columns.filter((c) => c.filterable);
  const hasActiveFilters = filters.length > 0;

  const getFilterValue = useCallback(
    (columnKey: string) => filters.find((f) => f.columnKey === columnKey)?.value ?? '',
    [filters]
  );

  if (filterableColumns.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
        keyboardShouldPersistTaps="handled"
      >
        {filterableColumns.map((col) => {
          const currentValue = getFilterValue(col.key);
          const isActive = currentValue.trim().length > 0;

          return (
            <FilterInput
              key={col.key}
              columnKey={col.key}
              placeholder={`Filter ${col.title}…`}
              value={currentValue}
              isActive={isActive}
              minWidth={col.minWidth ?? columnMinWidth}
              onChangeText={(text) => onFilterChange(col.key, text)}
            />
          );
        })}
      </ScrollView>

      {hasActiveFilters && (
        <TouchableOpacity
          onPress={onClearAll}
          style={styles.clearAllBtn}
          hitSlop={8}
          accessibilityLabel="Clear all filters"
          accessibilityRole="button"
        >
          <X size={14} color="#6B7280" />
          <Text style={styles.clearAllText}>Clear all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── FilterInput ─────────────────────────────────────────────────────────────

interface FilterInputProps {
  columnKey: string;
  placeholder: string;
  value: string;
  isActive: boolean;
  minWidth: number;
  onChangeText: (text: string) => void;
}

const FilterInput = ({
  placeholder,
  value,
  isActive,
  minWidth,
  onChangeText,
}: FilterInputProps): React.ReactElement => {
  return (
    <View style={[styles.inputWrapper, { minWidth }, isActive && styles.inputWrapperActive]}>
      <Search size={14} color={isActive ? '#19c3e6' : '#9CA3AF'} style={styles.searchIcon} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        clearButtonMode="while-editing"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={6} style={styles.clearBtn}>
          <X size={12} color="#9CA3AF" />
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 6,
  },
  inputWrapperActive: {
    borderColor: '#19c3e6',
    backgroundColor: '#f0fbff',
  },
  searchIcon: {
    flexShrink: 0,
  },
  input: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    padding: 0,
    minWidth: 60,
  },
  clearBtn: {
    padding: 2,
  },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginRight: 4,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  clearAllText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});
