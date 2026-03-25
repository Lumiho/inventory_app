import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { exportSingleInventory } from '../utils/excel';

const DetailViewScreen = ({ navigation, route }) => {
  const { inventory } = route.params;

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSortedItems = () => {
    return Object.entries(inventory.items).sort((a, b) => {
      const [nameA, countA] = a;
      const [nameB, countB] = b;

      if (countA > 0 && countB === 0) return -1;
      if (countA === 0 && countB > 0) return 1;
      if (countA > 0 && countB > 0) {
        if (countA !== countB) return countB - countA;
      }
      return nameA.localeCompare(nameB);
    });
  };

  const getTotal = () => {
    return Object.values(inventory.items).reduce((sum, count) => sum + count, 0);
  };

  const getTypesCount = () => {
    return Object.keys(inventory.items).length;
  };

  const handleExport = async () => {
    const result = await exportSingleInventory(inventory);
    if (!result.success) {
      Alert.alert('Export Failed', result.error);
    }
  };

  const renderItem = ({ item }) => {
    const [name, count] = item;
    const isDimmed = count === 0;

    return (
      <View style={[styles.itemRow, isDimmed && styles.itemRowDimmed]}>
        <Text style={[styles.itemName, isDimmed && styles.itemNameDimmed]}>
          {name}
        </Text>
        <Text style={[styles.itemCount, isDimmed && styles.itemCountDimmed]}>
          {count}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {inventory.name}
        </Text>
        <Text style={styles.dateText}>{formatDate(inventory.timestamp)}</Text>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{getTotal()}</Text>
          <Text style={styles.summaryLabel}>Total Items</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{getTypesCount()}</Text>
          <Text style={styles.summaryLabel}>Item Types</Text>
        </View>
      </View>

      <FlatList
        data={getSortedItems()}
        keyExtractor={(item) => item[0]}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No items in this inventory</Text>
        }
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Text style={styles.exportButtonText}>Export to Excel</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  backButton: {
    marginBottom: 8,
  },
  backButtonText: {
    color: '#bfdbfe',
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  dateText: {
    fontSize: 14,
    color: '#bfdbfe',
    textAlign: 'center',
    marginTop: 4,
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  list: {
    padding: 12,
  },
  itemRow: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemRowDimmed: {
    backgroundColor: '#f9fafb',
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
  emptyText: {
    textAlign: 'center',
    color: '#6b7280',
    marginTop: 32,
    fontSize: 16,
  },
  footer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  exportButton: {
    backgroundColor: '#059669',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  exportButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});

export default DetailViewScreen;
