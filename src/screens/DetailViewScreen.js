import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { exportSingleInventory } from '../utils/excel';
import { CATEGORIES, DEFAULT_CATEGORY } from '../utils/categories';

const DetailViewScreen = ({ navigation, route }) => {
  const { inventory } = route.params;

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSections = () => {
    // Group items by category
    const grouped = {};
    CATEGORIES.forEach((cat) => {
      grouped[cat] = [];
    });

    Object.entries(inventory.items).forEach(([name, data]) => {
      // Handle both old format (number) and new format (object with count/category)
      let count, category;
      if (typeof data === 'number') {
        count = data;
        category = DEFAULT_CATEGORY;
      } else {
        count = data.count;
        category = data.category || DEFAULT_CATEGORY;
      }

      if (!grouped[category]) {
        grouped[category] = [];
      }
      const comments = typeof data === 'number' ? '' : (data.comments || '');
      grouped[category].push({ name, count, category, comments });
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
    return Object.values(inventory.items).reduce((sum, data) => {
      const count = typeof data === 'number' ? data : data.count;
      return sum + count;
    }, 0);
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

  const handleEdit = () => {
    navigation.navigate('ActiveInventory', {
      inventoryName: inventory.name,
      existingInventory: inventory,
    });
  };

  const renderItem = ({ item }) => {
    const { name, count, comments } = item;
    const isDimmed = count === 0;

    return (
      <View style={[styles.itemRow, isDimmed && styles.itemRowDimmed]}>
        <View style={styles.itemNameContainer}>
          <Text style={[styles.itemName, isDimmed && styles.itemNameDimmed]}>
            {name}
          </Text>
          {comments ? (
            <Text style={styles.itemComment}>{comments}</Text>
          ) : null}
        </View>
        <Text style={[styles.itemCount, isDimmed && styles.itemCountDimmed]}>
          {count}
        </Text>
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

      <SectionList
        sections={getSections()}
        keyExtractor={(item) => item.name}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No items in this inventory</Text>
        }
        stickySectionHeadersEnabled={false}
      />

      <View style={styles.footer}>
        <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.exportButton} onPress={handleExport}>
          <Text style={styles.exportButtonText}>Export</Text>
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
  itemNameContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#1f2937',
  },
  itemNameDimmed: {
    color: '#9ca3af',
  },
  itemComment: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
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
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  exportButton: {
    flex: 1,
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
