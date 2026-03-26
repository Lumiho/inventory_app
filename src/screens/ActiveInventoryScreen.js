import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SectionList,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { loadKnownItems, saveInventory, updateInventory, generateId } from '../utils/storage';
import { exportSingleInventory } from '../utils/excel';
import { CATEGORIES, DEFAULT_CATEGORY, getCategoryIndex } from '../utils/categories';

const ActiveInventoryScreen = ({ navigation, route }) => {
  const { inventoryName, existingInventory } = route.params;
  const isEditMode = !!existingInventory;
  const [items, setItems] = useState({});
  const [inputValue, setInputValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORY);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [editingItemName, setEditingItemName] = useState('');
  const [commentInput, setCommentInput] = useState('');

  useEffect(() => {
    initializeItems();
  }, []);

  const initializeItems = async () => {
    if (isEditMode) {
      // Edit mode: load items from existing inventory
      const existingItems = {};
      Object.entries(existingInventory.items).forEach(([name, data]) => {
        // Handle both old format (number) and new format (object)
        if (typeof data === 'number') {
          existingItems[name] = { count: data, category: DEFAULT_CATEGORY };
        } else {
          existingItems[name] = { count: data.count, category: data.category || DEFAULT_CATEGORY };
        }
      });
      setItems(existingItems);
    } else {
      // New inventory: load known items with count 0
      const knownItems = await loadKnownItems();
      const initialItems = {};
      knownItems.forEach((item) => {
        if (typeof item === 'string') {
          initialItems[item] = { count: 0, category: DEFAULT_CATEGORY };
        } else {
          initialItems[item.name] = { count: 0, category: item.category || DEFAULT_CATEGORY };
        }
      });
      setItems(initialItems);
    }
  };

  const handleAddItem = () => {
    const trimmedName = inputValue.trim();
    if (trimmedName.length === 0) return;

    setItems((prev) => {
      const existing = prev[trimmedName];
      if (existing) {
        // If item exists but count is 0, use the selected category
        // Otherwise keep the category the user already assigned
        const category = existing.count === 0 ? selectedCategory : existing.category;
        return {
          ...prev,
          [trimmedName]: { count: existing.count + 1, category },
        };
      }
      return {
        ...prev,
        [trimmedName]: { count: 1, category: selectedCategory },
      };
    });
    setInputValue('');
  };

  const handleIncrement = (itemName) => {
    setItems((prev) => ({
      ...prev,
      [itemName]: { ...prev[itemName], count: prev[itemName].count + 1 },
    }));
  };

  const handleDecrement = (itemName) => {
    setItems((prev) => ({
      ...prev,
      [itemName]: { ...prev[itemName], count: Math.max(0, prev[itemName].count - 1) },
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

  const handleOpenCommentModal = (itemName) => {
    setEditingItemName(itemName);
    setCommentInput(items[itemName]?.comments || '');
    setCommentModalVisible(true);
  };

  const handleSaveComment = () => {
    setItems((prev) => ({
      ...prev,
      [editingItemName]: { ...prev[editingItemName], comments: commentInput.trim() },
    }));
    setCommentModalVisible(false);
    setEditingItemName('');
    setCommentInput('');
  };

  const handleExport = async () => {
    const inventory = isEditMode
      ? { ...existingInventory, items: items }
      : { id: generateId(), name: inventoryName, timestamp: Date.now(), items: items };
    const result = await exportSingleInventory(inventory);
    if (!result.success) {
      Alert.alert('Export Failed', result.error);
    }
  };

  const handleSaveAndFinish = () => {
    Alert.alert(
      isEditMode ? 'Update Inventory' : 'Save Inventory',
      isEditMode ? 'Save changes and return to home?' : 'Save this inventory and return to home?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Save',
          onPress: async () => {
            let success;
            if (isEditMode) {
              const inventory = {
                ...existingInventory,
                items: items,
              };
              success = await updateInventory(inventory);
            } else {
              const inventory = {
                id: generateId(),
                name: inventoryName,
                timestamp: Date.now(),
                items: items,
              };
              success = await saveInventory(inventory);
            }
            if (success) {
              navigation.popToTop();
            } else {
              Alert.alert('Error', `Failed to ${isEditMode ? 'update' : 'save'} inventory`);
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

  const getSections = () => {
    // Group items by category
    const grouped = {};
    CATEGORIES.forEach((cat) => {
      grouped[cat] = [];
    });

    Object.entries(items).forEach(([name, data]) => {
      const category = data.category || DEFAULT_CATEGORY;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({ name, count: data.count, category, comments: data.comments || '' });
    });

    // Sort items within each category
    Object.keys(grouped).forEach((cat) => {
      grouped[cat].sort((a, b) => {
        if (a.count > 0 && b.count === 0) return -1;
        if (a.count === 0 && b.count > 0) return 1;
        if (a.count > 0 && b.count > 0 && a.count !== b.count) {
          return b.count - a.count;
        }
        return a.name.localeCompare(b.name);
      });
    });

    // Build sections, only include categories that have items
    return CATEGORIES
      .filter((cat) => grouped[cat] && grouped[cat].length > 0)
      .map((cat) => ({
        title: cat,
        data: grouped[cat],
        total: grouped[cat].reduce((sum, item) => sum + item.count, 0),
      }));
  };

  const getTotal = () => {
    return Object.values(items).reduce((sum, data) => sum + data.count, 0);
  };

  const renderItem = ({ item }) => {
    const { name, count, comments } = item;
    const isDimmed = count === 0;

    return (
      <View style={[styles.itemRow, isDimmed && styles.itemRowDimmed]}>
        <TouchableOpacity style={styles.itemInfo} onPress={() => handleOpenCommentModal(name)}>
          <View style={styles.itemNameContainer}>
            <Text style={[styles.itemName, isDimmed && styles.itemNameDimmed]}>
              {name}
            </Text>
            {comments ? (
              <Text style={styles.itemComment} numberOfLines={1}>{comments}</Text>
            ) : (
              <Text style={styles.addCommentHint}>Tap to add note</Text>
            )}
          </View>
          <Text style={[styles.itemCount, isDimmed && styles.itemCountDimmed]}>
            {count}
          </Text>
        </TouchableOpacity>
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

  const renderSectionHeader = ({ section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>
        {section.data.length} items · {section.total} total
      </Text>
    </View>
  );

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

      <View style={styles.categoryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryPill,
                selectedCategory === cat && styles.categoryPillSelected,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryPillText,
                  selectedCategory === cat && styles.categoryPillTextSelected,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <SectionList
        sections={getSections()}
        keyExtractor={(item) => item.name}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Type an item name above to start counting
          </Text>
        }
        stickySectionHeadersEnabled={false}
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

      <Modal
        visible={commentModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setCommentModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Note</Text>
            <Text style={styles.modalItemName}>{editingItemName}</Text>
            <TextInput
              style={styles.commentInput}
              value={commentInput}
              onChangeText={setCommentInput}
              placeholder="Enter notes or comments..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setCommentModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveButton} onPress={handleSaveComment}>
                <Text style={styles.modalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  categoryContainer: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  categoryScroll: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    marginRight: 8,
  },
  categoryPillSelected: {
    backgroundColor: '#2563eb',
  },
  categoryPillText: {
    fontSize: 13,
    color: '#4b5563',
    fontWeight: '500',
  },
  categoryPillTextSelected: {
    color: '#ffffff',
  },
  list: {
    padding: 12,
  },
  sectionHeader: {
    backgroundColor: '#e5e7eb',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    flex: 1,
  },
  sectionCount: {
    fontSize: 12,
    color: '#6b7280',
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
  itemNameContainer: {
    flex: 1,
  },
  itemComment: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  addCommentHint: {
    fontSize: 11,
    color: '#d1d5db',
    marginTop: 2,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  modalItemName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  commentInput: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#4b5563',
    fontSize: 16,
    fontWeight: '500',
  },
  modalSaveButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2563eb',
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ActiveInventoryScreen;
