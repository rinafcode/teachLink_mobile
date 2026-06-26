import { AlertCircle, Check, X } from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ColumnDef, GridRow } from '../../utils/gridUtils';

/**
 * Props for the InlineEditing component.
 */
export interface InlineEditingProps<T extends GridRow = GridRow> {
  /** The raw cell value to display when not editing. */
  value: unknown;
  /** Whether this cell is currently in edit mode. */
  isEditing: boolean;
  /** The current uncommitted draft value controlled by the parent hook. */
  draft: string;
  /** Validation error message, or `null` when the draft is valid. */
  error: string | null;
  /** Column definition used for display formatting and keyboard type hints. */
  column: ColumnDef<T>;
  /** Called when the user taps the cell to begin editing. */
  onStartEdit: () => void;
  /** Called on every keystroke to update the draft value. */
  onChangeDraft: (value: string) => void;
  /** Called when the user confirms the edit (checkmark or return key). */
  onCommit: () => void;
  /** Called when the user cancels the edit. */
  onCancel: () => void;
}

/**
 * A grid cell that can be switched between a read-only display and an
 * inline text input.
 *
 * When `isEditing` is `true` the cell renders a `TextInput` pre-filled with
 * `draft`, flanked by confirm and cancel action buttons. Validation errors
 * are shown inline beneath the input so the user can correct them without
 * leaving the cell.
 */
export const InlineEditing = <T extends GridRow = GridRow>({
  value,
  isEditing,
  draft,
  error,
  column,
  onStartEdit,
  onChangeDraft,
  onCommit,
  onCancel,
}: InlineEditingProps<T>) => {
  const inputRef = useRef<TextInput>(null);

  // Auto-focus the input when we enter edit mode
  useEffect(() => {
    if (isEditing) {
      // Small delay to let the component settle before focusing
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isEditing]);

  if (!isEditing) {
    return (
      <TouchableOpacity
        onPress={column.editable ? onStartEdit : undefined}
        style={[styles.readView, column.editable && styles.readViewEditable]}
        activeOpacity={column.editable ? 0.6 : 1}
        accessibilityRole={column.editable ? 'button' : 'text'}
        accessibilityLabel={
          column.editable ? `Edit ${column.title}: ${displayValue(value)}` : undefined
        }
        accessibilityHint={column.editable ? 'Double tap to edit' : undefined}
      >
        <Text style={styles.readText} numberOfLines={1}>
          {displayValue(value)}
        </Text>
        {column.editable && <View style={styles.editIndicator} />}
      </TouchableOpacity>
    );
  }

  return (
    <View
      style={[styles.editContainer, error ? styles.editContainerError : styles.editContainerActive]}
    >
      <TextInput
        ref={inputRef}
        style={styles.editInput}
        value={draft}
        onChangeText={onChangeDraft}
        onSubmitEditing={onCommit}
        keyboardType={column.type === 'number' ? 'numeric' : 'default'}
        returnKeyType="done"
        blurOnSubmit={false}
        selectTextOnFocus
        autoCorrect={false}
      />

      <View style={styles.editActions}>
        <TouchableOpacity
          onPress={onCommit}
          style={[styles.actionBtn, styles.confirmBtn]}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Confirm edit"
        >
          <Check size={14} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onCancel}
          style={[styles.actionBtn, styles.cancelBtn]}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Cancel edit"
        >
          <X size={14} color="#fff" />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorRow}>
          <AlertCircle size={11} color="#EF4444" />
          <Text style={styles.errorText} numberOfLines={1}>
            {error}
          </Text>
        </View>
      )}
    </View>
  );
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function displayValue(value: unknown): string {
  if (value == null) return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  readView: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 40,
  },
  readViewEditable: {
    // Subtle visual hint that the cell is tappable
    backgroundColor: 'transparent',
  },
  readText: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  editIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#19c3e6',
    marginLeft: 4,
  },
  editContainer: {
    borderWidth: 1.5,
    borderRadius: 6,
    margin: 2,
    overflow: 'visible',
  },
  editContainerActive: {
    borderColor: '#19c3e6',
    backgroundColor: '#f0fbff',
  },
  editContainerError: {
    borderColor: '#EF4444',
    backgroundColor: '#FFF5F5',
  },
  editInput: {
    fontSize: 13,
    color: '#111827',
    paddingVertical: 6,
    paddingHorizontal: 8,
    paddingRight: 64, // make room for action buttons
    minHeight: 36,
  },
  editActions: {
    position: 'absolute',
    right: 4,
    top: 4,
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    width: 24,
    height: 24,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    backgroundColor: '#10B981',
  },
  cancelBtn: {
    backgroundColor: '#9CA3AF',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  errorText: {
    fontSize: 11,
    color: '#EF4444',
    flex: 1,
  },
});
