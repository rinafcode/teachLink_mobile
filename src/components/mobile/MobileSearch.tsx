import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { VoiceSearch } from './VoiceSearch';
import { SearchHistory } from './SearchHistory';
import { FilterSheet, FilterField, FilterValues } from './FilterSheet';
import { SearchResultCard, SearchResultItem } from './SearchResultCard';
import { addToSearchHistory } from '../../utils/searchHistory';
import { sampleCourse } from '../../data/sampleCourse';
import { Course } from '../../types/course';

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

const SUGGESTION_KEYWORDS = [
  'React Native',
  'Mobile Development',
  'Expo',
  'JavaScript',
  'beginner',
];

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

export interface MobileSearchProps {
  onResultPress?: (item: SearchResultItem) => void;
  placeholder?: string;
}

export function MobileSearch({
  onResultPress,
  placeholder = 'Search courses...',
}: MobileSearchProps) {
  const [query, setQuery] = useState('');
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SUGGESTION_KEYWORDS.slice(0, 5);
    return SUGGESTION_KEYWORDS.filter(
      (s) => s.toLowerCase().includes(q) || q.includes(s.toLowerCase())
    ).slice(0, 6);
  }, [query]);

  const performSearch = useCallback(
    (searchQuery: string) => {
      const trimmed = searchQuery.trim();
      if (!trimmed) {
        setResults([]);
        setHasSearched(true);
        return;
      }
      addToSearchHistory(trimmed);
      const filtered = filterCourse(sampleCourse, trimmed, filterValues)
        ? [courseToSearchResult(sampleCourse)]
        : [];
      setResults(filtered);
      setHasSearched(true);
      setSuggestionsVisible(false);
    },
    [filterValues]
  );

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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.searchRow}>
        <View style={styles.inputWrap}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            onFocus={() => setSuggestionsVisible(true)}
            onBlur={() => setTimeout(() => setSuggestionsVisible(false), 180)}
            onSubmitEditing={handleSubmit}
            returnKeyType="search"
          />
        </View>
        <View style={styles.actions}>
          <VoiceSearch
            onTranscript={setQuery}
            onTranscriptFinal={handleVoiceResult}
          />
          <TouchableOpacity
            onPress={() => setFilterSheetVisible(true)}
            style={[styles.filterBtn, Object.keys(filterValues).length > 0 && styles.filterBtnActive]}
          >
            <SlidersHorizontal size={20} color={Object.keys(filterValues).length > 0 ? '#fff' : '#6B7280'} />
          </TouchableOpacity>
        </View>
      </View>

      {showHistory && (
        <View style={styles.suggestSection}>
          <SearchHistory onSelectQuery={handleHistorySelect} />
        </View>
      )}

      {showSuggestions && query.length > 0 && suggestions.length > 0 && !showResults && (
        <View style={styles.suggestSection}>
          <Text style={styles.suggestLabel}>Suggestions</Text>
          {suggestions.map((s) => (
            <TouchableOpacity
              key={s}
              style={styles.suggestItem}
              onPress={() => handleSelectSuggestion(s)}
            >
              <Search size={16} color="#9CA3AF" />
              <Text style={styles.suggestText}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {showResults && (
        <View style={styles.resultsSection}>
          <Text style={styles.resultsLabel}>
            {results.length === 0 ? 'No results' : `${results.length} result${results.length === 1 ? '' : 's'}`}
          </Text>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <SearchResultCard
                item={item}
                onPress={() => onResultPress?.(item)}
              />
            )}
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
    </KeyboardAvoidingView>
  );
}

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
});
