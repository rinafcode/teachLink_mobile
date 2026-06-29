import React, { memo, useCallback, useReducer } from 'react';
import { StyleSheet, View } from 'react-native';

import { ColumnDef, GridRow, validateCellValue } from '../../utils/gridUtils';
import { InlineEditing } from '../grid/InlineEditing';

interface DataGridRowProps {
  row: GridRow;
  rowIndex: number;
  columns: ColumnDef<GridRow>[];
  columnWidths: number[];
  onRowUpdate?: (rowId: string | number, columnKey: string, value: string) => void;
}

type RowAction =
  | { type: 'START_EDIT'; columnKey: string; draft: string }
  | { type: 'UPDATE_DRAFT'; draft: string }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'COMMIT' }
  | { type: 'CANCEL' };

interface DataGridRowState {
  editingColumnKey: string | null;
  draft: string;
  error: string | null;
}

function reducer(state: DataGridRowState, action: RowAction): DataGridRowState {
  switch (action.type) {
    case 'START_EDIT':
      return {
        editingColumnKey: action.columnKey,
        draft: action.draft,
        error: null,
      };

    case 'UPDATE_DRAFT':
      return {
        ...state,
        draft: action.draft,
        error: null,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.error,
      };

    case 'COMMIT':
    case 'CANCEL':
      return {
        editingColumnKey: null,
        draft: '',
        error: null,
      };

    default:
      return state;
  }
}

const DataGridRowComponent = ({
  row,
  rowIndex,
  columns,
  columnWidths,
  onRowUpdate,
}: DataGridRowProps) => {
  const [state, dispatch] = useReducer(reducer, {
    editingColumnKey: null,
    draft: '',
    error: null,
  });

  const handleStartEdit = useCallback((columnKey: string, currentValue: unknown) => {
    dispatch({
      type: 'START_EDIT',
      columnKey,
      draft: currentValue == null ? '' : String(currentValue),
    });
  }, []);

  const handleChangeDraft = useCallback((draft: string) => {
    dispatch({ type: 'UPDATE_DRAFT', draft });
  }, []);

  const handleCommit = useCallback(
    (columnKey: string) => {
      if (!state.editingColumnKey || state.editingColumnKey !== columnKey) {
        return;
      }

      const column = columns.find(c => c.key === columnKey);
      if (!column) {
        return;
      }

      const validationError = validateCellValue(state.draft, column as ColumnDef);
      if (validationError) {
        dispatch({ type: 'SET_ERROR', error: validationError });
        return;
      }

      onRowUpdate?.(row.id, columnKey, state.draft);
      dispatch({ type: 'COMMIT' });
    },
    [columns, onRowUpdate, row.id, state.draft, state.editingColumnKey]
  );

  const handleCancel = useCallback(() => dispatch({ type: 'CANCEL' }), []);

  const isEvenRow = rowIndex % 2 === 0;

  return (
    <View style={[styles.dataRow, isEvenRow && styles.dataRowEven]}>
      {columns.map((col, idx) => {
        const cellIsEditing = state.editingColumnKey === col.key;

        return (
          <View key={col.key} style={[styles.dataCell, { width: columnWidths[idx] }]}>
            <InlineEditing
              value={row[col.key]}
              isEditing={cellIsEditing}
              draft={cellIsEditing ? state.draft : ''}
              error={cellIsEditing ? state.error : null}
              column={col as ColumnDef}
              onStartEdit={() => handleStartEdit(col.key, row[col.key])}
              onChangeDraft={handleChangeDraft}
              onCommit={() => handleCommit(col.key)}
              onCancel={handleCancel}
            />
          </View>
        );
      })}
    </View>
  );
};

function areEqual(prevProps: Readonly<DataGridRowProps>, nextProps: Readonly<DataGridRowProps>) {
  return (
    prevProps.row === nextProps.row &&
    prevProps.rowIndex === nextProps.rowIndex &&
    prevProps.columns === nextProps.columns &&
    prevProps.columnWidths === nextProps.columnWidths &&
    prevProps.onRowUpdate === nextProps.onRowUpdate
  );
}

export const DataGridRow = memo(DataGridRowComponent, areEqual);

const styles = StyleSheet.create({
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
});
