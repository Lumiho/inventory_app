import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { loadKnownItems, saveInventory, generateId } from '../utils/storage';
import { exportSingleInventory } from '../utils/excel';

const ActiveInventoryScreen = ({ navigation, route }) => {
  const { inventoryName } = route.params;
  const [items, setItems] = useState({});
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    initializeItems();
  }, []);

  const initializeItems = async () => {
    const knownItems = await loadKnownItems();
    const initialItems = {};
    knownItems.forEach((itemName) => {
      initialItems[itemName] = 0;
    });
    setItems(initialItems);
  };

  const handleAddItem = () => {
    const trimmedName = inputValue.trim();
    if (trimmedName.length === 0) return;

    setItems((prev) => ({
      ...prev,
      [trimmedName]: (prev[trimmedName] || 0) + 1,
    }));
    setInputValue('');
  };

  const handleIncrement = (itemName) => {
    setItems((prev) => ({
      ...prev,
      [itemName]: prev[itemName] + 1,
    }));
  };

  const handleDecrement = (itemName) => {
    setItems((prev) => ({
      ...prev,
      [itemName]: Math.max(0, prev[itemName] - 1),
    }));
  };

  const handleDelete = (itemName) => {
    Alert.alert(
      'Remove Item',
      `Remove "${itemName}" from this inventory?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setItems((prev) => {
              const newItems = { ...prev };
              delete newItems[itemName];
              return newItems;
            });
          },
        },
      ]
    );
  };

  const handleExport = async () => {
    const inventory = {
      id: generateId(),
      name: inventoryName,
      timestamp: Date.now(),
      items: items,
    };
    const result = await exportSingleInventory(inventory);
    if (!result.success) {
      Alert.alert('Export Failed', result.error);
    }
  };

  const handleSaveAndFinish = () => {
    Alert.alert(
      'Save Inventory',
      'Save this inventory and return to home?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async () => {
            const inventory = {
              id: generateId(),
              name: inventoryName,
              timestamp: Date.now(),
              items: items,
            };
            const success = await saveInventory(inventory);
            if (success) {
              navigation.popToTop();
            } else {
              Alert.alert('Error', 'Failed to save inventory');
            }
          },
        },
      ]
    );
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Inventory',
      'Are you sure you want to discard this inventory? All data will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => navigation.popToTop(),
        },
      ]
    );
  };

  const getSortedItems = () => {
    return Object.entries(items).sort((a, b) => {
      const [nameA, countA] = a;
      const [nameB, countB] = b;

      // Items with count > 0 come first, sorted by count descending
      if (countA > 0 && countB === 0) return -1;
      if (countA === 0 && countB > 0) return 1;
      if (countA > 0 && countB > 0) {
        if (countA !== countB) return countB - countA;
      }
      // Same count or both zero: sort alphabetically
      return nameA.localeCompare(nameB);
    });
  };

  const getTotal = () => {
    return Object.values(items).reduce((sum, count) => sum + count, 0);
  };

  const renderItem = ({ item }) => {
    const [name, count] = item;
    const isDimmed = count === 0;

    return (
      <View style={[styles.itemRow, isDimmed && styles.itemRowDimmed]}>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, isDimmed && styles.itemNameDimmed]}>
            {name}
          </Text>
          <Text style={[styles.itemCount, isDimmed && styles.itemCountDimmed]}>
            {count}
          </Text>
        </View>
        <View style={styles.itemButtons}>
          <TouchableOpacity
            style={[styles.itemButton, styles.decrementButton]}
            onPress={() => handleDecrement(name)}
          >
            <Text style={styles.itemButtonText}>−</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.itemButton, styles.incrementButton]}
            onPress={() => handleIncrement(name)}
          >
            <Text style={styles.itemButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.itemButton, styles.deleteButton]}
            onPress={() => handleDelete(name)}
          >
            <Text style={styles.itemButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title} numberOfLines={1}>
          {inventoryName}
        </Text>
        <Text style={styles.totalText}>Total: {getTotal()}</Text>
      </View>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="Type item name to add..."
          placeholderTextColor="#9ca3af"
          returnKeyType="done"
          onSubmitEditing={handleAddItem}
        />
        <TouchableOpacity
          style={[styles.addButton, !inputValue.trim() && styles.addButtonDisabled]}
          onPress={handleAddItem}
          disabled={!inputValue.trim()}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={getSortedItems()}
        keyExtractor={(item) => item[0]}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Type an item name above to start counting
          </Text>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Text style={styles.exportButtonText}>Export Excel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveAndFinish}>
          <Text style={styles.saveButtonText}>Save & Finish</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.discardButton} onPress={handleDiscard}>
        <Text style={styles.discardButtonText}>Discard</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2563eb',
    padding: 16,
    paddingTop: 50,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  totalText: {
    fontSize: 14,
    color: '#bfdbfe',
    textAlign: 'center',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  input: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
  },
  addButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  addButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  list: {
    padding: 12,
  },
  itemRow: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemRowDimmed: {
    backgroundColor: '#f9fafb',
  },
  itemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginRight: 12,
  },
  itemName: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  itemNameDimmed: {
    color: '#9ca3af',
  },
  itemCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
    minWidth: 40,
    textAlign: 'right',
  },
  itemCountDimmed: {
    color: '#d1d5db',
  },
  itemButtons: {
    flexDirection: 'row',
    gap: 6,
  },
  itemButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  decrementButton: {
    backgroundColor: '#fef3c7',
  },
  incrementButton: {
    backgroundColor: '#d1fae5',
  },
  deleteButton: {
    backgroundColor: '#fee2e2',
  },
  itemButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 32,
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  exportButton: {
    flex: 1,
    backgroundColor: '#059669',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  discardButton: {
    padding: 12,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  discardButtonText: {
    color: '#ef4444',
    fontSize: 14,
  },
});

export default ActiveInventoryScreen;
