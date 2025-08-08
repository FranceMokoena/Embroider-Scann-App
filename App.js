import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './frontend/src/screens/navigation/AuthNavigator';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUpdates = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync(); // Force restart with new update
        }
      } catch (e) {
        console.log('Update check failed:', e);
      } finally {
        setIsLoading(false);
      }
    };

    checkUpdates();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <AuthNavigator />
    </NavigationContainer>
  );
}
