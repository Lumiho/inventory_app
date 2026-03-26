import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CATEGORY } from './categories';

const INVENTORIES_KEY = 'inventories';
const KNOWN_ITEMS_KEY = 'known_items';

export const loadInventories = async () => {
  try {
    const data = await AsyncStorage.getItem(INVENTORIES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading inventories:', error);
    return [];
  }
};

export const saveInventories = async (inventories) => {
  try {
    await AsyncStorage.setItem(INVENTORIES_KEY, JSON.stringify(inventories));
  } catch (error) {
    console.error('Error saving inventories:', error);
  }
};

export const saveInventory = async (inventory) => {
  try {
    const inventories = await loadInventories();
    inventories.unshift(inventory);
    await saveInventories(inventories);
    await updateKnownItems(inventory.items);
    return true;
  } catch (error) {
    console.error('Error saving inventory:', error);
    return false;
  }
};

export const deleteInventory = async (inventoryId) => {
  try {
    const inventories = await loadInventories();
    const filtered = inventories.filter((inv) => inv.id !== inventoryId);
    await saveInventories(filtered);
    return true;
  } catch (error) {
    console.error('Error deleting inventory:', error);
    return false;
  }
};

export const updateInventory = async (inventory) => {
  try {
    const inventories = await loadInventories();
    const index = inventories.findIndex((inv) => inv.id === inventory.id);
    if (index !== -1) {
      inventories[index] = inventory;
      await saveInventories(inventories);
      await updateKnownItems(inventory.items);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating inventory:', error);
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

    // newItems is now { itemName: { count, category } }
    Object.entries(newItems).forEach(([name, data]) => {
      if (!existingMap.has(name)) {
        existingMap.set(name, {
          name,
          category: data.category || DEFAULT_CATEGORY,
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
