import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
  Image,
} from 'react-native';
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

  // Animation values for professional scanner effects
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  // Add version logging for update verification
  console.log('🚀 App Version: 1.0.6 - Improved positioning and sizing of scanner splash screen');
  console.log('📱 Update channel: preview');
  console.log('✅ Professional scanner splash screen is now the ONLY splash screen');
  console.log('🗑️ Old GIF splash screen and CustomSplashScreen.tsx completely removed');
  console.log('📐 Improved positioning - elements moved higher and better centered');

  useEffect(() => {
    // Immediately hide the native splash screen to show our custom one
    const hideNativeSplash = async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.log('Native splash screen already hidden');
      }
    };
    
    hideNativeSplash();
  }, []);

  useEffect(() => {
    // Start all animations
    const startAnimations = () => {
      // Main scale animation
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 3000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }).start();

      // Scanning line animation
      Animated.loop(
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ).start();

      // Pulse animation for scanner frame
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Rotating corner elements
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 3000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Fade in text
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();

      // Slide up text
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    };

    startAnimations();

    // Hide splash after 5 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 5000);

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
      console.log('🔍 Checking for updates...');
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        console.log('✅ Update available, showing update modal');
        setUpdateAvailable(true);
      } else {
        console.log('✅ App is up to date');
      }
    } catch (e) {
      console.log('❌ Update check failed:', e);
      Toast.show({
        type: 'error',
        text1: 'Update Check Failed',
        text2: 'Unable to check for updates at the moment.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      console.log('🔄 Fetching update...');
      await Updates.fetchUpdateAsync();
      console.log('✅ Update fetched, reloading app...');
      await Updates.reloadAsync();
    } catch (e) {
      console.log('❌ Failed to update:', e);
      Toast.show({
        type: 'error',
        text1: 'Update Failed',
        text2: 'Please try again later.',
      });
      setIsUpdating(false);
    }
  };

  if (showSplash) {
    return (
      <View style={styles.splashContainer}>
        {/* Background gradient effect */}
        <View style={styles.backgroundGradient}>
          <View style={styles.gradientLayer1} />
          <View style={styles.gradientLayer2} />
        </View>

        {/* Main scanner frame */}
        <Animated.View 
          style={[
            styles.scannerFrame,
            { 
              transform: [
                { scale: scaleAnim },
                { scale: pulseAnim }
              ] 
            }
          ]}
        >
          {/* Corner elements */}
          <View style={styles.cornerTopLeft}>
            <Animated.View 
              style={[
                styles.cornerLine,
                {
                  transform: [{
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }]
                }
              ]}
            />
          </View>
          <View style={styles.cornerTopRight}>
            <Animated.View 
              style={[
                styles.cornerLine,
                {
                  transform: [{
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '-360deg']
                    })
                  }]
                }
              ]}
            />
          </View>
          <View style={styles.cornerBottomLeft}>
            <Animated.View 
              style={[
                styles.cornerLine,
                {
                  transform: [{
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '-360deg']
                    })
                  }]
                }
              ]}
            />
          </View>
          <View style={styles.cornerBottomRight}>
            <Animated.View 
              style={[
                styles.cornerLine,
                {
                  transform: [{
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '360deg']
                    })
                  }]
                }
              ]}
            />
          </View>

          {/* Scanning line */}
          <Animated.View 
            style={[
              styles.scanLine,
              {
                transform: [{
                  translateY: scanLineAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 200]
                  })
                }]
              }
            ]}
          />

          {/* Center scanner icon */}
          <View style={styles.centerIcon}>
            <Ionicons name="scan-circle" size={60} color="#6366f1" />
            <View style={styles.iconGlow} />
          </View>

          {/* QR Code pattern dots */}
          <View style={styles.qrPattern}>
            {[...Array(16)].map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.qrDot,
                  {
                    top: Math.floor(index / 4) * 20 + 20,
                    left: (index % 4) * 20 + 20,
                    opacity: Math.random() * 0.5 + 0.3
                  }
                ]} 
              />
            ))}
          </View>
        </Animated.View>

        {/* App title and subtitle */}
        <Animated.View 
          style={[
            styles.textContainer,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          
          <Text style={styles.scannerText}>Advanced Scanning Technology</Text>
        </Animated.View>

        {/* Loading indicator */}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6366f1" />
          <Text style={styles.loadingText}>Initializing Scanner...</Text>
        </View>
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
            <Ionicons
              name="cloud-download-outline"
              size={48}
              color="#6366f1"
              style={{ marginBottom: 10 }}
            />
            <Text style={styles.modalTitle}>Update Available</Text>
            <Text style={styles.modalSubtitle}>
              A new version of the app is ready. Update now for the best experience.
            </Text>

            <TouchableOpacity
              style={[
                styles.updateButton,
                isUpdating && { backgroundColor: '#94a3b8' },
              ]}
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
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '90%',
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  updateButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
  },
  gradientLayer1: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#f0f2f5', // Light gray background
  },
  gradientLayer2: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#e0e2e7', // Even lighter gray
  },
  scannerFrame: {
    width: 280,
    height: 280,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    marginBottom: 40,
  },
  cornerTopLeft: {
    position: 'absolute',
    top: -10,
    left: -10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerTopRight: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: -10,
    left: -10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cornerLine: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#6366f1',
  },
  scanLine: {
    position: 'absolute',
    width: '100%',
    height: 2,
    backgroundColor: '#6366f1',
    bottom: 0,
  },
  centerIcon: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#f0f2f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  iconGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(99, 102, 241, 0.2)', // Light blue glow
    opacity: 0.5,
  },
  qrPattern: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    overflow: 'hidden',
  },
  qrDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e0e0e0',
  },
  textContainer: {
    position: 'absolute',
    bottom: 150,
    alignItems: 'center',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 5,
  },
  appSubtitle: {
    fontSize: 18,
    color: '#6b7280',
    marginBottom: 10,
  },
  scannerText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#9ca3af',
  },
});
