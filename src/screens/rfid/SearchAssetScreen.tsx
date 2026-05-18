import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { apiRequest } from '../../config/api';
import { normalizeEpc } from '../../rfid/chainwayRfid';
import { useRFIDStreamController } from '../../rfid/RFIDStreamController';
import { PRIMARY_BLUE } from '../../theme/erpTheme';

type SearchMode = 'epc' | 'assetNumber' | 'serialNumber' | 'assetName' | 'department';
type SearchStatus = 'Idle' | 'Searching' | 'Listening' | 'Found';

type AssetRecord = {
  id?: string;
  _id?: string;
  assetName?: string;
  name?: string;
  assetNumber?: string | null;
  serialNumber?: string | null;
  epc?: string | null;
  epcKey?: string | null;
  department?: string | null;
  location?: string | null;
  status?: string | null;
  createdAt?: string | null;
  verificationStatus?: string | null;
};

type RfidLookupResponse = {
  epcRaw?: string;
  tag?: {
    epcRaw?: string;
    epcKey?: string;
  } | null;
  asset?: AssetRecord | null;
};

const searchOptions: Array<{ label: string; value: SearchMode }> = [
  { label: 'EPC', value: 'epc' },
  { label: 'Asset Number', value: 'assetNumber' },
  { label: 'Serial Number', value: 'serialNumber' },
  { label: 'Asset Name', value: 'assetName' },
  { label: 'Department', value: 'department' },
];

const getAssetId = (asset: AssetRecord) =>
  asset.id || asset._id || asset.assetNumber || asset.epc || asset.epcKey || 'asset';

const getAssetName = (asset: AssetRecord) =>
  asset.assetName || asset.name || 'Unnamed Asset';

const getAssetEpc = (asset: AssetRecord) =>
  asset.epc || asset.epcKey || '';

const getCurrentLocation = (asset: AssetRecord) =>
  asset.location || asset.department || 'N/A';

const getVerificationStatus = (asset: AssetRecord) =>
  asset.verificationStatus || 'N/A';

const getCreatedDate = (asset: AssetRecord) =>
  asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : 'N/A';

const getFieldValue = (asset: AssetRecord, mode: SearchMode) => {
  if (mode === 'epc') return getAssetEpc(asset);
  if (mode === 'assetNumber') return asset.assetNumber || '';
  if (mode === 'serialNumber') return asset.serialNumber || '';
  if (mode === 'assetName') return getAssetName(asset);
  return asset.department || '';
};

const assetMatchesMode = (asset: AssetRecord, mode: SearchMode, query: string) => {
  const value = getFieldValue(asset, mode);

  if (!value) return false;

  if (mode === 'epc') {
    return normalizeEpc(value) === normalizeEpc(query);
  }

  return value.toLowerCase().includes(query.trim().toLowerCase());
};

