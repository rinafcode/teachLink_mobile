import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';

import { AccessibleModal } from './AccessibleModal';
import {
  useConflictStore,
  useActiveConflict,
  useConflictModalVisible,
  useIsResolvingConflict,
  type ConflictResolutionChoice,
} from '../../store/conflictStore';

interface DiffLine {
  key: string;
  localValue: string;
  serverValue: string;
  isDifferent: boolean;
}

/**
 * Formats a value for display in the diff view
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

/**
 * Flattens a nested object into dot-notation keys
 */
function flattenObject(obj: unknown, prefix = ''): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return { [prefix || 'value']: obj };
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      const key = prefix ? `${prefix}[${index}]` : `[${index}]`;
      Object.assign(result, flattenObject(item, key));
    });
    return result;
  }

  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Computes diff lines between local and server data
 */
function computeDiffLines(localData: unknown, serverData: unknown): DiffLine[] {
  const localFlat = flattenObject(localData);
  const serverFlat = flattenObject(serverData);
  const allKeys = new Set([...Object.keys(localFlat), ...Object.keys(serverFlat)]);

  const lines: DiffLine[] = [];
  for (const key of Array.from(allKeys).sort()) {
    const localValue = formatValue(localFlat[key]);
    const serverValue = formatValue(serverFlat[key]);
    lines.push({
      key,
      localValue,
      serverValue,
      isDifferent: localValue !== serverValue,
    });
  }

  return lines;
}

/**
 * Formats entity type for display
 */
function formatEntityType(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
}

/**
 * Formats timestamp for display
 */
function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString();
}

