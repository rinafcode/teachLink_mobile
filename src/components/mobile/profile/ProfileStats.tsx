import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BookOpen, Users, Trophy, Clock } from 'lucide-react-native';

interface Props {
  stats: any;
  unlockedCount: number;
  isDark?: boolean;
}

export const ProfileStats = React.memo(({ stats, unlockedCount, isDark }: Props) => {
  const borderColor = isDark ? '#334155' : '#e2e8f0';
  const textPrimary = isDark ? '#f1f5f9' : '#1e293b';
  const textSecondary = isDark ? '#94a3b8' : '#64748b';

  const stripItems = [
    { icon: <BookOpen size={16} color="#19c3e6" />, value: stats.coursesCompleted, label: 'Done' },
    { icon: <Users size={16} color="#2c8aec" />, value: stats.connections, label: 'Network' },
    { icon: <Trophy size={16} color="#586ce9" />, value: unlockedCount, label: 'Badges' },
    { icon: <Clock size={16} color="#7c3aed" />, value: `${stats.totalHours}h`, label: 'Learning' },
  ];

  return (
    <View style={[styles.statsStrip, { borderColor }]}>
      {stripItems.map((s, i) => (
        <View key={s.label} style={[styles.statCell, i < stripItems.length - 1 && { borderRightWidth: 1, borderRightColor: borderColor }]}>
          {s.icon}
          <Text style={[styles.statCellValue, { color: textPrimary }]}>{s.value}</Text>
          <Text style={[styles.statCellLabel, { color: textSecondary }]}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
});

ProfileStats.displayName = 'ProfileStats';
