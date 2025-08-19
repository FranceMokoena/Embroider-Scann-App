import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, StatusBar, Dimensions, Animated, Easing,
  Modal, Pressable
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

export default function CameraScanner({ navigation, route }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [scanSound, setScanSound] = useState(null);
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (permission && !permission.granted) requestPermission();
  }, [permission]);

  // Load scan sound effect
  useEffect(() => {
    const loadSound = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          require('../../assets/SCANNER SOUND.mp3')
        );
        setScanSound(sound);
      } catch (error) {
        console.log('Error loading sound:', error);
        // If sound file is not found, continue without sound
        setScanSound(null);
      }
    };

    loadSound();

    // Cleanup function
    return () => {
      if (scanSound) {
        scanSound.unloadAsync();
      }
    };
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: height * 0.6, // Go from bottom to top of scan frame
          duration: 2000,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), // Smooth bezier curve
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0, // Back to bottom
          duration: 2000,
          easing: Easing.bezier(0.55, 0.055, 0.675, 0.19), // Different easing for return
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    setScanned(true);
    
    // Play scan sound effect
    try {
      if (scanSound) {
        await scanSound.replayAsync();
      }
    } catch (error) {
      console.log('Error playing sound:', error);
    }
    
    setScannedData({ type, data });
    setShowSuccessModal(true);
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    if (route?.params?.onScan) route.params.onScan(scannedData.data);
    navigation.goBack();
  };

  if (!permission) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Text style={styles.text}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Ionicons name="camera-outline" size={64} color="#999" />
        <Text style={styles.text}>Camera access denied</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text style={styles.buttonText}>Allow Camera</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{
            barcodeTypes: [
              'qr',
              'code128',
              'code39',
              'ean13',
              'ean8',
              'upc_a',
              'upc_e',
              'pdf417',
              'aztec',
              'datamatrix'
            ],
          }}
        />
        
        {/* Overlay positioned absolutely on top of camera */}
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan Code</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Scan Frame with animation */}
          <View style={styles.scanFrame}>
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />
            <View style={styles.cornerBL} />
            <View style={styles.cornerBR} />
            <Animated.View
              style={[styles.scanLine, { transform: [{ translateY: scanLineAnim }] }]}
            />
          </View>

          {/* Instructions */}
          <View style={styles.instructions}>
            <Text style={styles.instructionText}>
              Align QR or Barcode inside the frame
            </Text>
          </View>
        </View>
      </View>

      {/* Custom Success Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSuccessModal}
        onRequestClose={handleSuccessModalClose}
      >
        <Pressable style={styles.modalOverlay} onPress={handleSuccessModalClose}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark" size={40} color="#fff" />
              </View>
            </View>
            
            <Text style={styles.successTitle}>SCREEN CAPTURED</Text>
            
            <View style={styles.detailsContainer}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Type:</Text>
                <Text style={styles.detailValue}>{scannedData?.type}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Data:</Text>
                <Text style={styles.detailValue} numberOfLines={3}>
                  {scannedData?.data}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.confirmButton} 
              onPress={handleSuccessModalClose}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  text: { fontSize: 18, color: '#fff', textAlign: 'center', marginTop: 20 },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  cameraContainer: { flex: 1, position: 'relative' },
  camera: { flex: 1 },
  overlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.3)', 
    justifyContent: 'space-between' 
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40,
  },
  headerButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  scanFrame: {
    position: 'absolute', top: height * 0.3, left: width * 0.1,
    right: width * 0.1, bottom: height * 0.3, justifyContent: 'center',
    alignItems: 'center', overflow: 'hidden',
  },
  cornerTL: {
    position: 'absolute', top: 0, left: 0, width: 30, height: 30,
    borderTopWidth: 3, borderLeftWidth: 3, borderColor: '#fff',
  },
  cornerTR: {
    position: 'absolute', top: 0, right: 0, width: 30, height: 30,
    borderTopWidth: 3, borderRightWidth: 3, borderColor: '#fff',
  },
  cornerBL: {
    position: 'absolute', bottom: 0, left: 0, width: 30, height: 30,
    borderBottomWidth: 3, borderLeftWidth: 3, borderColor: '#fff',
  },
  cornerBR: {
    position: 'absolute', bottom: 0, right: 0, width: 30, height: 30,
    borderBottomWidth: 3, borderRightWidth: 3, borderColor: '#fff',
  },
  scanLine: {
    width: '100%', height: 3, 
    backgroundColor: '#00FF00',
    position: 'absolute', left: 0,
    shadowColor: '#00FF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  instructions: {
    paddingBottom: 60, alignItems: 'center',
  },
  instructionText: {
    color: '#fff', fontSize: 16, textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 24,
    paddingVertical: 14, borderRadius: 20, marginBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderRadius: 15,
    padding: 30,
    width: '80%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  successIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0056B3',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  detailsContainer: {
    width: '100%',
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    flexShrink: 1,
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
});