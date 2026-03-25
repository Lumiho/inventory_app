import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './src/screens/HomeScreen';
import NamingScreen from './src/screens/NamingScreen';
import ActiveInventoryScreen from './src/screens/ActiveInventoryScreen';
import DetailViewScreen from './src/screens/DetailViewScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Naming" component={NamingScreen} />
        <Stack.Screen
          name="ActiveInventory"
          component={ActiveInventoryScreen}
          options={{
            gestureEnabled: false,
          }}
        />
        <Stack.Screen name="Detail" component={DetailViewScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
