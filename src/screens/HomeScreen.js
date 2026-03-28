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
  if (!items) return '0 items (0 types)';

  const values = Array.isArray(items) ? items : Object.values(items);
  const total = values.reduce((sum, item) => {
    if (typeof item === 'number') return sum + item;
    if (typeof item.count === 'number') return sum + item.count;
    return sum;
  }, 0);
  const types = values.length;
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
          keyExtractor={(item) => item.id} // eror - showing array instead of items
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
    backgroundColor: '#0f172a',
  },
  header: {
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    backgroundColor: '#6366f1',
    padding: 24,
    paddingTop: 56,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  newButton: {
    backgroundColor: '#8b5cf6',
    margin: 16,
    marginTop: 20,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  newButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  exportAllButton: {
    backgroundColor: '#10b981',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  exportAllButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    marginHorizontal: 16,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  list: {
    paddingHorizontal: 16,
  },
  inventoryItem: {
    backgroundColor: '#1e293b',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#8b5cf6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  inventoryInfo: {
    flex: 1,
  },
  inventoryName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  inventoryDate: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 6,
  },
  inventoryCount: {
    fontSize: 14,
    color: '#22d3ee',
    marginTop: 4,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 28,
    color: '#6366f1',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 48,
    fontSize: 16,
  },
  hint: {
    textAlign: 'center',
    color: '#475569',
    fontSize: 12,
    padding: 16,
  },
});

export default HomeScreen;
