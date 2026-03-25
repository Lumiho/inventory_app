import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { loadInventories, deleteInventory } from '../utils/storage';
import { exportAllInventories } from '../utils/excel';

const HomeScreen = ({ navigation }) => {
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    const data = await loadInventories();
    setInventories(data);
    setLoading(false);
  };

  const handleNewInventory = () => {
    navigation.navigate('Naming');
  };

  const handleInventoryPress = (inventory) => {
    navigation.navigate('Detail', { inventory });
  };

  const handleInventoryLongPress = (inventory) => {
    Alert.alert(
      'Delete Inventory',
      `Are you sure you want to delete "${inventory.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteInventory(inventory.id);
            loadData();
          },
        },
      ]
    );
  };

  const handleExportAll = async () => {
    if (inventories.length === 0) {
      Alert.alert('No Data', 'There are no inventories to export.');
      return;
    }
    const result = await exportAllInventories(inventories);
    if (!result.success) {
      Alert.alert('Export Failed', result.error);
    }
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getItemCount = (items) => {
    const total = Object.values(items).reduce((sum, count) => sum + count, 0);
    const types = Object.keys(items).length;
    return `${total} items (${types} types)`;
  };

  const renderInventoryItem = ({ item }) => (
    <TouchableOpacity
      style={styles.inventoryItem}
      onPress={() => handleInventoryPress(item)}
      onLongPress={() => handleInventoryLongPress(item)}
    >
      <View style={styles.inventoryInfo}>
        <Text style={styles.inventoryName}>{item.name}</Text>
        <Text style={styles.inventoryDate}>{formatDate(item.timestamp)}</Text>
        <Text style={styles.inventoryCount}>{getItemCount(item.items)}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Inventory Counter</Text>
      </View>

      <TouchableOpacity style={styles.newButton} onPress={handleNewInventory}>
        <Text style={styles.newButtonText}>+ New Inventory</Text>
      </TouchableOpacity>

      {inventories.length > 0 && (
        <TouchableOpacity style={styles.exportAllButton} onPress={handleExportAll}>
          <Text style={styles.exportAllButtonText}>Export All to Excel</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Saved Inventories</Text>

      {loading ? (
        <Text style={styles.emptyText}>Loading...</Text>
      ) : inventories.length === 0 ? (
        <Text style={styles.emptyText}>No saved inventories yet</Text>
      ) : (
        <FlatList
          data={inventories}
          keyExtractor={(item) => item.id}
          renderItem={renderInventoryItem}
          contentContainerStyle={styles.list}
        />
      )}

      <Text style={styles.hint}>Long-press an inventory to delete it</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 20,
    paddingTop: 50,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  newButton: {
    backgroundColor: '#2563eb',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  newButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  exportAllButton: {
    backgroundColor: '#059669',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportAllButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  list: {
    paddingHorizontal: 16,
  },
  inventoryItem: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  inventoryInfo: {
    flex: 1,
  },
  inventoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  inventoryDate: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  inventoryCount: {
    fontSize: 14,
    color: '#2563eb',
    marginTop: 2,
  },
  chevron: {
    fontSize: 24,
    color: '#9ca3af',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 32,
    fontSize: 16,
  },
  hint: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
    padding: 16,
  },
});

export default HomeScreen;
