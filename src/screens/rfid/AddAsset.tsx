import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import RfidFormField from './components/RfidFormField';
import RfidSelectField from './components/RfidSelectField';
import styles from './styles/addAssetStyles';
import { useRFIDStreamController } from '../../rfid/RFIDStreamController';
import { normalizeEpc } from '../../rfid/chainwayRfid';
import { apiRequest } from '../../config/api';
import { PRIMARY_BLUE } from '../../theme/erpTheme';

const EPC_REGEX = /^[A-Z0-9]{12,24}$/;

const statusOptions = [
  {
    value: 'Healthy',
    description: 'Ready for active use with no defects recorded.',
    icon: 'shield-checkmark-outline',
    color: PRIMARY_BLUE,
  },
  {
    value: 'Repairable',
    description: 'Requires attention but can be restored to service.',
    icon: 'construct-outline',
    color: '#0f766e',
  },
  {
    value: 'Beyond Repair',
    description: 'Marked for replacement or write-off handling.',
    icon: 'close-circle-outline',
    color: '#b91c1c',
  },
] as const;

type CreateAssetPayload = {
  assetName: string;
  assetNumber: string;
  epc: string;
  serialNumber?: string;
  section?: string;
  status?: string;
};

type AssetApiResponse = {
  success?: boolean;
  message?: string;
  error?: string;
};

