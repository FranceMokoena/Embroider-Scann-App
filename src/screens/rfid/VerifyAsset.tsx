import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import styles from './styles/verifyAssetStyles';
import { normalizeEpc } from '../../rfid/chainwayRfid';
import { useRFIDStreamController } from '../../rfid/RFIDStreamController';
import { apiRequest } from '../../config/api';
import { PRIMARY_BLUE } from '../../theme/erpTheme';

export default function VerifyAsset({ navigation }: any) {
  const { controller, snapshot } = useRFIDStreamController();

  const ownerId = useMemo(
    () => `VerifyAsset-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`,
    [],
  );

  const [location, setLocation] = useState('');
  const [epcValue, setEpcValue] = useState('');
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [scannedEpcs, setScannedEpcs] = useState<string[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);

  const lastCapturedEpcRef = useRef<string | null>(null);

  const isOwner = controller.isOwner(ownerId);

  const isScanning =
    isOwner &&
    (snapshot.lifecycle === 'starting' || snapshot.lifecycle === 'scanning');
  const latestEntry = snapshot.entries[0] ?? null;

  const auditSummary = auditResult
    ? {
        expectedAssets: auditResult.expectedCount,
        foundAssets: auditResult.matchedAssets.length,
        missingAssets: auditResult.missingAssets.length,
        unknownAssets: auditResult.unexpectedAssets.length + auditResult.unregisteredTags.length,
      }
    : null;

  useEffect(() => {
    if (!isOwner && isListening) setIsListening(false);
  }, [isListening, isOwner]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (controller.isOwner(ownerId)) {
          void controller.stopScan(ownerId);
        }
      };
    }, [controller, ownerId]),
  );

  useEffect(() => {
    if (!isListening || !isScanning) return;

    if (!latestEntry || latestEntry.epcRaw === lastCapturedEpcRef.current) return;

    lastCapturedEpcRef.current = latestEntry.epcRaw;
    setEpcValue(latestEntry.epcRaw);
    setScannedEpcs(previous => {
      const normalized = normalizeEpc(latestEntry.epcRaw);
      return previous.includes(normalized) ? previous : [normalized, ...previous];
    });
    setLastScanAt(latestEntry.lastSeenAt);
    setIsListening(false);
    void controller.stopScan(ownerId);
  }, [controller, isListening, isScanning, latestEntry, ownerId]);

  const handleStartCapture = async () => {
    if (isScanning) {
      await controller.stopScan(ownerId);
      setIsListening(false);
      return;
    }

    try {
      setIsListening(true);
      lastCapturedEpcRef.current = null;
      controller.clear();
      await controller.startScan(ownerId);
    } catch (error) {
      setIsListening(false);
      Alert.alert(
        'RFID Start Failed',
        error instanceof Error ? error.message : 'Failed to start RFID scanning.',
      );
    }
  };

  const handleStopCapture = async () => {
    if (controller.isOwner(ownerId)) {
      await controller.stopScan(ownerId);
    }
    setIsListening(false);
  };

  const handleClearEpc = async () => {
    setEpcValue('');
    setLastScanAt(null);
    setScannedEpcs([]);
    setAuditResult(null);
    setIsListening(false);

    if (controller.isOwner(ownerId)) {
      await controller.stopScan(ownerId);
    }
  };

  const handleVerifyRoom = async () => {
    const normalizedLocation = location.trim();
    const epcs = epcValue
      ? Array.from(new Set([normalizeEpc(epcValue), ...scannedEpcs]))
      : scannedEpcs;

    if (!normalizedLocation) {
      Alert.alert('Location Required', 'Enter the room or location before running verification.');
      return;
    }

    if (epcs.length === 0) {
      Alert.alert('No Tags Scanned', 'Scan at least one RFID tag before verification.');
      return;
    }

    try {
      setIsVerifying(true);
      const result = await apiRequest<{ audit: any }>('/api/rfid/verify-room', {
        method: 'POST',
        body: {
          location: normalizedLocation,
          epcs,
        },
      });

      setAuditResult(result.audit);
    } catch (error) {
      Alert.alert('Verification Failed', error instanceof Error ? error.message : 'Unable to verify this room.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f6fb" />

      {/* HEADER */}
      <View style={styles.screenHeader}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#111827" />
        </TouchableOpacity>

        <View>
          <Text style={styles.screenTitle}>Verify Asset</Text>
          <Text style={styles.screenSubtitle}>
            RFID audit verification workspace
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>

      

        {/* SUMMARY KPI GRID */}
        {auditSummary ? (
          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{auditSummary.expectedAssets}</Text>
              <Text style={styles.summaryLabel}>Expected</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{auditSummary.foundAssets}</Text>
              <Text style={styles.summaryLabel}>Found</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{auditSummary.missingAssets}</Text>
              <Text style={styles.summaryLabel}>Missing</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryValue}>{auditSummary.unknownAssets}</Text>
              <Text style={styles.summaryLabel}>Unknown</Text>
            </View>
          </View>
        ) : (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Room verification ready</Text>
            <Text style={styles.infoDescription}>
              Scan tags and submit verification to compare the room inventory against the asset database.
            </Text>
          </View>
        )}

        {/* LOCATION */}
        <View style={{ marginTop: 14 }}>
          <Text style={styles.sectionLabel}>Location</Text>

          <TextInput
            style={styles.locationInput}
            placeholder="Enter audit location"
            placeholderTextColor="#9ca3af"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        {/* EPC INPUT */}
        <View style={styles.scanInputContainer}>
          <Text style={styles.sectionLabel}>RFID Tag Input</Text>

          <View style={styles.captureRow}>
            <TextInput
              style={styles.epcInput}
              placeholder="Scan or enter EPC"
              placeholderTextColor="#9ca3af"
              value={epcValue}
              onChangeText={(value) => {
                setEpcValue(normalizeEpc(value));
                setLastScanAt(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
            />


           <TouchableOpacity
  style={styles.scanButton}
  onPress={handleStartCapture}
  activeOpacity={0.85}
>
  <Ionicons
    name={isListening ? 'radio-outline' : 'scan-outline'}
    size={18}
    color="#ffffff"
  />

  <Text style={styles.scanButtonText}>
    {isListening ? 'Stop' : 'Scan'}
  </Text>
</TouchableOpacity>
          </View>

          <TouchableOpacity onPress={handleClearEpc}>
            <Text style={{ color: PRIMARY_BLUE, marginTop: 10, fontWeight: '600' }}>
              Clear Tag
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAG DISPLAY */}
        <View style={styles.tagDisplayBox}>
          <Text style={styles.tagDisplayText}>
            {epcValue
              ? epcValue
              : 'Scan a tag or enter an EPC to start room verification.'}
          </Text>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.bottomActionContainer}>
          <TouchableOpacity
            style={styles.startAuditButton}
            onPress={handleStartCapture}
          >
            <Text style={styles.startAuditText}>Start Audit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.verifyButton}
            onPress={handleVerifyRoom}
            disabled={isVerifying}
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.verifyText}>Verify</Text>
            )}
          </TouchableOpacity>
        </View>

        {auditResult ? (
          <View style={styles.auditResultContainer}>
            <Text style={styles.auditResultTitle}>Verification Summary</Text>
            <View style={styles.auditOverviewRow}>
              <View style={styles.auditOverviewCard}>
                <Text style={styles.auditOverviewValue}>{auditResult.expectedCount}</Text>
                <Text style={styles.auditOverviewLabel}>Expected</Text>
              </View>
              <View style={styles.auditOverviewCard}>
                <Text style={styles.auditOverviewValue}>{auditResult.uniqueScannedCount}</Text>
                <Text style={styles.auditOverviewLabel}>Scanned</Text>
              </View>
              <View style={styles.auditOverviewCard}>
                <Text style={styles.auditOverviewValue}>{auditResult.verificationPercentage}%</Text>
                <Text style={styles.auditOverviewLabel}>Verified</Text>
              </View>
            </View>

            <View style={styles.auditSummaryRow}>
              <Text style={styles.auditSummaryText}>Matched assets: {auditResult.matchedAssets.length}</Text>
              <Text style={styles.auditSummaryText}>Missing assets: {auditResult.missingAssets.length}</Text>
            </View>

            <View style={styles.auditListCard}>
              <Text style={styles.auditListTitle}>Missing Assets</Text>
              {auditResult.missingAssets.length > 0 ? (
                auditResult.missingAssets.map((asset: any) => (
                  <Text key={asset.id} style={styles.auditListItem}>
                    {asset.assetName} ({asset.assetNumber})
                  </Text>
                ))
              ) : (
                <Text style={styles.auditListEmpty}>No missing assets detected.</Text>
              )}
            </View>

            <View style={styles.auditListCard}>
              <Text style={styles.auditListTitle}>Unexpected Assets</Text>
              {auditResult.unexpectedAssets.length > 0 ? (
                auditResult.unexpectedAssets.map((asset: any) => (
                  <Text key={asset.id} style={styles.auditListItem}>
                    {asset.assetName} ({asset.assetNumber}) — {asset.location || 'Unknown location'}
                  </Text>
                ))
              ) : (
                <Text style={styles.auditListEmpty}>No unexpected assets detected.</Text>
              )}
            </View>

            <View style={styles.auditListCard}>
              <Text style={styles.auditListTitle}>Unregistered Tags</Text>
              {auditResult.unregisteredTags.length > 0 ? (
                auditResult.unregisteredTags.map((tag: any) => (
                  <Text key={tag.epc} style={styles.auditListItem}>{tag.epc}</Text>
                ))
              ) : (
                <Text style={styles.auditListEmpty}>All scanned tags are registered.</Text>
              )}
            </View>
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}
