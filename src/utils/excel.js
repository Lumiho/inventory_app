import * as XLSX from 'xlsx';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

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
  const items = Object.entries(inventory.items)
    .sort((a, b) => {
      if (a[1] === 0 && b[1] !== 0) return 1;
      if (a[1] !== 0 && b[1] === 0) return -1;
      if (a[1] === b[1]) return a[0].localeCompare(b[0]);
      return b[1] - a[1];
    });

  const data = [['Item', 'Count']];
  let total = 0;

  items.forEach(([name, count]) => {
    data.push([name, count]);
    total += count;
  });

  data.push(['TOTAL', total]);

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{ wch: 30 }, { wch: 10 }];

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