interface ConflictResolutionModalProps {
  /** Whether to use portal rendering (default: true) */
  usePortal?: boolean;
}

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  usePortal = true,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const isVisible = useConflictModalVisible();
  const activeConflict = useActiveConflict();
  const isResolving = useIsResolvingConflict();
  const { resolveConflict, hideModal, getPendingCount } = useConflictStore();

  const [selectedTab, setSelectedTab] = useState<'diff' | 'local' | 'server'>('diff');

  const diffLines = useMemo(() => {
    if (!activeConflict) return [];
    return computeDiffLines(activeConflict.localData, activeConflict.serverData);
  }, [activeConflict]);

  const handleResolve = useCallback(
    async (choice: ConflictResolutionChoice) => {
      if (!activeConflict || isResolving) return;
      try {
        await resolveConflict(activeConflict.id, choice);
      } catch {
        // Error is logged in store
      }
    },
    [activeConflict, isResolving, resolveConflict]
  );

  const handleClose = useCallback(() => {
    if (!isResolving) {
      hideModal();
    }
  }, [hideModal, isResolving]);

  const pendingCount = getPendingCount();

  const styles = createStyles(isDark);

  if (!activeConflict) {
    return null;
  }

  return (
    <AccessibleModal
      visible={isVisible}
      onClose={handleClose}
      accessibilityLabel="Conflict Resolution"
      usePortal={usePortal}
      containerStyle={styles.modalContainer}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Sync Conflict Detected</Text>
        {pendingCount > 1 && <Text style={styles.badge}>{pendingCount} conflicts</Text>}
      </View>

      <Text style={styles.subtitle}>
        Your changes to this {formatEntityType(activeConflict.entityType)} conflict with newer data
        on the server.
      </Text>

      <View style={styles.metaContainer}>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Entity:</Text>
          <Text style={styles.metaValue}>{formatEntityType(activeConflict.entityType)}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Your version:</Text>
          <Text style={styles.metaValue}>{activeConflict.localVersion ?? 'Unknown'}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Server version:</Text>
          <Text style={styles.metaValue}>{activeConflict.serverVersion ?? 'Unknown'}</Text>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.metaLabel}>Your edit:</Text>
          <Text style={styles.metaValue}>{formatTimestamp(activeConflict.clientTimestamp)}</Text>
        </View>
      </View>

      {/* Tab selector */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, selectedTab === 'diff' && styles.tabActive]}
          onPress={() => setSelectedTab('diff')}
          accessibilityRole="tab"
          accessibilityState={{ selected: selectedTab === 'diff' }}
        >
          <Text style={[styles.tabText, selectedTab === 'diff' && styles.tabTextActive]}>
            Differences
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, selectedTab === 'local' && styles.tabActive]}
          onPress={() => setSelectedTab('local')}
          accessibilityRole="tab"
          accessibilityState={{ selected: selectedTab === 'local' }}
        >
          <Text style={[styles.tabText, selectedTab === 'local' && styles.tabTextActive]}>
            Your Version
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, selectedTab === 'server' && styles.tabActive]}
          onPress={() => setSelectedTab('server')}
          accessibilityRole="tab"
          accessibilityState={{ selected: selectedTab === 'server' }}
        >
          <Text style={[styles.tabText, selectedTab === 'server' && styles.tabTextActive]}>
            Server Version
          </Text>
        </Pressable>
      </View>

      {/* Content area */}
      <ScrollView style={styles.contentContainer} nestedScrollEnabled>
        {selectedTab === 'diff' && (
          <View style={styles.diffContainer}>
            {diffLines.length === 0 ? (
              <Text style={styles.emptyText}>No data to compare</Text>
            ) : (
              diffLines.map((line, index) => (
                <View
                  key={line.key}
                  style={[
                    styles.diffRow,
                    line.isDifferent && styles.diffRowChanged,
                    index % 2 === 0 && styles.diffRowEven,
                  ]}
                >
                  <Text style={styles.diffKey} numberOfLines={1}>
                    {line.key}
                  </Text>
                  <View style={styles.diffValues}>
                    <View style={[styles.diffValue, styles.diffValueLocal]}>
                      <Text style={styles.diffLabel}>Yours:</Text>
                      <Text
                        style={[styles.diffText, line.isDifferent && styles.diffTextLocal]}
                        numberOfLines={3}
                      >
                        {line.localValue}
                      </Text>
                    </View>
                    <View style={[styles.diffValue, styles.diffValueServer]}>
                      <Text style={styles.diffLabel}>Server:</Text>
                      <Text
                        style={[styles.diffText, line.isDifferent && styles.diffTextServer]}
                        numberOfLines={3}
                      >
                        {line.serverValue}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {selectedTab === 'local' && (
          <View style={styles.jsonContainer}>
            <Text style={styles.jsonText}>{formatValue(activeConflict.localData)}</Text>
          </View>
        )}

        {selectedTab === 'server' && (
          <View style={styles.jsonContainer}>
            <Text style={styles.jsonText}>{formatValue(activeConflict.serverData)}</Text>
          </View>
        )}
      </ScrollView>

      {/* Action buttons */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={[styles.button, styles.buttonLocal]}
          onPress={() => handleResolve('local')}
          disabled={isResolving}
          accessibilityRole="button"
          accessibilityLabel="Keep your changes"
          accessibilityHint="Overwrite server data with your local changes"
        >
          {isResolving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.buttonText}>Keep Mine</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.button, styles.buttonServer]}
          onPress={() => handleResolve('server')}
          disabled={isResolving}
          accessibilityRole="button"
          accessibilityLabel="Use server version"
          accessibilityHint="Discard your changes and use the server version"
        >
          <Text style={styles.buttonText}>Use Server</Text>
        </Pressable>
      </View>

      <Text style={styles.helpText}>
        Choose which version to keep. &quot;Keep Mine&quot; will upload your version to the server.
        &quot;Use Server&quot; will discard your local changes.
      </Text>
    </AccessibleModal>
  );
};

const createStyles = (isDark: boolean) =>
  StyleSheet.create({
    modalContainer: {
      maxWidth: 500,
      width: '95%',
      maxHeight: '90%',
      backgroundColor: isDark ? '#1a1a1a' : '#ffffff',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    title: {
      fontSize: 20,
      fontWeight: '700',
      color: isDark ? '#ffffff' : '#11181C',
    },
    badge: {
      fontSize: 12,
      fontWeight: '600',
      color: '#ffffff',
      backgroundColor: '#e53935',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 12,
      overflow: 'hidden',
    },
    subtitle: {
      fontSize: 14,
      color: isDark ? '#9BA1A6' : '#687076',
      marginBottom: 16,
      lineHeight: 20,
    },
    metaContainer: {
      backgroundColor: isDark ? '#252525' : '#f5f5f5',
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    metaLabel: {
      fontSize: 12,
      color: isDark ? '#9BA1A6' : '#687076',
    },
    metaValue: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#11181C',
    },
    tabContainer: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: isDark ? '#333' : '#e0e0e0',
      marginBottom: 12,
    },
    tab: {
      flex: 1,
      paddingVertical: 10,
      alignItems: 'center',
    },
    tabActive: {
      borderBottomWidth: 2,
      borderBottomColor: '#0a7ea4',
    },
    tabText: {
      fontSize: 13,
      fontWeight: '500',
      color: isDark ? '#9BA1A6' : '#687076',
    },
    tabTextActive: {
      color: '#0a7ea4',
      fontWeight: '600',
    },
    contentContainer: {
      maxHeight: 250,
      marginBottom: 16,
    },
    diffContainer: {
      gap: 8,
    },
    diffRow: {
      borderRadius: 6,
      padding: 10,
      backgroundColor: isDark ? '#252525' : '#fafafa',
    },
    diffRowEven: {
      backgroundColor: isDark ? '#1f1f1f' : '#f5f5f5',
    },
    diffRowChanged: {
      borderLeftWidth: 3,
      borderLeftColor: '#ff9800',
    },
    diffKey: {
      fontSize: 12,
      fontWeight: '600',
      color: isDark ? '#ffffff' : '#11181C',
      marginBottom: 6,
    },
    diffValues: {
      flexDirection: 'row',
      gap: 8,
    },
    diffValue: {
      flex: 1,
      padding: 6,
      borderRadius: 4,
    },
    diffValueLocal: {
      backgroundColor: isDark ? 'rgba(76, 175, 80, 0.15)' : 'rgba(76, 175, 80, 0.1)',
    },
    diffValueServer: {
      backgroundColor: isDark ? 'rgba(33, 150, 243, 0.15)' : 'rgba(33, 150, 243, 0.1)',
    },
    diffLabel: {
      fontSize: 10,
      fontWeight: '600',
      color: isDark ? '#9BA1A6' : '#687076',
      marginBottom: 2,
    },
    diffText: {
      fontSize: 12,
      color: isDark ? '#ffffff' : '#11181C',
    },
    diffTextLocal: {
      color: '#4caf50',
    },
    diffTextServer: {
      color: '#2196f3',
    },
    emptyText: {
      fontSize: 14,
      color: isDark ? '#9BA1A6' : '#687076',
      textAlign: 'center',
      padding: 20,
    },
    jsonContainer: {
      backgroundColor: isDark ? '#252525' : '#f5f5f5',
      borderRadius: 8,
      padding: 12,
    },
    jsonText: {
      fontSize: 12,
      fontFamily: 'monospace',
      color: isDark ? '#ffffff' : '#11181C',
    },
    buttonContainer: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    button: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonLocal: {
      backgroundColor: '#4caf50',
    },
    buttonServer: {
      backgroundColor: '#2196f3',
    },
    buttonText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#ffffff',
    },
    helpText: {
      fontSize: 12,
      color: isDark ? '#9BA1A6' : '#687076',
      textAlign: 'center',
      lineHeight: 18,
    },
  });

export default ConflictResolutionModal;
