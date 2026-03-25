import AsyncStorage from '@react-native-async-storage/async-storage';

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

export const loadKnownItems = async () => {
  try {
    const data = await AsyncStorage.getItem(KNOWN_ITEMS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading known items:', error);
    return [];
  }
};

export const updateKnownItems = async (newItems) => {
  try {
    const existingItems = await loadKnownItems();
    const itemNames = Object.keys(newItems);
    const combined = [...new Set([...existingItems, ...itemNames])];
    await AsyncStorage.setItem(KNOWN_ITEMS_KEY, JSON.stringify(combined));
  } catch (error) {
    console.error('Error updating known items:', error);
  }
};

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};
