import { BookOpen, Clock, Users } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface TopicFeedItem {
  id: string;
  title: string;
  description?: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration?: number; // minutes
  enrolledCount?: number;
  instructor: { name: string };
}

export interface TopicFeedCardProps {
  item: TopicFeedItem;
  onPress: (item: TopicFeedItem) => void;
}

const LEVEL_COLORS: Record<TopicFeedItem['level'], string> = {
  beginner: '#10B981',
  intermediate: '#F59E0B',
  advanced: '#EF4444',
};

export const TopicFeedCard = ({ item, onPress }: TopicFeedCardProps) => {
  const a11yLabel = [item.title, item.category, item.level, item.instructor.name]
    .filter(Boolean)
    .join(', ');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(item)}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint="Opens topic details"
    >
      <View style={styles.iconWrap}>
        <BookOpen size={22} color="#19c3e6" />
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>

        {item.description ? (
          <Text style={styles.description} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View style={styles.metaRow}>
          <View style={[styles.levelBadge, { backgroundColor: LEVEL_COLORS[item.level] + '20' }]}>
            <Text style={[styles.levelText, { color: LEVEL_COLORS[item.level] }]}>
              {item.level}
            </Text>
          </View>

          <Text style={styles.category}>{item.category}</Text>

          {item.duration != null && item.duration > 0 && (
            <View style={styles.metaItem}>
              <Clock size={11} color="#9CA3AF" />
              <Text style={styles.metaText}>{item.duration}m</Text>
            </View>
          )}

          {item.enrolledCount != null && item.enrolledCount > 0 && (
            <View style={styles.metaItem}>
              <Users size={11} color="#9CA3AF" />
              <Text style={styles.metaText}>{item.enrolledCount.toLocaleString()}</Text>
            </View>
          )}
        </View>

        <Text style={styles.instructor} numberOfLines={1}>
          {item.instructor.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#E0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
    lineHeight: 20,
  },
  description: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  category: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  instructor: {
    fontSize: 12,
    color: '#9CA3AF',
  },
});
