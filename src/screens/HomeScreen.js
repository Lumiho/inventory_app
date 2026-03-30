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
import { loadInventories, deleteInventory, loadDraftInventory, clearDraftInventory } from '../utils/storage';
import { exportAllInventories } from '../utils/excel';

const HomeScreen = ({ navigation }) => {
  const [inventories, setInventories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [draftInventory, setDraftInventory] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    setLoadError(null);

    const result = await loadInventories();
    if (result.success) {
      setInventories(result.data);
    } else {
      setLoadError(result.error);
      setInventories([]);
    }

    // Check for draft inventory
    const draft = await loadDraftInventory();
    setDraftInventory(draft);

    setLoading(false);
  };

  const handleNewInventory = () => {
    navigation.navigate('Naming');
  };

  const handleResumeDraft = () => {
    if (draftInventory) {
      navigation.navigate('ActiveInventory', {
        inventoryName: draftInventory.name,
        existingInventory: draftInventory.isEdit ? draftInventory.originalInventory : null,
        resumeDraft: draftInventory,
      });
    }
  };

  const handleDiscardDraft = () => {
    Alert.alert(
      'Discard Draft',
      `Discard unsaved progress for "${draftInventory?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: async () => {
            await clearDraftInventory();
            setDraftInventory(null);
          },
        },
      ]
    );
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

      {draftInventory && (
        <View style={styles.draftBanner}>
          <View style={styles.draftInfo}>
            <Text style={styles.draftTitle}>Unsaved Progress</Text>
            <Text style={styles.draftName}>{draftInventory.name}</Text>
          </View>
          <View style={styles.draftButtons}>
            <TouchableOpacity style={styles.draftResumeButton} onPress={handleResumeDraft}>
              <Text style={styles.draftResumeText}>Resume</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.draftDiscardButton} onPress={handleDiscardDraft}>
              <Text style={styles.draftDiscardText}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <TouchableOpacity style={styles.newButton} onPress={handleNewInventory}>
        <Text style={styles.newButtonText}>+ New Inventory</Text>
      </TouchableOpacity>

      {inventories.length > 0 && (
        <TouchableOpacity style={styles.exportAllButton} onPress={handleExportAll}>
          <Text style={styles.exportAllButtonText}>Export All to Excel</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.sectionTitle}>Saved Inventories</Text>

      {loadError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>Error loading data: {loadError}</Text>
        </View>
      )}

      {loading ? (
        <Text style={styles.emptyText}>Loading...</Text>
      ) : !loadError && inventories.length === 0 ? (
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
    backgroundColor: '#022851',
  },
  header: {
    backgroundColor: '#011c3a',
    padding: 24,
    paddingTop: 56,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#FFBF00',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFBF00',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  newButton: {
    backgroundColor: '#FFBF00',
    margin: 16,
    marginTop: 20,
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#FFBF00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  newButtonText: {
    color: '#022851',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  exportAllButton: {
    backgroundColor: '#2DD4BF',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 6,
  },
  exportAllButtonText: {
    color: '#022851',
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
    backgroundColor: '#033a6b',
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FFBF00',
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
    color: '#94a3b8',
    marginTop: 6,
  },
  inventoryCount: {
    fontSize: 14,
    color: '#2DD4BF',
    marginTop: 4,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 28,
    color: '#FFBF00',
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 48,
    fontSize: 16,
  },
  hint: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: 12,
    padding: 16,
  },
  draftBanner: {
    backgroundColor: '#3d2800',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#FFBF00',
  },
  draftInfo: {
    flex: 1,
  },
  draftTitle: {
    fontSize: 12,
    color: '#FFBF00',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  draftName: {
    fontSize: 16,
    color: '#fef3c7',
    fontWeight: '600',
    marginTop: 2,
  },
  draftButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  draftResumeButton: {
    backgroundColor: '#FFBF00',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  draftResumeText: {
    color: '#022851',
    fontWeight: '700',
    fontSize: 14,
  },
  draftDiscardButton: {
    backgroundColor: '#5c4300',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  draftDiscardText: {
    color: '#FFBF00',
    fontWeight: '700',
    fontSize: 14,
  },
  errorBanner: {
    backgroundColor: '#450a0a',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EC4899',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
  },
});

export default HomeScreen;
