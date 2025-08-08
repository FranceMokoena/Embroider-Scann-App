import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  SafeAreaView, StatusBar, Dimensions, Animated, Easing
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function CameraScanner({ navigation, route }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (permission && !permission.granted) requestPermission();
  }, [permission]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: height * 0.4,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    if (scanned) return;
    setScanned(true);

    Alert.alert('Scanned Successfully', `Type: ${type}\nData: ${data}`, [
      {
        text: 'OK',
        onPress: () => {
          if (route?.params?.onScan) route.params.onScan(data);
          navigation.goBack();
        },
      },
    ]);
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
      >
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
      </CameraView>
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
  camera: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'space-between' },
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
    width: '100%', height: 2, backgroundColor: '#00FF00AA',
    position: 'absolute', left: 0,
  },
  instructions: {
    paddingBottom: 60, alignItems: 'center',
  },
  instructionText: {
    color: '#fff', fontSize: 16, textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 24,
    paddingVertical: 14, borderRadius: 20, marginBottom: 20,
  },
});