import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Button, StyleSheet } from 'react-native';
import * as Updates from 'expo-updates';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './frontend/src/screens/navigation/AuthNavigator';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const checkUpdates = async () => {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          // Don't auto-update yet, just notify user
          setUpdateAvailable(true);
        }
      } catch (e) {
        console.log('Update check failed:', e);
      } finally {
        setIsLoading(false);
      }
    };

    checkUpdates();
  }, []);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync(); // Restart app with new update
    } catch (e) {
      console.log('Failed to update:', e);
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (updateAvailable) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>A new update is available!</Text>
        <Button
          title={isUpdating ? 'Updating...' : 'Update Now'}
          onPress={handleUpdate}
          disabled={isUpdating}
        />
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

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  text: { fontSize: 18, marginBottom: 20 },
});
