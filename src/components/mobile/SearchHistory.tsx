import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { Clock, Trash2 } from 'lucide-react-native';
import {
  getSearchHistory,
  clearSearchHistory,
  removeFromSearchHistory,
  SearchHistoryItem,
} from '../../utils/searchHistory';

export interface SearchHistoryProps {
  onSelectQuery: (query: string) => void;
  maxItems?: number;
}

export function SearchHistory({ onSelectQuery, maxItems = 10 }: SearchHistoryProps) {
  const [items, setItems] = useState<SearchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    const history = await getSearchHistory();
    setItems(history.slice(0, maxItems));
    setLoading(false);
  }, [maxItems]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleClear = useCallback(async () => {
    await clearSearchHistory();
    setItems([]);
  }, []);

  const handleRemove = useCallback(async (query: string) => {
    await removeFromSearchHistory(query);
    setItems((prev) => prev.filter((item) => item.query !== query));
  }, []);

  const handleSelect = useCallback(
    (query: string) => {
      onSelectQuery(query);
    },
    [onSelectQuery]
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Clock size={18} color="#6B7280" />
            <Text style={styles.title}>Recent searches</Text>
          </View>
        </View>
        <ActivityIndicator size="small" color="#19c3e6" style={styles.loader} />
      </View>
    );
  }

  if (items.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Clock size={18} color="#6B7280" />
          <Text style={styles.title}>Recent searches</Text>
        </View>
        <TouchableOpacity onPress={handleClear} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.clearText}>Clear all</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.query}-${item.timestamp}`}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.itemTouch}
              onPress={() => handleSelect(item.query)}
              activeOpacity={0.7}
            >
              <Text style={styles.query} numberOfLines={1}>
                {item.query}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleRemove(item.query)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={styles.removeBtn}
            >
              <Trash2 size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  clearText: {
    fontSize: 13,
    color: '#19c3e6',
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  itemTouch: {
    flex: 1,
  },
  query: {
    fontSize: 15,
    color: '#111827',
  },
  removeBtn: {
    padding: 4,
  },
  loader: {
    marginVertical: 16,
  },
});
