import { AlertCircle, Search, SlidersHorizontal } from 'lucide-react-native';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

import { FilterField, FilterSheet, FilterValues } from './FilterSheet';
import { SearchHistory } from './SearchHistory';
import { SearchResultCard, SearchResultItem } from './SearchResultCard';
import { VoiceSearch } from './VoiceSearch';
import { useAnalytics, useDynamicFontSize, useMemoryMonitor } from '../../hooks';
import { usePrefetchImages } from '../../hooks/usePrefetchImages';
import { useSearchIndex } from '../../hooks/useSearchIndex';
import { addToSearchHistory } from '../../utils/searchHistory';
import { AnalyticsEvent } from '../../utils/trackingEvents';
import { buildTrie } from '../../utils/trie';
import { validateSearchQuery } from '../../utils/validation';
import { AppText as Text } from '../common/AppText';
import { DelegatedKeyboardAvoidingView } from '../common/DelegatedKeyboardAvoidingView';

const DEFAULT_FILTERS: FilterField[] = [
  {
    key: 'category',
    label: 'Category',
    options: [
      { value: '', label: 'All' },
      { value: 'Mobile Development', label: 'Mobile Development' },
      { value: 'Web Development', label: 'Web Development' },
      { value: 'Design', label: 'Design' },
    ],
  },
  {
    key: 'level',
    label: 'Level',
    options: [
      { value: '', label: 'All' },
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
    ],
  },
];

// Static fallback keywords used until the index-derived suggestions are ready.
const FALLBACK_KEYWORDS = [
  'React Native',
  'Mobile Development',
  'Expo',
  'JavaScript',
  'TypeScript',
  'Web Development',
  'Design',
  'CSS',
  'HTML',
  'Node.js',
  'Python',
  'Machine Learning',
  'beginner',
  'intermediate',
  'advanced',
];

export interface MobileSearchProps {
  onResultPress?: (item: SearchResultItem) => void;
  placeholder?: string;
}

const SuggestionItem = memo(function SuggestionItem({
  suggestion,
  onPress,
}: {
  suggestion: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.suggestItem} onPress={onPress}>
      <Search size={16} color="#9CA3AF" />
      <Text style={styles.suggestText}>{suggestion}</Text>
    </TouchableOpacity>
  );
});

