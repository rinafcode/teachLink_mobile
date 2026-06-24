import { AlertCircle, Search, SlidersHorizontal } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
    FlatList,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

import { sampleCourse } from '../../data/sampleCourse';
import { useAnalytics, useDebounce, useDynamicFontSize, useMemoryMonitor } from '../../hooks';
import { Course } from '../../types/course';
import { addToSearchHistory } from '../../utils/searchHistory';
import { AnalyticsEvent } from '../../utils/trackingEvents';
import { buildTrie, Trie } from '../../utils/trie';
import { validateSearchQuery } from '../../utils/validation';
import { AppText as Text } from '../common/AppText';
import { FilterField, FilterSheet, FilterValues } from './FilterSheet';
import { SearchHistory } from './SearchHistory';
import { SearchResultCard, SearchResultItem } from './SearchResultCard';
import { VoiceSearch } from './VoiceSearch';

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

/**
 * Seed keywords for the suggestion Trie.
 * In production these would be populated from course titles, categories, etc.
 */
const SUGGESTION_KEYWORDS = [
  'React Native',
  'Mobile Development',
  'Expo',
  'JavaScript',
  'beginner',
  'Web Development',
  'Design',
  'intermediate',
  'advanced',
  'TypeScript',
  'CSS',
  'HTML',
  'Node.js',
  'Python',
  'Machine Learning',
];

/** Module-level Trie built once from the seed keywords (O(k) per word). */
const suggestionTrie: Trie = (() => {
  const trie = buildTrie(SUGGESTION_KEYWORDS) as Trie | { autocomplete?: unknown };
  if (typeof trie.autocomplete === 'function') {
    return trie as Trie;
  }

  return {
    autocomplete: () => [],
    insert: () => undefined,
    insertMany: () => undefined,
    search: () => false,
    startsWith: () => false,
    clear: () => undefined,
    get wordCount() {
      return 0;
    },
  } as Trie;
})();

function courseToSearchResult(course: Course): SearchResultItem {
  return {
    id: course.id,
    title: course.title,
    description: course.description,
    category: course.category,
    level: course.level,
    duration: course.totalDuration,
  };
}

function filterCourse(course: Course, query: string, filters: FilterValues): boolean {
  const q = query.trim().toLowerCase();
  if (q) {
    const match =
      course.title.toLowerCase().includes(q) ||
      course.description.toLowerCase().includes(q) ||
      course.category.toLowerCase().includes(q);
    if (!match) return false;
  }
  if (filters.category && course.category !== filters.category) return false;
  if (filters.level && course.level !== filters.level) return false;
  return true;
}

/**
 * Props for the MobileSearch component
 */
export interface MobileSearchProps {
  /** Callback when a search result is pressed */
  onResultPress?: (item: SearchResultItem) => void;
  /** Placeholder text for the search input */
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
  const [isSearching, setIsSearching] = useState(false);
  const searchAbortRef = React.useRef<AbortController | null>(null);
  const fontSizeScale = useDynamicFontSize() as { scale?: (value: number) => number };
  const scale =
    typeof fontSizeScale.scale === 'function' ? fontSizeScale.scale : (value: number) => value;
  const { trackEvent } = useAnalytics();

  useMemoryMonitor({ componentId: 'MobileSearch', itemCount: results.length });

  const debouncedQuery = useDebounce(query, 300);

  /**
   * Trie-based autocomplete — O(k + n), typically <1 ms for 10 000+ items.
   * Falls back to top-5 suggestions when the query is empty.
   */
  const suggestions = useMemo(() => {
    const q = debouncedQuery.trim();
    if (typeof suggestionTrie.autocomplete !== 'function') return [];
    if (!q) return suggestionTrie.autocomplete('', 5);
    return suggestionTrie.autocomplete(q, 6);
  }, [debouncedQuery]);

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
      trackEvent(AnalyticsEvent.SEARCH_QUERY, { query: trimmed, filters: filterValues });
      const filtered = filterCourse(sampleCourse, trimmed, filterValues)
        ? [courseToSearchResult(sampleCourse)]
        : [];
      setResults(filtered);
      setHasSearched(true);
      setSuggestionsVisible(false);
    },
    [filterValues, trackEvent]
  );

  const handleResultPress = useCallback(
    (item: SearchResultItem) => onResultPress?.(item),
    [onResultPress]
  );

  React.useEffect(() => {
    const trimmed = debouncedQuery.trim();

    // cancel any in-flight search work (network requests in real implementation)
    searchAbortRef.current?.abort();
    searchAbortRef.current = null;

    if (trimmed) {
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setIsSearching(true);

      // performSearch is currently synchronous/local (sampleCourse),
      // but we keep the cancellation pattern to prevent rapid re-renders.
      try {
        if (!controller.signal.aborted) {
          performSearch(trimmed);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsSearching(false);
        }
      }
    } else {
      setIsSearching(false);
      setResults((prev: SearchResultItem[]) => (prev.length === 0 ? prev : []));
      setHasSearched((prev: boolean) => (prev ? false : prev));
    }
  }, [debouncedQuery, performSearch]);

  const handleSubmit = useCallback(() => {
    performSearch(query);
  }, [query, performSearch]);

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

      {showSuggestions && query.length > 0 && suggestions.length > 0 && !showResults && (
        <View style={styles.suggestSection}>
          <Text style={styles.suggestLabel}>Suggestions</Text>
          {suggestions.map(s => (
            <SuggestionItem key={s} suggestion={s} onPress={() => handleSelectSuggestion(s)} />
          {suggestions.map((s: string) => (
            <TouchableOpacity
              key={s}
              style={styles.suggestItem}
              onPress={() => handleSelectSuggestion(s)}
            >
              <Search size={scale(16)} color="#9CA3AF" />
              <Text style={styles.suggestText}>{s}</Text>
            </TouchableOpacity>
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
          <FlatList
            data={results}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <SearchResultCard item={item} onPress={() => handleResultPress(item)} />
            renderItem={({ item }: { item: SearchResultItem }) => (
              <SearchResultCard item={item} onPress={() => onResultPress?.(item)} />
            )}
            removeClippedSubviews
            contentContainerStyle={styles.resultsList}
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