export default function SearchAssetScreen({ navigation }: any) {
  const { controller, snapshot } = useRFIDStreamController();
  const ownerId = useMemo(
    () => `SearchAssetScreen-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`,
    [],
  );

  const [searchMode, setSearchMode] = useState<SearchMode>('epc');
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [searchStatus, setSearchStatus] = useState<SearchStatus>('Idle');
  const [isResolvingTarget, setIsResolvingTarget] = useState(false);
  const [targetAssets, setTargetAssets] = useState<AssetRecord[]>([]);
  const [foundAsset, setFoundAsset] = useState<AssetRecord | null>(null);
  const [capturedEpc, setCapturedEpc] = useState('');
  const [message, setMessage] = useState('');

  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const foundPulse = useRef(new Animated.Value(0)).current;
  const processedEpcsRef = useRef<Set<string>>(new Set());
  const targetEpcsRef = useRef<Set<string>>(new Set());
  const targetAssetsRef = useRef<AssetRecord[]>([]);

  const isOwner = controller.isOwner(ownerId);
  const isScanning =
    isOwner &&
    (snapshot.lifecycle === 'starting' || snapshot.lifecycle === 'scanning');
  const latestEntries = snapshot.entries;
  const selectedOption = searchOptions.find(option => option.value === searchMode);
  const tableAssets = foundAsset ? [foundAsset] : targetAssets;

  useEffect(() => {
    if (dropdownOpen) {
      setDropdownVisible(true);
      Animated.timing(dropdownAnim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }).start();
      return;
    }

    Animated.timing(dropdownAnim, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setDropdownVisible(false);
      }
    });
  }, [dropdownAnim, dropdownOpen]);

  useEffect(() => {
    if (searchStatus !== 'Found') {
      foundPulse.stopAnimation();
      foundPulse.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(foundPulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(foundPulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => animation.stop();
  }, [foundPulse, searchStatus]);

  useEffect(() => {
    if (!isOwner && searchStatus === 'Listening') {
      setSearchStatus('Idle');
    }
  }, [isOwner, searchStatus]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (controller.isOwner(ownerId)) {
          void controller.stopScan(ownerId);
        }
      };
    }, [controller, ownerId]),
  );

  const resetTemporarySearchState = () => {
    setTargetAssets([]);
    setFoundAsset(null);
    setCapturedEpc('');
    setMessage('');
    processedEpcsRef.current.clear();
    targetEpcsRef.current.clear();
    targetAssetsRef.current = [];
  };

  const fetchAssetsByQuery = async (value: string) => {
    const params = new URLSearchParams();
    params.set('q', value.trim());

    const result = await apiRequest<{ assets?: AssetRecord[] }>(
      `/api/assets?${params.toString()}`,
    );

    return result.assets || [];
  };

  const resolveTargetAssets = async (value: string) => {
    if (searchMode === 'epc') {
      const normalizedValue = normalizeEpc(value);

      try {
        const lookup = await apiRequest<RfidLookupResponse>(
          `/api/rfid/lookup/${encodeURIComponent(normalizedValue)}`,
        );

        if (lookup.asset) {
          return [{
            ...lookup.asset,
            epc: getAssetEpc(lookup.asset) || lookup.epcRaw || lookup.tag?.epcRaw || normalizedValue,
          }];
        }
      } catch {
        // Continue to the existing asset registry query below.
      }

      const assets = await fetchAssetsByQuery(normalizedValue);
      return assets.filter(asset => assetMatchesMode(asset, 'epc', normalizedValue));
    }

    const assets = await fetchAssetsByQuery(value);
    return assets.filter(asset => assetMatchesMode(asset, searchMode, value));
  };

  const startListeningForTargets = async (assets: AssetRecord[]) => {
    const epcs = assets
      .map(asset => normalizeEpc(getAssetEpc(asset)))
      .filter(Boolean);

    if (epcs.length === 0) {
      setSearchStatus('Idle');
      setMessage('Matching asset found, but no EPC is linked to this asset record.');
      return;
    }

    targetEpcsRef.current = new Set(epcs);
    targetAssetsRef.current = assets;
    processedEpcsRef.current.clear();
    controller.clear();
    await controller.startScan(ownerId);
    setSearchStatus('Listening');
    setMessage('Listening for the matching RFID tag. Unrelated tags are ignored.');
  };

  const handleStartSearch = async () => {
    const value = searchMode === 'epc' ? normalizeEpc(query) : query.trim();

    setDropdownOpen(false);
    resetTemporarySearchState();

    if (!value) {
      setSearchStatus('Idle');
      setMessage('Enter a search reference before starting the RFID search.');
      return;
    }

    try {
      setSearchStatus('Searching');
      setIsResolvingTarget(true);

      const assets = await resolveTargetAssets(value);
      setTargetAssets(assets);

      if (assets.length === 0) {
        setSearchStatus('Idle');
        setMessage('No matching asset was found in the ERP asset registry.');
        return;
      }

      await startListeningForTargets(assets);
    } catch (error) {
      setSearchStatus('Idle');
      setMessage(error instanceof Error ? error.message : 'Unable to start asset search.');
    } finally {
      setIsResolvingTarget(false);
    }
  };

  useEffect(() => {
    if (searchStatus !== 'Listening' || !isScanning) return;

    for (const entry of latestEntries) {
      const normalizedEpc = normalizeEpc(entry.epcRaw);

      if (!normalizedEpc || processedEpcsRef.current.has(normalizedEpc)) {
        continue;
      }

      processedEpcsRef.current.add(normalizedEpc);

      if (!targetEpcsRef.current.has(normalizedEpc)) {
        continue;
      }

      const matchedAsset = targetAssetsRef.current.find(asset =>
        normalizeEpc(getAssetEpc(asset)) === normalizedEpc,
      );

      if (!matchedAsset) {
        continue;
      }

      setCapturedEpc(normalizedEpc);
      setQuery(normalizedEpc);
      setFoundAsset(matchedAsset);
      setTargetAssets([matchedAsset]);
      setSearchStatus('Found');
      setMessage('Matching asset RFID tag detected.');
      void controller.stopScan(ownerId);
      break;
    }
  }, [controller, isScanning, latestEntries, ownerId, searchStatus]);

  const handleStopSearch = async () => {
    resetTemporarySearchState();
    setQuery('');
    setDropdownOpen(false);
    setSearchStatus('Idle');
    setIsResolvingTarget(false);

    if (controller.isOwner(ownerId)) {
      await controller.stopScan(ownerId);
    }
  };

  const pulseScale = foundPulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.015],
  });

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f4f6f8" />

      <View style={styles.header}>
        <View style={styles.leftHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={18} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <Text style={styles.title}>Search Asset</Text>
            <Text style={styles.subtitle}>RFID target search and asset verification</Text>
          </View>
        </View>

        <View style={[
          styles.statusPill,
          searchStatus === 'Searching' && styles.statusPillSearching,
          searchStatus === 'Listening' && styles.statusPillListening,
          searchStatus === 'Found' && styles.statusPillFound,
        ]}
        >
          <View style={[
            styles.statusDot,
            searchStatus === 'Searching' && styles.statusDotSearching,
            searchStatus === 'Listening' && styles.statusDotListening,
            searchStatus === 'Found' && styles.statusDotFound,
          ]}
          />
          <Text style={[
            styles.statusPillText,
            searchStatus === 'Searching' && styles.statusTextSearching,
            searchStatus === 'Listening' && styles.statusTextListening,
            searchStatus === 'Found' && styles.statusTextFound,
          ]}
          >
            {searchStatus}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchPanel}>
          <View style={styles.panelHeaderRow}>
            <View>
              <Text style={styles.eyebrow}>Search By</Text>
              <Text style={styles.panelTitle}>Target Asset Detection</Text>
            </View>

            <View style={styles.listenerBadge}>
              <Ionicons name="radio-outline" size={14} color={PRIMARY_BLUE} />
              <Text style={styles.listenerBadgeText}>
                {isScanning ? 'RFID Active' : 'RFID Ready'}
              </Text>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.dropdownWrap}>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  (searchStatus === 'Listening' || isResolvingTarget) && styles.disabledInput,
                ]}
                onPress={() => setDropdownOpen(previous => !previous)}
                disabled={searchStatus === 'Listening' || isResolvingTarget}
                activeOpacity={0.85}
              >
                <Text style={styles.dropdownButtonText} numberOfLines={1}>
                  {selectedOption?.label || 'EPC'}
                </Text>
                <Ionicons
                  name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#334155"
                />
              </TouchableOpacity>

              {dropdownVisible ? (
                <Animated.View
                  style={[
                    styles.dropdownList,
                    {
                      opacity: dropdownAnim,
                      transform: [{
                        translateY: dropdownAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-6, 0],
                        }),
                      }],
                    },
                  ]}
                >
                  {searchOptions.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.dropdownItem,
                        searchMode === option.value && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setSearchMode(option.value);
                        setDropdownOpen(false);
                        resetTemporarySearchState();
                        setSearchStatus('Idle');
                        setQuery('');
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        searchMode === option.value && styles.dropdownItemTextActive,
                      ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              ) : null}
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Enter asset reference"
              placeholderTextColor="#94a3b8"
              value={query}
              onChangeText={value => {
                setQuery(searchMode === 'epc' ? normalizeEpc(value) : value);
                resetTemporarySearchState();
                setSearchStatus('Idle');
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={searchStatus !== 'Listening' && !isResolvingTarget}
            />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.startButton,
                (isResolvingTarget || searchStatus === 'Listening') && styles.disabledButton,
              ]}
              onPress={handleStartSearch}
              disabled={isResolvingTarget || searchStatus === 'Listening'}
              activeOpacity={0.85}
            >
              {isResolvingTarget ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="play-outline" size={18} color="#ffffff" />
                  <Text style={styles.startButtonText}>Start Search</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.stopButton}
              onPress={handleStopSearch}
              activeOpacity={0.85}
            >
              <Ionicons name="stop-circle-outline" size={18} color="#ffffff" />
              <Text style={styles.stopButtonText}>Stop Search</Text>
            </TouchableOpacity>
          </View>

          {capturedEpc ? (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle-outline" size={17} color="#166534" />
              <Text style={styles.successText} numberOfLines={1}>
                Captured EPC {capturedEpc}
              </Text>
            </View>
          ) : null}

          {message ? (
            <View style={[
              styles.messageBanner,
              searchStatus === 'Found' && styles.messageBannerSuccess,
            ]}
            >
              <Ionicons
                name={searchStatus === 'Found' ? 'checkmark-circle-outline' : 'information-circle-outline'}
                size={17}
                color={searchStatus === 'Found' ? '#166534' : '#475569'}
              />
              <Text style={[
                styles.messageText,
                searchStatus === 'Found' && styles.messageTextSuccess,
              ]}
              >
                {message}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.tableSection}>
          <View style={styles.tableTitleRow}>
            <View>
              <Text style={styles.eyebrow}>Asset Details</Text>
              <Text style={styles.tableTitle}>ERP Asset Record</Text>
            </View>
            <View style={styles.tableCountPill}>
              <Text style={styles.tableCountText}>
                {tableAssets.length} row{tableAssets.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          {isResolvingTarget ? (
            <ActivityIndicator size="large" color={PRIMARY_BLUE} style={{ marginVertical: 30 }} />
          ) : tableAssets.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={38} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No Asset Selected</Text>
              <Text style={styles.emptyText}>
                Start a search to resolve an ERP asset and listen for its RFID tag.
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.table}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Asset Name</Text>
                  <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Asset Number</Text>
                  <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>EPC</Text>
                  <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Department</Text>
                  <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Status</Text>
                  <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Serial Number</Text>
                  <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Created Date</Text>
                  <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Current Location</Text>
                  <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Verification Status</Text>
                </View>

                {tableAssets.map(asset => {
                  const isFoundRow = foundAsset && getAssetId(asset) === getAssetId(foundAsset);
                  const row = (
                    <View
                      key={getAssetId(asset)}
                      style={[
                        styles.tableRow,
                        isFoundRow && styles.foundRow,
                      ]}
                    >
                      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{getAssetName(asset)}</Text>
                      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{asset.assetNumber || 'N/A'}</Text>
                      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="middle">{getAssetEpc(asset) || 'N/A'}</Text>
                      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{asset.department || 'N/A'}</Text>
                      <Text style={[styles.cell, styles.statusCell]} numberOfLines={1} ellipsizeMode="tail">{asset.status || 'N/A'}</Text>
                      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{asset.serialNumber || 'N/A'}</Text>
                      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{getCreatedDate(asset)}</Text>
                      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{getCurrentLocation(asset)}</Text>
                      <Text style={[styles.cell, isFoundRow && styles.verifiedCell]} numberOfLines={1} ellipsizeMode="tail">
                        {isFoundRow ? 'Found' : getVerificationStatus(asset)}
                      </Text>
                    </View>
                  );

                  if (!isFoundRow) {
                    return row;
                  }

                  return (
                    <Animated.View
                      key={getAssetId(asset)}
                      style={{ transform: [{ scale: pulseScale }] }}
                    >
                      {row}
                    </Animated.View>
                  );
                })}
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    marginTop: 25,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dbe2ea',
  },
  leftHeader: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  statusPill: {
    minWidth: 82,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 10,
  },
  statusPillListening: {
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
  },
  statusPillSearching: {
    backgroundColor: '#fef3c7',
    borderColor: '#fde68a',
  },
  statusPillFound: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#94a3b8',
    marginRight: 6,
  },
  statusDotListening: {
    backgroundColor: PRIMARY_BLUE,
  },
  statusDotSearching: {
    backgroundColor: '#d97706',
  },
  statusDotFound: {
    backgroundColor: '#16a34a',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  statusTextListening: {
    color: PRIMARY_BLUE,
  },
  statusTextSearching: {
    color: '#92400e',
  },
  statusTextFound: {
    color: '#166534',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 10,
    paddingBottom: 30,
  },
  searchPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 14,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  panelTitle: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  listenerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  listenerBadgeText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '800',
    color: PRIMARY_BLUE,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dropdownWrap: {
    width: 148,
    marginRight: 8,
    zIndex: 3,
  },
  dropdownButton: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownButtonText: {
    flex: 1,
    marginRight: 6,
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  dropdownList: {
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  dropdownItemActive: {
    backgroundColor: '#eff6ff',
  },
  dropdownItemText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  dropdownItemTextActive: {
    color: PRIMARY_BLUE,
  },
  searchInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0f172a',
  },
  actionRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  startButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: PRIMARY_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  startButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  stopButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#b91c1c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  stopButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  disabledButton: {
    opacity: 0.75,
  },
  disabledInput: {
    opacity: 0.68,
  },
  successBanner: {
    marginTop: 10,
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  successText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 12,
    fontWeight: '800',
    color: '#166534',
  },
  messageBanner: {
    marginTop: 10,
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe2ea',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  messageBannerSuccess: {
    backgroundColor: '#ecfdf5',
    borderColor: '#bbf7d0',
  },
  messageText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  messageTextSuccess: {
    color: '#166534',
  },
  tableSection: {
    marginTop: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 10,
  },
  tableTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  tableTitle: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  tableCountPill: {
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tableCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  emptyState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
  },
  emptyText: {
    marginTop: 5,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  table: {
    minWidth: 1080,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  foundRow: {
    backgroundColor: '#ecfdf5',
  },
  cell: {
    width: 120,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    fontSize: 11,
    color: '#0f172a',
    overflow: 'hidden',
  },
  headerCell: {
    fontWeight: '800',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  statusCell: {
    fontWeight: '800',
    color: '#1d4ed8',
  },
  verifiedCell: {
    fontWeight: '800',
    color: '#166534',
  },
});
