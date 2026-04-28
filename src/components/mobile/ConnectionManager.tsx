import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ListRenderItemInfo } from 'react-native';
import { useMemoryMonitor } from '../../hooks';

interface Connection {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface ConnectionManagerProps {
  connections: Connection[];
  onAddConnection?: () => void;
  onRemoveConnection?: (id: string) => void;
}

export const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  connections,
  onAddConnection,
  onRemoveConnection,
}) => {
  useMemoryMonitor({ componentId: 'ConnectionManager', itemCount: connections.length });

  const renderConnectionItem = ({ item }: ListRenderItemInfo<Connection>) => (
    <View style={styles.connectionItem}>
      <View style={styles.connectionInfo}>
        {/* Placeholder for Avatar */}
        <View style={styles.avatarPlaceholder}>
          <Text>{item.name.charAt(0)}</Text>
        </View>
        <Text style={styles.connectionName}>{item.name}</Text>
      </View>
      {onRemoveConnection && (
        <TouchableOpacity style={[styles.button, styles.removeButton]} onPress={() => onRemoveConnection(item.id)}>
          <Text style={styles.buttonText}>Remove</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Social Connections</Text>
        {onAddConnection && (
          <TouchableOpacity style={[styles.button, styles.addButton]} onPress={onAddConnection}>
            <Text style={styles.buttonText}>Add</Text>
          </TouchableOpacity>
        )}
      </View>
      {connections && connections.length > 0 ? (
        <FlatList
          data={connections}
          renderItem={renderConnectionItem}
          keyExtractor={(item) => item.id}
          style={styles.list}
        />
      ) : (
        <Text style={styles.noConnectionsText}>No connections yet.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    paddingHorizontal: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  list: {
    maxHeight: 200, // Limit height to make it scrollable if many connections
  },
  connectionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  connectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  connectionName: {
    fontSize: 16,
    color: '#333',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
  },
  addButton: {
    backgroundColor: '#28a745', // Green for add
  },
  removeButton: {
    backgroundColor: '#dc3545', // Red for remove
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  noConnectionsText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    marginTop: 20,
  },
});
