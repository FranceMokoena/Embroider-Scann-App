import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Modal, TouchableOpacity, Image } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import * as Updates from 'expo-updates';
import { NavigationContainer } from '@react-navigation/native';
import AuthNavigator from './src/screens/navigation/AuthNavigator';
import { StatusBar } from 'expo-status-bar';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 15000); // GIF splash duration
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showSplash) {
      checkUpdates();
      SplashScreen.hideAsync();
    }
  }, [showSplash]);

  const checkUpdates = async () => {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        setUpdateAvailable(true);
      }
    } catch (e) {
      console.log('❌ Update check failed:', e);
      Toast.show({
        type: 'error',
        text1: 'Update Check Failed',
        text2: 'Unable to check for updates at the moment.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync();
    } catch (e) {
      console.log('❌ Failed to update:', e);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Please try again later.'
      });
      setIsUpdating(false);
    }
  };

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        <Image
          source={require('./assets/Good.gif')}
          style={styles.splashGif}
          resizeMode="contain"
        />
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <>
      <NavigationContainer>
        <StatusBar style="auto" />
        <AuthNavigator />
        <Toast />
      </NavigationContainer>

      {/* Update Modal */}
      <Modal
        visible={updateAvailable}
        transparent
        animationType="fade"
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="cloud-download-outline" size={48} color="#6366f1" style={{ marginBottom: 10 }} />
            <Text style={styles.modalTitle}>Update Available</Text>
            <Text style={styles.modalSubtitle}>
              A new version of the app is ready. Update now for the best experience.
            </Text>

            <TouchableOpacity
              style={[styles.updateButton, isUpdating && { backgroundColor: '#94a3b8' }]}
              onPress={handleUpdate}
              disabled={isUpdating}
              activeOpacity={0.8}
            >
              {isUpdating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.updateButtonText}>Update Now</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center'
  },
  splashGif: {
    width: 200,
    height: 200
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '90%',
    elevation: 5
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20
  },
  updateButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});