const optionalString = (value: string) => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export default function AddAsset({ navigation }: any) {
  const { controller, snapshot } = useRFIDStreamController();
  const ownerId = useMemo(
    () => `AddAsset-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`,
    [],
  );
  const [assetName, setAssetName] = useState('');
  const [assetNumber, setAssetNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [epcValue, setEpcValue] = useState('');
  const [section, setSection] = useState('');
  const [status, setStatus] = useState('');
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEpcCaptureActive, setIsEpcCaptureActive] = useState(false);
  const lastCapturedEpcRef = useRef<string | null>(null);

  const isOwner = controller.isOwner(ownerId);
  const isScanning = isOwner &&
    (snapshot.lifecycle === 'starting' || snapshot.lifecycle === 'scanning');
  const latestEntry = snapshot.entries[0] ?? null;

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (!controller.isOwner(ownerId)) {
          return;
        }

        void controller.stopScan(ownerId);
      };
    }, [controller, ownerId]),
  );

  useEffect(() => {
    if (!isEpcCaptureActive || !isScanning) {
      return;
    }

    if (!latestEntry || latestEntry.epcRaw === lastCapturedEpcRef.current) {
      return;
    }

    lastCapturedEpcRef.current = latestEntry.epcRaw;
    setEpcValue(latestEntry.epcRaw);
    setIsEpcCaptureActive(false);
    void controller.stopScan(ownerId);
  }, [controller, isEpcCaptureActive, isScanning, latestEntry, ownerId]);

  const handleStartEpcCapture = async () => {
    if (isScanning) {
      await controller.stopScan(ownerId);
      setIsEpcCaptureActive(false);
      return;
    }

    try {
      setEpcValue('');
      setIsEpcCaptureActive(true);
      lastCapturedEpcRef.current = null;
      controller.clear();
      await controller.startScan(ownerId);
    } catch (error) {
      setIsEpcCaptureActive(false);
      const message = error instanceof Error ? error.message : 'Failed to start RFID scanning.';
      Alert.alert('RFID Start Failed', message);
    }
  };

  const handleEpcChange = (value: string) => {
    const normalizedValue = normalizeEpc(value);
    setEpcValue(normalizedValue);

    if (normalizedValue.trim()) {
      setIsEpcCaptureActive(false);
    }
  };

  const buildAssetPayload = (): CreateAssetPayload | null => {
    const trimmedAssetName = assetName.trim();
    const trimmedAssetNumber = assetNumber.trim();
    const normalizedEpc = epcValue.trim().toUpperCase();

    if (!trimmedAssetName) {
      Alert.alert('Missing Asset Name', 'Please enter an asset name.');
      return null;
    }

    if (!trimmedAssetNumber) {
      Alert.alert('Missing Asset Number', 'Please enter an asset tag or asset number.');
      return null;
    }

    if (!normalizedEpc) {
      Alert.alert('Missing EPC', 'Please enter the EPC / RFID tag value.');
      return null;
    }

    if (!EPC_REGEX.test(normalizedEpc)) {
      Alert.alert('Invalid EPC', 'EPC must be 12-24 alphanumeric characters.');
      return null;
    }

    return {
      assetName: trimmedAssetName,
      assetNumber: trimmedAssetNumber,
      serialNumber: optionalString(serialNumber),
      epc: normalizedEpc,
      section: optionalString(section),
      status: optionalString(status),
    };
  };

  const clearForm = () => {
    setAssetName('');
    setAssetNumber('');
    setSerialNumber('');
    setEpcValue('');
    
    setSection('');
    setStatus('');
    setIsEpcCaptureActive(false);
  };

  const parseAssetResponse = async (response: Response): Promise<AssetApiResponse> => {
    const contentType = response.headers.get('content-type');

    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    const text = await response.text();
    return { error: text || 'Server returned a non-JSON response' };
  };

  const handleSaveAsset = async () => {
    if (isSaving) return;

    const payload = buildAssetPayload();
    if (!payload) return;

    setIsSaving(true);

    try {
      const result = await apiRequest<AssetApiResponse>('/api/assets', {
        method: 'POST',
        body: payload,
      });

      Alert.alert('Asset Saved', result.message || 'Asset created successfully.');
      clearForm();
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : 'Failed to save asset. Please try again.';

      Alert.alert('Save Failed', message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View style={styles.screenHeader}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.screenTitle}>Register New Asset</Text>
          <Text style={styles.screenSubtitle}>Create a clean RFID-ready asset record.</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        
        

        <View style={styles.formCard}>
          
          <Text style={styles.sectionTitle}>Asset Details</Text>
        

          <RfidFormField
            label="Asset Name"
            value={assetName}
            onChangeText={setAssetName}
            placeholder="Enter asset name"
          />



          <RfidFormField
            label="Asset Tag / Asset Number"
            value={assetNumber}
            onChangeText={setAssetNumber}
            placeholder="Enter asset tag or internal number"
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <RfidFormField
            label="Serial Number"
            value={serialNumber}
            onChangeText={setSerialNumber}
            placeholder="Enter serial number"
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EPC / RFID Tag</Text>
            <View style={styles.epcRow}>
              <TextInput
                style={[styles.textInput, styles.epcInput]}
                placeholder="Enter EPC / RFID tag"
                placeholderTextColor="#94a3b8"
                value={epcValue}
                onChangeText={handleEpcChange}
                onBlur={() => {
                  setIsEpcCaptureActive(false);
                }}
                autoCapitalize="characters"
                autoCorrect={false}
              />

              <TouchableOpacity
                style={styles.scanButton}
                onPress={handleStartEpcCapture}
                activeOpacity={0.85}
              >
                <Ionicons
                  name={isEpcCaptureActive ? 'radio-outline' : 'scan-outline'}
                  size={18}
                  color={PRIMARY_BLUE}
              />
                <Text style={styles.scanButtonText}>{isEpcCaptureActive ? 'Stop' : 'Scan'}</Text>
            </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>
              {isEpcCaptureActive
                ? 'Listening for Chainway RFID broadcasts. Scan the tag now.'
                : 'RFID broadcasts auto-fill this field. Manual EPC entry is still supported.'}
            </Text>
          </View>

          <RfidFormField
            label="Section"
            value={section}
            onChangeText={setSection}
            placeholder="Enter section"
          />

          <RfidSelectField
            label="Status"
            value={status}
            placeholder="Select asset status"
            onPress={() => setStatusModalVisible(true)}
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, isSaving && { opacity: 0.65 }]}
            onPress={handleSaveAsset}
            disabled={isSaving}
            activeOpacity={0.85}
          >
            {isSaving ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#ffffff" />
                <Text style={[styles.primaryButtonText, { marginLeft: 8 }]}>Saving...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>Save Asset</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <Pressable style={styles.statusBackdrop} onPress={() => setStatusModalVisible(false)}>
          <Pressable style={styles.statusModalCard} onPress={() => {}}>
            <Text style={styles.statusModalTitle}>Select Status</Text>
            <Text style={styles.statusModalSubtitle}>
              Choose the current condition for this asset.
            </Text>

            {statusOptions.map(option => (
              <TouchableOpacity
                key={option.value}
                style={styles.statusOption}
                onPress={() => {
                  setStatus(option.value);
                  setStatusModalVisible(false);
                }}
                activeOpacity={0.85}
              >
                <View style={styles.statusOptionTextWrap}>
                  <Text style={styles.statusOptionTitle}>{option.value}</Text>
                  <Text style={styles.statusOptionDescription}>{option.description}</Text>
                </View>
                <Ionicons name={option.icon} size={22} color={option.color} />
              </TouchableOpacity>
            ))}

            <TouchableOpacity
              style={styles.statusCloseButton}
              onPress={() => setStatusModalVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.statusCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
