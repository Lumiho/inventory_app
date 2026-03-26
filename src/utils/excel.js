import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { CATEGORIES, DEFAULT_CATEGORY } from './categories';

const formatDate = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const sanitizeSheetName = (name, index) => {
  const sanitized = name.replace(/[\\/*?:\[\]]/g, '').trim();
  const truncated = sanitized.substring(0, 20);
  return `${truncated}_${index + 1}`;
};

const createWorksheetFromInventory = (inventory) => {
  // Parse items handling both old format (count) and new format ({ count, category, comments })
  const parsedItems = Object.entries(inventory.items).map(([name, data]) => {
    if (typeof data === 'number') {
      return { name, count: data, category: DEFAULT_CATEGORY, comments: '' };
    }
    return {
      name,
      count: data.count,
      category: data.category || DEFAULT_CATEGORY,
      comments: data.comments || '',
    };
  });

  // Group by category
  const grouped = {};
  CATEGORIES.forEach((cat) => {
    grouped[cat] = [];
  });

  parsedItems.forEach((item) => {
    if (!grouped[item.category]) {
      grouped[item.category] = [];
    }
    grouped[item.category].push(item);
  });

  // Sort items within each category
  Object.keys(grouped).forEach((cat) => {
    grouped[cat].sort((a, b) => {
      if (a.count > 0 && b.count === 0) return -1;
      if (a.count === 0 && b.count > 0) return 1;
      if (a.count !== b.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });
  });

  const data = [['Item Name', 'Quantity', 'Type', 'Additional Comments']];
  let total = 0;

  // Add items grouped by category
  CATEGORIES.forEach((cat) => {
    if (grouped[cat] && grouped[cat].length > 0) {
      let categoryTotal = 0;
      grouped[cat].forEach((item) => {
        data.push([item.name, item.count, cat, item.comments]);
        categoryTotal += item.count;
        total += item.count;
      });
      // Add category subtotal
      data.push([`${cat} Subtotal`, categoryTotal, '', '']);
    }
  });

  data.push(['TOTAL', total, '', '']);

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 30 }, { wch: 10 }, { wch: 30 }, { wch: 40 }];

  return ws;
};

export const exportSingleInventory = async (inventory) => {
  try {
    const wb = XLSX.utils.book_new();
    const ws = createWorksheetFromInventory(inventory);
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const fileName = `${inventory.name.replace(/[^a-zA-Z0-9]/g, '_')}_${formatDate(inventory.timestamp)}.xlsx`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export Inventory',
      });
      return { success: true };
    } else {
      return { success: false, error: 'Sharing is not available on this device' };
    }
  } catch (error) {
    console.error('Error exporting inventory:', error);
    return { success: false, error: error.message };
  }
};

export const exportAllInventories = async (inventories) => {
  try {
    if (!inventories || inventories.length === 0) {
      return { success: false, error: 'No inventories to export' };
    }

    const wb = XLSX.utils.book_new();

    inventories.forEach((inventory, index) => {
      const ws = createWorksheetFromInventory(inventory);
      const sheetName = sanitizeSheetName(inventory.name, index);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    });

    const wbout = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
    const fileName = `all_inventories_${formatDate(new Date())}.xlsx`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(filePath, wbout, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(filePath, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: 'Export All Inventories',
      });
      return { success: true };
    } else {
      return { success: false, error: 'Sharing is not available on this device' };
    }
  } catch (error) {
    console.error('Error exporting all inventories:', error);
    return { success: false, error: error.message };
  }
};
