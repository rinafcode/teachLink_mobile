import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = '@teachlink_search_history';
const MAX_HISTORY_ITEMS = 20;

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

/**
 * Get recent search queries (newest first).
 */
export async function getSearchHistory(): Promise<SearchHistoryItem[]> {
  try {
    const raw = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SearchHistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Add a query to history. Deduplicates and keeps only MAX_HISTORY_ITEMS.
 */
export async function addToSearchHistory(query: string): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;
  try {
    let items = await getSearchHistory();
    items = items.filter((item) => item.query.toLowerCase() !== trimmed.toLowerCase());
    items.unshift({ query: trimmed, timestamp: Date.now() });
    items = items.slice(0, MAX_HISTORY_ITEMS);
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/**
 * Remove a single entry from history (by exact query).
 */
export async function removeFromSearchHistory(query: string): Promise<void> {
  try {
    const items = (await getSearchHistory()).filter(
      (item) => item.query.toLowerCase() !== query.toLowerCase()
    );
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

/**
 * Clear all search history.
 */
export async function clearSearchHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
  } catch {
    // ignore
  }
}