export const MobileSearch = ({
  onResultPress,
  placeholder = 'Search courses...',
}: MobileSearchProps) => {
  const [query, setQuery] = useState('');
  const [queryError, setQueryError] = useState<string | null>(null);
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const fontSizeScale = useDynamicFontSize() as { scale?: (value: number) => number };
  const scale =
    typeof fontSizeScale.scale === 'function' ? fontSizeScale.scale : (value: number) => value;
  const { trackEvent } = useAnalytics();

  const {
    search: indexSearch,
    results: indexedResults,
    debouncedQuery,
    suggestions: indexSuggestions,
    isReady: indexReady,
  } = useSearchIndex({ query, filters: filterValues });

  useMemoryMonitor({ componentId: 'MobileSearch', itemCount: results.length });

  const resultThumbnails = useMemo(
    () => results.map((r: SearchResultItem) => r.thumbnail ?? null),
    [results]
  );
  usePrefetchImages(resultThumbnails, { auto: true, limit: 10 });

  // Build Trie from index-derived suggestions (real course titles / words)
  // falling back to static keywords until the index is ready.
  const suggestionTrie = useMemo(() => {
    const words = indexReady && indexSuggestions.length > 0 ? indexSuggestions : FALLBACK_KEYWORDS;
    return buildTrie(words);
  }, [indexReady, indexSuggestions]);

  const suggestions = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) return suggestionTrie.autocomplete('', 5);
    return suggestionTrie.autocomplete(q, 6);
  }, [debouncedQuery, suggestionTrie]);

  const performSearch = useCallback(
    (searchQuery: string) => {
      const validation = validateSearchQuery(searchQuery);
      if (!validation.valid) {
        setQueryError(validation.message ?? 'Invalid search query.');
        setResults([]);
        setHasSearched(false);
        return;
      }
      setQueryError(null);
      const trimmed = searchQuery.trim();
      addToSearchHistory(trimmed);
      trackEvent(AnalyticsEvent.SEARCH_QUERY, {
        query: trimmed,
        filters: JSON.stringify(filterValues),
      });

      const found = indexSearch(trimmed, filterValues);
      setResults(found);
      setHasSearched(true);
      setSuggestionsVisible(false);
    },
    [filterValues, trackEvent, indexSearch]
  );

  const handleResultPress = useCallback(
    (item: SearchResultItem) => onResultPress?.(item),
    [onResultPress]
  );

  React.useEffect(() => {
    const trimmed = debouncedQuery.trim();

    if (trimmed) {
      const validation = validateSearchQuery(trimmed);
      if (!validation.valid) {
        setQueryError(validation.message ?? 'Invalid search query.');
        setResults([]);
        setHasSearched(false);
        return;
      }

      setQueryError(null);
      addToSearchHistory(trimmed);
      trackEvent(AnalyticsEvent.SEARCH_QUERY, {
        query: trimmed,
        filters: JSON.stringify(filterValues),
      });
      setResults(indexedResults);
      setHasSearched(true);
      setSuggestionsVisible(false);
    } else {
      setResults((prev: SearchResultItem[]) => (prev.length === 0 ? prev : []));
      setHasSearched((prev: boolean) => (prev ? false : prev));
    }
  }, [debouncedQuery, filterValues, indexedResults, trackEvent]);

  const handleSubmit = useCallback(() => performSearch(query), [query, performSearch]);

  const handleSelectSuggestion = useCallback(
    (text: string) => {
      setQuery(text);
      performSearch(text);
    },
    [performSearch]
  );

  const handleHistorySelect = useCallback(
    (text: string) => {
      setQuery(text);
      performSearch(text);
    },
    [performSearch]
  );

  const handleVoiceResult = useCallback(
    (text: string) => {
      setQuery(text);
      performSearch(text);
    },
    [performSearch]
  );

  const handleApplyFilters = useCallback((values: FilterValues) => {
    setFilterValues(values);
    setFilterSheetVisible(false);
  }, []);

  const getSearchItemLayout = useCallback(
    (_data: SearchResultItem[] | null | undefined, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  const showSuggestions = suggestionsVisible && query.length > 0;
  const showHistory = suggestionsVisible && !query.trim();
  const showResults = hasSearched;

  return (
    <DelegatedKeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.searchRow}>
        <View style={styles.inputWrap}>
          <Search size={scale(20)} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={[styles.input, { fontSize: scale(16) }]}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={(text: string) => {
              setQuery(text);
              setQueryError(null);
            }}
            onFocus={() => setSuggestionsVisible(true)}
            onBlur={() => setTimeout(() => setSuggestionsVisible(false), 180)}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
          />
          <VoiceSearch compact onTranscript={setQuery} onTranscriptFinal={handleVoiceResult} />
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => setFilterSheetVisible(true)}
            style={[
              styles.filterBtn,
              Object.keys(filterValues).length > 0 && styles.filterBtnActive,
            ]}
          >
            <SlidersHorizontal
              size={scale(20)}
              color={Object.keys(filterValues).length > 0 ? '#fff' : '#6B7280'}
            />
          </TouchableOpacity>
        </View>
      </View>

      {queryError && (
        <View style={styles.queryErrorRow}>
          <AlertCircle size={scale(14)} color="#ef4444" />
          <Text style={[styles.queryErrorText, { fontSize: scale(13) }]}>{queryError}</Text>
        </View>
      )}

      {showHistory && (
        <View style={styles.suggestSection}>
          <SearchHistory onSelectQuery={handleHistorySelect} />
        </View>
      )}

      {showSuggestions && !showResults && suggestions.length > 0 && (
        <View style={styles.suggestSection}>
          <Text style={styles.suggestLabel}>Suggestions</Text>
          {suggestions.map((s: string) => (
            <SuggestionItem key={s} suggestion={s} onPress={() => handleSelectSuggestion(s)} />
          ))}
        </View>
      )}

      {showResults && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsLabel}>
            {results.length === 0
              ? 'No results'
              : `${results.length} result${results.length === 1 ? '' : 's'}`}
          </Text>
          <FlatList<SearchResultItem>
            data={results}
            keyExtractor={(item: SearchResultItem) => item.id}
            renderItem={({ item }: { item: SearchResultItem }) => (
              <SearchResultCard item={item} onPress={() => handleResultPress(item)} />
            )}
            removeClippedSubviews
            contentContainerStyle={styles.resultsList}
            getItemLayout={getSearchItemLayout}
            ListEmptyComponent={
              <Text style={styles.emptyText}>Try a different query or adjust filters.</Text>
            }
          />
        </View>
      )}

      <FilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        filters={DEFAULT_FILTERS}
        values={filterValues}
        onApply={handleApplyFilters}
        onReset={() => setFilterValues({})}
      />
    </DelegatedKeyboardAvoidingView>
  );
};

/** Estimated height of each SearchResultCard item for optimal FlatList virtualization */
const ITEM_HEIGHT = 120;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingLeft: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingVertical: 12,
    paddingRight: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#19c3e6',
  },
  suggestSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#fff',
  },
  suggestLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  suggestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  suggestText: {
    fontSize: 15,
    color: '#111827',
  },
  resultsSection: {
    flex: 1,
    paddingTop: 16,
  },
  resultsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  resultsList: {
    paddingBottom: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  queryErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fee2e2',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#fca5a5',
  },
  queryErrorText: {
    color: '#dc2626',
    flex: 1,
    fontWeight: '500',
  },
});
