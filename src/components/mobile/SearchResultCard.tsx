import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BookOpen, Clock } from 'lucide-react-native';

export interface SearchResultItem {
  id: string;
  title: string;
  description?: string;
  subtitle?: string;
  meta?: string;
  duration?: number;
  category?: string;
  level?: string;
  thumbnail?: string;
}

export interface SearchResultCardProps {
  item: SearchResultItem;
  onPress: () => void;
}

export function SearchResultCard({ item, onPress }: SearchResultCardProps) {
  const metaParts = [item.category, item.level].filter(Boolean);
  const metaText = metaParts.join(' · ');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrap}>
        <BookOpen size={24} color="#19c3e6" />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {(item.description || item.subtitle) && (
          <Text style={styles.description} numberOfLines={2}>
            {item.description || item.subtitle}
          </Text>
        )}
        <View style={styles.metaRow}>
          {metaText ? <Text style={styles.meta}>{metaText}</Text> : null}
          {item.duration != null && item.duration > 0 && (
            <View style={styles.durationWrap}>
              <Clock size={12} color="#6B7280" />
              <Text style={styles.duration}>{item.duration} min</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  meta: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  durationWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  duration: {
    fontSize: 12,
    color: '#6B7280',
  },
});
