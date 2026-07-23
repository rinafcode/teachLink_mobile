import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { AppText } from '../../components/common/AppText';

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export const NotificationsScreen = React.memo(() => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setError(null);
      // Replace with actual API call when available
      // const data = await api.getNotifications();
      setNotifications([]);
    } catch (err) {
      setError('Failed to load notifications.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
  }, [fetchNotifications]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="small" color="#19c3e6" />
        <Text style={styles.loadingText}>Loading notifications…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (notifications.length === 0) {
    return (
      <View style={styles.centered}>
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#19c3e6"
          colors={['#19c3e6']}
        />
        <Text style={styles.emptyText}>No notifications yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.listContainer}>
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#19c3e6"
          colors={['#19c3e6']}
        />
        {notifications.map(item => (
          <View key={item.id} style={[styles.card, !item.read && styles.cardUnread]}>
            <AppText style={styles.cardTitle} numberOfLines={1}>
              {item.title}
            </AppText>
            <AppText style={styles.cardBody} numberOfLines={2}>
              {item.body}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
});

NotificationsScreen.displayName = 'NotificationsScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f1f5',
  },
  listContainer: {
    paddingTop: 8,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f0f1f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  errorText: {
    fontSize: 14,
    color: '#dc2626',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: '#19c3e6',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
});
