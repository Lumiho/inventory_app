import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const NamingScreen = ({ navigation }) => {
  const [name, setName] = useState('');

  const handleStart = () => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return;
    }
    navigation.replace('ActiveInventory', { inventoryName: trimmedName });
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.title}>New Inventory</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Enter a name for this inventory:</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g., March 2026 Count"
          placeholderTextColor="#64748b"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleStart}
        />

        <TouchableOpacity
          style={[styles.startButton, !name.trim() && styles.startButtonDisabled]}
          onPress={handleStart}
          disabled={!name.trim()}
        >
          <Text style={styles.startButtonText}>Start Counting</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
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
    padding: 24,
    paddingTop: 56,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderBottomWidth: 2,
    borderBottomColor: '#FFBF00',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFBF00',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  content: {
    flex: 1,
    padding: 28,
    justifyContent: 'center',
  },
  label: {
    fontSize: 17,
    color: '#e2e8f0',
    marginBottom: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#033a6b',
    borderRadius: 16,
    padding: 18,
    fontSize: 18,
    borderWidth: 2,
    borderColor: '#FFBF0033',
    marginBottom: 28,
    color: '#f1f5f9',
  },
  startButton: {
    backgroundColor: '#FFBF00',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#FFBF00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  startButtonDisabled: {
    backgroundColor: '#475569',
    shadowOpacity: 0,
    elevation: 0,
  },
  startButtonText: {
    color: '#022851',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  cancelButton: {
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#EC4899',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default NamingScreen;
