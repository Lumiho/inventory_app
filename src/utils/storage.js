import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CATEGORY } from './categories';

const INVENTORIES_KEY = 'inventories';
const KNOWN_ITEMS_KEY = 'known_items';
const DRAFT_INVENTORY_KEY = 'draft_inventory';

// Returns { success: true, data: [...] } or { success: false, error: string }
export const loadInventories = async () => {
  try {
    const data = await AsyncStorage.getItem(INVENTORIES_KEY);
    return { success: true, data: data ? JSON.parse(data) : [] };
  } catch (error) {
    console.error('Error loading inventories:', error);
    return { success: false, error: error.message };
  }
};

// Legacy helper that returns array directly (for backwards compatibility)
export const loadInventoriesArray = async () => {
  const result = await loadInventories();
  if (!result.success) {
    throw new Error(result.error);
  }
  return result.data;
};

export const saveInventories = async (inventories) => {
  try {
    await AsyncStorage.setItem(INVENTORIES_KEY, JSON.stringify(inventories));
    return { success: true };
  } catch (error) {
    console.error('Error saving inventories:', error);
    return { success: false, error: error.message };
  }
};

export const saveInventory = async (inventory) => {
  try {
    const loadResult = await loadInventories();
    // Don't save if load failed - prevents data loss
    if (!loadResult.success) {
      console.error('Refusing to save: load failed with', loadResult.error);
      return false;
    }
    const inventories = loadResult.data;
    inventories.unshift(inventory);
    const saveResult = await saveInventories(inventories);
    if (!saveResult.success) {
      return false;
    }
    await updateKnownItems(inventory.items);
    return true;
  } catch (error) {
    console.error('Error saving inventory:', error);
    return false;
  }
};

export const deleteInventory = async (inventoryId) => {
  try {
    const loadResult = await loadInventories();
    if (!loadResult.success) {
      console.error('Refusing to delete: load failed');
      return false;
    }
    const filtered = loadResult.data.filter((inv) => inv.id !== inventoryId);
    const saveResult = await saveInventories(filtered);
    return saveResult.success;
  } catch (error) {
    console.error('Error deleting inventory:', error);
    return false;
  }
};

export const updateInventory = async (inventory) => {
  try {
    const loadResult = await loadInventories();
    if (!loadResult.success) {
      console.error('Refusing to update: load failed');
      return false;
    }
    const inventories = loadResult.data;
    const index = inventories.findIndex((inv) => inv.id === inventory.id);
    if (index !== -1) {
      inventories[index] = inventory;
      const saveResult = await saveInventories(inventories);
      if (!saveResult.success) {
        return false;
      }
      await updateKnownItems(inventory.items);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating inventory:', error);
    return false;
  }
};

// Draft inventory functions for auto-save
export const saveDraftInventory = async (draft) => {
  try {
    await AsyncStorage.setItem(DRAFT_INVENTORY_KEY, JSON.stringify(draft));
    return true;
  } catch (error) {
    console.error('Error saving draft:', error);
    return false;
  }
};

export const loadDraftInventory = async () => {
  try {
    const data = await AsyncStorage.getItem(DRAFT_INVENTORY_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error loading draft:', error);
    return null;
  }
};

export const clearDraftInventory = async () => {
  try {
    await AsyncStorage.removeItem(DRAFT_INVENTORY_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing draft:', error);
    return false;
  }
};

export const loadKnownItems = async () => {
  try {
    const data = await AsyncStorage.getItem(KNOWN_ITEMS_KEY);
    if (!data) return [];

    const parsed = JSON.parse(data);

    // Migration: convert old format (array of strings) to new format (array of objects)
    if (parsed.length > 0 && typeof parsed[0] === 'string') {
      const migrated = parsed.map((name) => ({
        name,
        category: DEFAULT_CATEGORY,
      }));
      await AsyncStorage.setItem(KNOWN_ITEMS_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return parsed;
  } catch (error) {
    console.error('Error loading known items:', error);
    return [];
  }
};

export const updateKnownItems = async (newItems) => {
  try {
    const existingItems = await loadKnownItems();
    const existingMap = new Map(existingItems.map((item) => [item.name, item]));

    // Handle both array format and object format
    const itemsToProcess = Array.isArray(newItems)
      ? newItems
      : Object.entries(newItems).map(([name, data]) => ({ name, ...data }));

    itemsToProcess.forEach((item) => {
      if (!existingMap.has(item.name)) {
        existingMap.set(item.name, {
          name: item.name,
          category: item.category || DEFAULT_CATEGORY,
        });
      }
    });

    const combined = Array.from(existingMap.values());
    await AsyncStorage.setItem(KNOWN_ITEMS_KEY, JSON.stringify(combined));
  } catch (error) {
    console.error('Error updating known items:', error);
  }
};

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
