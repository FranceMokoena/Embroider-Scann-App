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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import styles from './styles/searchAssetStyles';
import { normalizeEpc } from '../../rfid/chainwayRfid';
import { useRFIDStreamController } from '../../rfid/RFIDStreamController';
import { apiRequest } from '../../config/api';

type SearchMode = 'epc' | 'assetNumber' | 'serialNumber';
type AssetResult = {
  id: string;
  assetName: string;
  assetNumber: string;
  serialNumber?: string | null;
  epc: string;
  department?: string | null;
  status?: string | null;
  location?: string | null;
};

export default function SearchAsset({ navigation, route }: any) {
  const { controller, snapshot } = useRFIDStreamController();
  const ownerId = useMemo(
    () => `SearchAsset-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`,
    [],
  );
  const [searchMode, setSearchMode] = useState<SearchMode>('epc');
  const [query, setQuery] = useState('');
  const [lastRfidScanAt, setLastRfidScanAt] = useState<number | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [assets, setAssets] = useState<AssetResult[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const lastCapturedEpcRef = useRef<string | null>(null);
  const statusFilter = route?.params?.statusFilter as string | undefined;
  const isOwner = controller.isOwner(ownerId);
  const isScanning = isOwner &&
    (snapshot.lifecycle === 'starting' || snapshot.lifecycle === 'scanning');
  const latestEntry = snapshot.entries[0] ?? null;

  useEffect(() => {
    if (!isOwner && isListening) {
      setIsListening(false);
    }
  }, [isListening, isOwner]);

  useFocusEffect(
    useCallback(() => {
      void fetchAssets();

      return () => {
        if (!controller.isOwner(ownerId)) {
          return;
        }

        void controller.stopScan(ownerId);
      };
    }, [controller, ownerId, statusFilter]),
  );

  useEffect(() => {
    if (!isListening || !isScanning) {
      return;
    }

    if (!latestEntry || latestEntry.epcRaw === lastCapturedEpcRef.current) {
      return;
    }

    lastCapturedEpcRef.current = latestEntry.epcRaw;
    setSearchMode('epc');
    setQuery(latestEntry.epcRaw);
    setLastRfidScanAt(latestEntry.lastSeenAt);
    setIsListening(false);
    void controller.stopScan(ownerId);
  }, [controller, isListening, isScanning, latestEntry, ownerId]);

  const fetchAssets = async (overrideQuery = query) => {
    try {
      setIsLoadingAssets(true);

      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (overrideQuery.trim()) params.set('q', overrideQuery.trim());

      const result = await apiRequest<{ assets?: AssetResult[] }>(
        `/api/assets?${params.toString()}`,
      );

      setAssets(result.assets || []);
    } catch (error) {
      Alert.alert('Asset Search Failed', error instanceof Error ? error.message : 'Unable to load assets.');
    } finally {
      setIsLoadingAssets(false);
    }
  };

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
      const message = error instanceof Error ? error.message : 'Failed to start RFID scanning.';
      Alert.alert('RFID Start Failed', message);
    }
  };

  const handleClear = async () => {
    setQuery('');
    setLastRfidScanAt(null);
    setIsListening(false);

    if (controller.isOwner(ownerId)) {
      await controller.stopScan(ownerId);
    }

    console.log('Search Asset input cleared');
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
          <Text style={styles.screenTitle}>Search Asset</Text>
          <Text style={styles.screenSubtitle}>Identify RFID-linked assets from EPC or asset references.</Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconWrap}>
              <Ionicons name="search-outline" size={28} color="#ffffff" />
            </View>
            <Text style={styles.heroTitle}>Enterprise Asset Search</Text>
          </View>

          <Text style={styles.heroDescription}>
            Search asset records by EPC, asset number, or serial number. Results are filtered by status and displayed with a clean ERP table layout.
          </Text>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionEyebrow}>Section 1</Text>
          <Text style={styles.sectionTitle}>Search Input Area</Text>
          <Text style={styles.sectionDescription}>
            Capture an EPC from the Chainway broadcast listener or enter an asset reference manually.
          </Text>

          <Text style={styles.fieldLabel}>Search Value</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Enter EPC, asset number, or serial number"
            placeholderTextColor="#94a3b8"
            value={query}
            onChangeText={value => {
              setQuery(searchMode === 'epc' ? normalizeEpc(value) : value);
              setLastRfidScanAt(null);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <View style={styles.primaryActionRow}>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleStartCapture}
              activeOpacity={0.85}
            >
              <Ionicons name={isListening ? 'radio-outline' : 'scan-outline'} size={18} color="#ffffff" />
              <Text style={styles.scanButtonText}>{isListening ? 'Stop' : 'Scan'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => fetchAssets()}
              activeOpacity={0.85}
            >
              <Ionicons name="search-outline" size={18} color="#ffffff" />
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh-outline" size={16} color="#475569" />
            <Text style={styles.clearButtonText}>Clear Input</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionEyebrow}>Section 2</Text>
          <Text style={styles.sectionTitle}>Search Filters</Text>
          <Text style={styles.sectionDescription}>
            Use these placeholder filters to define how the future RFID lookup should interpret
            the entered value.
          </Text>

          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                searchMode === 'epc' && styles.filterChipActive,
              ]}
              onPress={() => setSearchMode('epc')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.filterChipText,
                  searchMode === 'epc' && styles.filterChipTextActive,
                ]}
              >
                Search by EPC/RFID
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                searchMode === 'assetNumber' && styles.filterChipActive,
              ]}
              onPress={() => setSearchMode('assetNumber')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.filterChipText,
                  searchMode === 'assetNumber' && styles.filterChipTextActive,
                ]}
              >
                Search by Asset Number
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterChip,
                searchMode === 'serialNumber' && styles.filterChipActive,
              ]}
              onPress={() => setSearchMode('serialNumber')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.filterChipText,
                  searchMode === 'serialNumber' && styles.filterChipTextActive,
                ]}
              >
                Search by Serial Number
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionEyebrow}>Search Results</Text>
          <Text style={styles.sectionTitle}>
            {statusFilter ? `${statusFilter} Assets` : 'Search Results'}
          </Text>
          <Text style={styles.sectionDescription}>
            Search the ERP asset registry and filter results using status or an asset identifier.
          </Text>

          {assets.length === 0 ? (
            <View style={styles.emptyStateCard}>
              <View style={styles.emptyStateIconWrap}>
                <Ionicons name="business-outline" size={28} color="#1d4ed8" />
              </View>
              <Text style={styles.emptyStateTitle}>
                {isLoadingAssets ? 'Loading assets...' : query ? 'No matching assets found' : 'No assets available'}
              </Text>
              <Text style={styles.emptyStateDescription}>
                {query
                  ? `${query}${lastRfidScanAt ? ` scanned at ${new Date(lastRfidScanAt).toLocaleTimeString()}` : ''}`
                  : 'Use the search input or status cards to load assets from the ERP registry.'}
              </Text>
            </View>
          ) : (
            <View style={styles.assetTable}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, styles.firstColumn]}>Asset Name</Text>
                <Text style={styles.tableHeaderCell}>Asset Number</Text>
                <Text style={styles.tableHeaderCell}>EPC</Text>
                <Text style={styles.tableHeaderCell}>Department</Text>
                <Text style={styles.tableHeaderCell}>Status</Text>
              </View>
              {assets.map(asset => (
                <View key={asset.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.firstColumn]}>{asset.assetName}</Text>
                  <Text style={styles.tableCell}>{asset.assetNumber}</Text>
                  <Text style={styles.tableCell}>{asset.epc}</Text>
                  <Text style={styles.tableCell}>{asset.department || 'N/A'}</Text>
                  <Text style={styles.tableCell}>{asset.status || 'Unknown'}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => fetchAssets()}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>View Details</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => fetchAssets()}
            activeOpacity={0.85}
          >
            <Text style={styles.primaryButtonText}>Search</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleClear}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryButtonText}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
