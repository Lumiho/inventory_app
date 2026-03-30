import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { exportSingleInventory } from '../utils/excel';
import { CATEGORIES, DEFAULT_CATEGORY, getCategoryColor } from '../utils/categories';

const DetailViewScreen = ({ navigation, route }) => {
  const { inventory } = route.params;
  const [expandedCategories, setExpandedCategories] = useState({});

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

    // Handle both array format and old object format
    const itemsToProcess = Array.isArray(inventory.items)
      ? inventory.items
      : Object.entries(inventory.items).map(([name, data]) => {
          if (typeof data === 'number') {
            return { name, count: data, category: DEFAULT_CATEGORY, comments: '' };
          }
          return { name, count: data.count, category: data.category || DEFAULT_CATEGORY, comments: data.comments || '' };
        });

    itemsToProcess.forEach((item) => {
      const category = item.category || DEFAULT_CATEGORY;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push({
        name: item.name,
        count: item.count,
        category,
        comments: item.comments || '',
      });
    });

    // Sort items within each category alphabetically
    Object.keys(grouped).forEach((cat) => {
      grouped[cat].sort((a, b) => a.name.localeCompare(b.name));
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
    if (Array.isArray(inventory.items)) {
      return inventory.items.reduce((sum, item) => sum + (item.count || 0), 0);
    }
    return Object.values(inventory.items).reduce((sum, data) => {
      const count = typeof data === 'number' ? data : data.count;
      return sum + count;
    }, 0);
  };

  const getTypesCount = () => {
    return Array.isArray(inventory.items) ? inventory.items.length : Object.keys(inventory.items).length;
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

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const renderItem = ({ item }) => {
    const { name, count, comments } = item;
    const isDimmed = count === 0;

    return (
      <View key={name} style={[styles.itemRow, isDimmed && styles.itemRowDimmed]}>
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

      <ScrollView contentContainerStyle={styles.list}>
        {getSections().length === 0 ? (
          <Text style={styles.emptyText}>No items in this inventory</Text>
        ) : (
          getSections().map((section) => (
            <View key={section.title}>
              <TouchableOpacity
                style={[styles.sectionHeader, { borderLeftColor: getCategoryColor(section.title) }]}
                onPress={() => toggleCategory(section.title)}
                activeOpacity={0.7}
              >
                <View style={[styles.sectionDot, { backgroundColor: getCategoryColor(section.title) }]} />
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>
                  {section.data.length} items · {section.total} total
                </Text>
                <Text style={styles.expandIcon}>
                  {expandedCategories[section.title] ? '▼' : '▶'}
                </Text>
              </TouchableOpacity>
              {expandedCategories[section.title] && (
                <View style={styles.itemsContainer}>
                  {section.data.map((item) => renderItem({ item }))}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

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
    backgroundColor: '#022851',
  },
  header: {
    backgroundColor: '#011c3a',
    padding: 20,
    paddingTop: 52,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#FFBF00',
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    color: '#2DD4BF',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFBF00',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  dateText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 6,
    fontWeight: '500',
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: '#033a6b',
    padding: 20,
    marginHorizontal: 16,
    marginTop: -12,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#FFBF0033',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 2,
    backgroundColor: '#FFBF0066',
    borderRadius: 1,
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: '800',
    color: '#2DD4BF',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  list: {
    padding: 14,
    paddingTop: 20,
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
  expandIcon: {
    fontSize: 12,
    color: '#FFBF00',
    marginLeft: 10,
  },
  itemsContainer: {
    marginBottom: 8,
  },
  itemRow: {
    backgroundColor: '#033a6b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  itemNameContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    color: '#f1f5f9',
    fontWeight: '600',
  },
  itemNameDimmed: {
    color: '#64748b',
  },
  itemComment: {
    fontSize: 12,
    color: '#2DD4BF',
    marginTop: 3,
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
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 48,
    fontSize: 16,
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#033a6b',
    borderTopWidth: 1,
    borderTopColor: '#FFBF0033',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#EC4899',
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
    shadowColor: '#EC4899',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  editButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
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
    fontSize: 17,
    fontWeight: '700',
  },
});

export default DetailViewScreen;
