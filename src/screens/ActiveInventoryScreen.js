import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { loadKnownItems, saveInventory, updateInventory, generateId, saveDraftInventory, clearDraftInventory } from '../utils/storage';
import { exportSingleInventory } from '../utils/excel';
import { CATEGORIES, DEFAULT_CATEGORY, getCategoryIndex, getCategoryColor } from '../utils/categories';

const ALL_CATEGORIES = 'All';

const ActiveInventoryScreen = ({ navigation, route }) => {
  const { inventoryName, existingInventory, resumeDraft } = route.params;
  const isEditMode = !!existingInventory;
  const [items, setItems] = useState({});
  const [inputValue, setInputValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(DEFAULT_CATEGORY);
  const [filterCategory, setFilterCategory] = useState(ALL_CATEGORIES);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [editingItemName, setEditingItemName] = useState('');
  const [commentInput, setCommentInput] = useState('');
  const [inventoryId] = useState(() => existingInventory?.id || generateId());
  const autoSaveTimeoutRef = useRef(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    initializeItems();
  }, []);

  // Auto-save whenever items change (debounced)
  useEffect(() => {
    if (!isInitializedRef.current) return;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      const draft = {
        id: inventoryId,
        name: inventoryName,
        items: items,
        timestamp: Date.now(),
        isEdit: isEditMode,
        originalInventory: existingInventory,
      };
      saveDraftInventory(draft);
    }, 1000); // Save after 1 second of no changes

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [items]);

  const initializeItems = async () => {
    // If resuming from draft, use draft items
    if (resumeDraft && resumeDraft.items) {
      setItems(resumeDraft.items);
      isInitializedRef.current = true;
      return;
    }

    if (isEditMode) {
      // Edit mode: load items from existing inventory
      const existingItems = {};
      const itemsArray = Array.isArray(existingInventory.items)
        ? existingInventory.items
        : Object.entries(existingInventory.items).map(([name, data]) => ({
            name,
            ...(typeof data === 'number' ? { count: data, category: DEFAULT_CATEGORY } : data),
          }));

      itemsArray.forEach(({ name, count, category, comments }) => {
        existingItems[name] = { count, category: category || DEFAULT_CATEGORY, comments: comments || '' };
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
    isInitializedRef.current = true;
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
      : { id: inventoryId, name: inventoryName, timestamp: Date.now(), items: items };
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
                items: Object.entries(items).map(([name, data]) => ({ name, ...data })),
              };
              success = await updateInventory(inventory);
            } else {
              const inventory = {
                id: inventoryId,
                name: inventoryName,
                timestamp: Date.now(),
                items: Object.entries(items).map(([name, data]) => ({ name, ...data })),
              };
              success = await saveInventory(inventory);
            }
            if (success) {
              await clearDraftInventory();
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
          onPress: async () => {
            await clearDraftInventory();
            navigation.popToTop();
          },
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

    // Sort items within each category alphabetically only
    Object.keys(grouped).forEach((cat) => {
      grouped[cat].sort((a, b) => a.name.localeCompare(b.name));
    });

    // Filter by selected filter category
    const categoriesToShow = filterCategory === ALL_CATEGORIES
      ? CATEGORIES
      : [filterCategory];

    // Build sections, only include categories that have items
    return categoriesToShow
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
    <View style={[styles.sectionHeader, { borderLeftColor: getCategoryColor(section.title) }]}>
      <View style={[styles.sectionDot, { backgroundColor: getCategoryColor(section.title) }]} />
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
          placeholderTextColor="#64748b"
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
        <Text style={styles.categoryLabel}>New item tag:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat;
            const catColor = getCategoryColor(cat);
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  isSelected && {
                    backgroundColor: catColor,
                    borderColor: catColor,
                    shadowColor: catColor,
                    shadowOpacity: 0.5,
                    elevation: 6,
                  },
                  !isSelected && {
                    borderWidth: 2,
                    borderColor: catColor + '66',
                  },
                ]}
                onPress={() => {
                  setSelectedCategory(cat);
                  setFilterCategory(cat);
                }}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextSelected,
                    !isSelected && { color: catColor },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.filterContainer}>
        <Text style={styles.filterLabel}>Filter:</Text>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              filterCategory === ALL_CATEGORIES && styles.filterPillSelected,
            ]}
            onPress={() => setFilterCategory(ALL_CATEGORIES)}
          >
            <Text
              style={[
                styles.filterPillText,
                filterCategory === ALL_CATEGORIES && styles.filterPillTextSelected,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {selectedCategory && (
            <TouchableOpacity
              style={[
                styles.filterPill,
                filterCategory === selectedCategory && {
                  backgroundColor: getCategoryColor(selectedCategory),
                  borderColor: getCategoryColor(selectedCategory),
                },
                filterCategory !== selectedCategory && {
                  borderColor: getCategoryColor(selectedCategory) + '66',
                },
              ]}
              onPress={() => setFilterCategory(selectedCategory)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filterCategory === selectedCategory && styles.filterPillTextSelected,
                  filterCategory !== selectedCategory && { color: getCategoryColor(selectedCategory) },
                ]}
              >
                {selectedCategory}
              </Text>
            </TouchableOpacity>
          )}
        </View>
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

      <View style={styles.discardContainer}>
        <TouchableOpacity style={styles.discardButton} onPress={handleDiscard} activeOpacity={0.6}>
          <Text style={styles.discardButtonText}>Discard Changes</Text>
        </TouchableOpacity>
      </View>

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
              placeholderTextColor="#64748b"
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
    backgroundColor: '#022851',
  },
  header: {
    backgroundColor: '#011c3a',
    padding: 20,
    paddingTop: 52,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#FFBF00',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFBF00',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  totalText: {
    fontSize: 15,
    color: '#2DD4BF',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 14,
    backgroundColor: '#033a6b',
  },
  input: {
    flex: 1,
    backgroundColor: '#022851',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginRight: 10,
    color: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#FFBF0033',
  },
  addButton: {
    backgroundColor: '#FFBF00',
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    shadowColor: '#FFBF00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  addButtonDisabled: {
    backgroundColor: '#475569',
    shadowOpacity: 0,
    elevation: 0,
  },
  addButtonText: {
    color: '#022851',
    fontWeight: '700',
    fontSize: 16,
  },
  categoryContainer: {
    backgroundColor: '#033a6b',
    paddingBottom: 4,
  },
  categoryLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 14,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  categoryScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#022851',
    marginRight: 8,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryPillTextSelected: {
    color: '#022851',
  },
  filterContainer: {
    backgroundColor: '#022851',
    paddingBottom: 8,
  },
  filterLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 14,
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },
  filterScroll: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#033a6b',
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#FFBF0066',
  },
  filterPillSelected: {
    backgroundColor: '#FFBF00',
    borderColor: '#FFBF00',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94a3b8',
  },
  filterPillTextSelected: {
    color: '#022851',
  },
  list: {
    padding: 14,
  },
  sectionHeader: {
    backgroundColor: '#033a6b',
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
  },
  sectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#e2e8f0',
    flex: 1,
  },
  sectionCount: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  itemRow: {
    backgroundColor: '#033a6b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  itemRowDimmed: {
    backgroundColor: '#022851',
    opacity: 0.7,
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
    color: '#f1f5f9',
    fontWeight: '600',
  },
  itemNameDimmed: {
    color: '#64748b',
  },
  itemCount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2DD4BF',
    minWidth: 44,
    textAlign: 'right',
  },
  itemCountDimmed: {
    color: '#475569',
  },
  itemButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  itemButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  decrementButton: {
    backgroundColor: '#FFBF00',
  },
  incrementButton: {
    backgroundColor: '#2DD4BF',
  },
  deleteButton: {
    backgroundColor: '#EC4899',
  },
  itemButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#022851',
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 48,
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 14,
    gap: 12,
    backgroundColor: '#033a6b',
    borderTopWidth: 1,
    borderTopColor: '#FFBF0033',
  },
  exportButton: {
    flex: 1,
    backgroundColor: '#2DD4BF',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#2DD4BF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  exportButtonText: {
    color: '#022851',
    fontSize: 16,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FFBF00',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#FFBF00',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  saveButtonText: {
    color: '#022851',
    fontSize: 16,
    fontWeight: '700',
  },
  discardContainer: {
    backgroundColor: '#033a6b',
    paddingBottom: 24,
  },
  discardButton: {
    padding: 16,
    marginHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#3d1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EC489933',
  },
  discardButtonText: {
    color: '#EC4899',
    fontSize: 15,
    fontWeight: '700',
  },
  itemNameContainer: {
    flex: 1,
  },
  itemComment: {
    fontSize: 12,
    color: '#2DD4BF',
    marginTop: 3,
  },
  addCommentHint: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 3,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#033a6b',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: '#FFBF0033',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 4,
  },
  modalItemName: {
    fontSize: 14,
    color: '#FFBF00',
    marginBottom: 18,
    fontWeight: '600',
  },
  commentInput: {
    backgroundColor: '#022851',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    color: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#FFBF0033',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#022851',
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#FFBF00',
    alignItems: 'center',
    shadowColor: '#FFBF00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  modalSaveText: {
    color: '#022851',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ActiveInventoryScreen;
