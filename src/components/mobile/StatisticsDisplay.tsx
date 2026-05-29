import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Statistic {
  label: string;
  value: string | number;
}

interface StatisticsDisplayProps {
  statistics: Statistic[];
}

export const StatisticsDisplay: React.FC<StatisticsDisplayProps> = ({ statistics }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Learning Statistics</Text>
      {statistics && statistics.length > 0 ? (
        <View style={styles.statsGrid}>
          {statistics.map((stat, index) => (
            <View key={`stat-${index}-${stat.label}`} style={styles.statItem}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.noStatsText}>No statistics available.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    paddingHorizontal: 15,
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    paddingVertical: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%', // Two items per row with some spacing
    marginBottom: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  statLabel: {
    fontSize: 14,
    color: '#555',
    marginTop: 5,
  },
  noStatsText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
  },
});
