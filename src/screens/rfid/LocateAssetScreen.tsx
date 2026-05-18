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

type LocateMode = 'epc' | 'assetNumber' | 'serialNumber' | 'assetName' | 'department';

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
};

type RfidLookupResponse = {
  epcRaw?: string;
  tag?: {
    epcRaw?: string;
    epcKey?: string;
  } | null;
  asset?: AssetRecord | null;
  error?: string;
};

const locateOptions: Array<{ label: string; value: LocateMode }> = [
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

const getAssetLocation = (asset: AssetRecord | null) =>
  asset?.location || asset?.department || 'Location metadata unavailable';

const getFieldValue = (asset: AssetRecord, mode: LocateMode) => {
  if (mode === 'epc') return getAssetEpc(asset);
  if (mode === 'assetNumber') return asset.assetNumber || '';
  if (mode === 'serialNumber') return asset.serialNumber || '';
  if (mode === 'assetName') return getAssetName(asset);
  return asset.department || asset.location || '';
};

const assetMatchesMode = (asset: AssetRecord, mode: LocateMode, query: string) => {
  const fieldValue = getFieldValue(asset, mode);

  if (!fieldValue) return false;

  if (mode === 'epc') {
    return normalizeEpc(fieldValue).includes(normalizeEpc(query));
  }

  return fieldValue.toLowerCase().includes(query.toLowerCase());
};

const selectBestAsset = (
  assets: AssetRecord[],
  mode: LocateMode,
  query: string,
) => {
  const normalizedQuery = mode === 'epc'
    ? normalizeEpc(query)
    : query.trim().toLowerCase();

  return assets.find(asset => {
    const fieldValue = getFieldValue(asset, mode);
    const comparable = mode === 'epc'
      ? normalizeEpc(fieldValue)
      : fieldValue.trim().toLowerCase();

    return comparable === normalizedQuery;
  }) || assets[0] || null;
};

export default function LocateAssetScreen({ navigation }: any) {
  const { controller, snapshot } = useRFIDStreamController();
  const ownerId = useMemo(
    () => `LocateAsset-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`,
    [],
  );

  const [locateMode, setLocateMode] = useState<LocateMode>('epc');
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [locatedAsset, setLocatedAsset] = useState<AssetRecord | null>(null);
  const [resultAssets, setResultAssets] = useState<AssetRecord[]>([]);
  const [searchError, setSearchError] = useState('');
  const [lastRfidScanAt, setLastRfidScanAt] = useState<number | null>(null);

  const lastCapturedEpcRef = useRef<string | null>(null);
  const dropdownAnim = useRef(new Animated.Value(0)).current;
  const scanSweep = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const resultFade = useRef(new Animated.Value(0)).current;

  const isOwner = controller.isOwner(ownerId);
  const isRfidScanning =
    isOwner &&
    (snapshot.lifecycle === 'starting' || snapshot.lifecycle === 'scanning');
  const latestEntry = snapshot.entries[0] ?? null;
  const selectedOption = locateOptions.find(option => option.value === locateMode);
  const locationLabel = getAssetLocation(locatedAsset);
  const activeStatus = isRfidScanning || isTracking || isSearching ? 'Scanning' : 'Idle';

  const sweepTranslate = scanSweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-150, 150],
  });

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.75, 1.35],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.68, 1],
    outputRange: [0.4, 0.14, 0],
  });

  useEffect(() => {
    Animated.timing(dropdownAnim, {
      toValue: dropdownOpen ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [dropdownAnim, dropdownOpen]);

  useEffect(() => {
    if (!isOwner && isListening) {
      setIsListening(false);
    }
  }, [isListening, isOwner]);

  useEffect(() => {
    if (!isListening || !isRfidScanning) return;

    if (!latestEntry || latestEntry.epcRaw === lastCapturedEpcRef.current) return;

    lastCapturedEpcRef.current = latestEntry.epcRaw;
    setLocateMode('epc');
    setQuery(normalizeEpc(latestEntry.epcRaw));
    setLastRfidScanAt(latestEntry.lastSeenAt);
    setIsListening(false);
    void controller.stopScan(ownerId);
  }, [controller, isListening, isRfidScanning, latestEntry, ownerId]);

  useEffect(() => {
    if (!isTracking) {
      scanSweep.stopAnimation();
      pulseAnim.stopAnimation();
      resultFade.setValue(0);
      scanSweep.setValue(0);
      pulseAnim.setValue(0);
      return;
    }

    scanSweep.setValue(0);
    pulseAnim.setValue(0);
    resultFade.setValue(0);

    Animated.timing(resultFade, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();

    const sweepLoop = Animated.loop(
      Animated.timing(scanSweep, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
    );
    const pulseLoop = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 1550,
        useNativeDriver: true,
      }),
    );

    sweepLoop.start();
    pulseLoop.start();

    return () => {
      sweepLoop.stop();
      pulseLoop.stop();
    };
  }, [isTracking, pulseAnim, resultFade, scanSweep]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (controller.isOwner(ownerId)) {
          void controller.stopScan(ownerId);
        }
      };
    }, [controller, ownerId]),
  );

  const fetchAssetsByQuery = async (value: string) => {
    const params = new URLSearchParams();
    params.set('q', value.trim());

    const result = await apiRequest<{ assets?: AssetRecord[] }>(
      `/api/assets?${params.toString()}`,
    );

    return result.assets || [];
  };

  const locateByEpc = async (value: string) => {
    const normalizedValue = normalizeEpc(value);

    if (!normalizedValue) {
      return [];
    }

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
      // Fall back to the existing asset search endpoint below.
    }

    const assets = await fetchAssetsByQuery(normalizedValue);
    return assets.filter(asset => assetMatchesMode(asset, 'epc', normalizedValue));
  };

  const handleSearch = async () => {
    const searchValue = query.trim();

    setDropdownOpen(false);
    setSearchError('');
    setLocatedAsset(null);
    setResultAssets([]);
    setIsTracking(false);

    if (!searchValue) {
      setSearchError('Enter an asset reference before searching.');
      return;
    }

    try {
      setIsSearching(true);

      const matches = locateMode === 'epc'
        ? await locateByEpc(searchValue)
        : (await fetchAssetsByQuery(searchValue))
            .filter(asset => assetMatchesMode(asset, locateMode, searchValue));

      const bestAsset = selectBestAsset(matches, locateMode, searchValue);

      setResultAssets(matches);
      setLocatedAsset(bestAsset);
      setIsTracking(Boolean(bestAsset));

      if (!bestAsset) {
        setSearchError('No matching asset was found in the ERP asset registry.');
      }
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : 'Unable to locate this asset.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleStartCapture = async () => {
    if (isRfidScanning) {
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
      setSearchError(error instanceof Error ? error.message : 'Failed to start RFID scanning.');
    }
  };

  const handleStopTracking = async () => {
    setIsTracking(false);
    setLocatedAsset(null);
    setResultAssets([]);
    setSearchError('');
    setQuery('');
    setLastRfidScanAt(null);
    setIsListening(false);
    setDropdownOpen(false);

    if (controller.isOwner(ownerId)) {
      await controller.stopScan(ownerId);
    }
  };

  const renderMapContent = () => {
    if (!locatedAsset || !isTracking) {
      return (
        <View style={styles.mapIdleState}>
          <View style={styles.mapIdleIcon}>
            <Ionicons name="locate-outline" size={26} color={PRIMARY_BLUE} />
          </View>
          <Text style={styles.mapIdleTitle}>Locator Idle</Text>
          <Text style={styles.mapIdleText}>Awaiting asset match from ERP records.</Text>
        </View>
      );
    }

    return (
      <Animated.View style={[styles.mapLiveLayer, { opacity: resultFade }]}>
        <View style={styles.mapGridVertical} />
        <View style={styles.mapGridHorizontal} />
        <View style={styles.mapGridDiagonal} />
        <Animated.View
          style={[
            styles.scanSweep,
            { transform: [{ translateX: sweepTranslate }] },
          ]}
        />
        <Animated.View
          style={[
            styles.pulseRing,
            {
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            },
          ]}
        />
        <View style={styles.assetDotOuter}>
          <View style={styles.assetDotInner} />
        </View>
        <View style={styles.currentLocationTag}>
                <Ionicons name="business-outline" size={15} color={PRIMARY_BLUE} />
          <Text style={styles.currentLocationText} numberOfLines={1}>
            {locationLabel}
          </Text>
        </View>
        <View style={styles.directionCard}>
          <View style={styles.directionIcon}>
            <Ionicons name="navigate-outline" size={18} color="#ffffff" />
          </View>
          <View style={styles.directionCopy}>
            <Text style={styles.directionTitle}>Tracking Route</Text>
            <Text style={styles.directionText} numberOfLines={1}>
              Proceed to {locationLabel}
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  };

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
            <Text style={styles.title}>Locate Asset</Text>
            <Text style={styles.subtitle}>ERP asset tracking and RFID locator</Text>
          </View>
        </View>

        <View style={[
          styles.livePill,
          activeStatus === 'Scanning' && styles.livePillActive,
        ]}
        >
          <View style={[
            styles.liveDot,
            activeStatus === 'Scanning' && styles.liveDotActive,
          ]}
          />
          <Text style={[
            styles.livePillText,
            activeStatus === 'Scanning' && styles.livePillTextActive,
          ]}
          >
            {activeStatus}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.controlPanel}>
          <View style={styles.panelHeaderRow}>
            <View>
              <Text style={styles.eyebrow}>Locate Asset</Text>
              <Text style={styles.panelTitle}>Campus Locator</Text>
            </View>

            <View style={styles.signalPill}>
              <Ionicons name="radio-outline" size={14} color={PRIMARY_BLUE} />
              <Text style={styles.signalText}>
                {isTracking ? 'Signal Locked' : 'Signal Ready'}
              </Text>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.dropdownWrap}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setDropdownOpen(previous => !previous)}
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

              {dropdownOpen ? (
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
                  {locateOptions.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.dropdownItem,
                        locateMode === option.value && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setLocateMode(option.value);
                        setDropdownOpen(false);
                        setSearchError('');
                        setLocatedAsset(null);
                        setResultAssets([]);
                        setIsTracking(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        locateMode === option.value && styles.dropdownItemTextActive,
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
                setQuery(locateMode === 'epc' ? normalizeEpc(value) : value);
                setSearchError('');
                setLocatedAsset(null);
                setResultAssets([]);
                setIsTracking(false);
                setLastRfidScanAt(null);
              }}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.rfidButton}
              onPress={handleStartCapture}
              activeOpacity={0.85}
            >
              <Ionicons
                name={isListening ? 'radio-outline' : 'scan-outline'}
                size={17}
                color={PRIMARY_BLUE}
              />
              <Text style={styles.rfidButtonText}>
                {isListening ? 'Stop Scan' : 'Scan EPC'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.searchButton, isSearching && styles.disabledButton]}
              onPress={handleSearch}
              activeOpacity={0.85}
              disabled={isSearching}
            >
              {isSearching ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="search-outline" size={17} color="#ffffff" />
                  <Text style={styles.searchButtonText}>Search</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {lastRfidScanAt ? (
            <Text style={styles.scanMeta}>
              EPC captured {new Date(lastRfidScanAt).toLocaleTimeString()}
            </Text>
          ) : null}

          {searchError ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={17} color="#b91c1c" />
              <Text style={styles.errorText}>{searchError}</Text>
            </View>
          ) : null}
        </View>

        {locatedAsset ? (
          <View style={styles.resultPanel}>
            <View style={styles.resultHeader}>
              <View>
                <Text style={styles.eyebrow}>Matched Asset</Text>
                <Text style={styles.resultTitle} numberOfLines={1}>
                  {getAssetName(locatedAsset)}
                </Text>
              </View>
              <View style={styles.resultCountPill}>
                <Text style={styles.resultCountText}>
                  {resultAssets.length} match{resultAssets.length === 1 ? '' : 'es'}
                </Text>
              </View>
            </View>

            <View style={styles.metadataGrid}>
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Asset Number</Text>
                <Text style={styles.metadataValue} numberOfLines={1}>
                  {locatedAsset.assetNumber || 'N/A'}
                </Text>
              </View>
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>EPC</Text>
                <Text style={styles.metadataValue} numberOfLines={1}>
                  {getAssetEpc(locatedAsset) || 'N/A'}
                </Text>
              </View>
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Department</Text>
                <Text style={styles.metadataValue} numberOfLines={1}>
                  {locatedAsset.department || 'N/A'}
                </Text>
              </View>
              <View style={styles.metadataItem}>
                <Text style={styles.metadataLabel}>Status</Text>
                <Text style={styles.metadataValue} numberOfLines={1}>
                  {locatedAsset.status || 'Unknown'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View style={styles.mapSection}>
          <View style={styles.mapHeader}>
            <View>
              <Text style={styles.eyebrow}>Campus Map</Text>
              <Text style={styles.mapTitle}>Department Locator View</Text>
            </View>
            <View style={styles.locationPill}>
              <Ionicons name="location-outline" size={14} color="#166534" />
              <Text style={styles.locationPillText} numberOfLines={1}>
                {locatedAsset ? locationLabel : 'Idle'}
              </Text>
            </View>
          </View>

          <View style={styles.mapCanvas}>
            {renderMapContent()}
          </View>

          {locatedAsset ? (
            <View style={styles.locationMetadataCard}>
              <View style={styles.locationMetadataIcon}>
                <Ionicons name="business-outline" size={20} color={PRIMARY_BLUE} />
              </View>
              <View style={styles.locationMetadataCopy}>
                <Text style={styles.locationMetadataTitle} numberOfLines={1}>
                  {locationLabel}
                </Text>
                <Text style={styles.locationMetadataText} numberOfLines={1}>
                  Serial {locatedAsset.serialNumber || 'N/A'} | ID {getAssetId(locatedAsset)}
                </Text>
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.stopButton}
            onPress={handleStopTracking}
            activeOpacity={0.85}
          >
            <Ionicons name="stop-circle-outline" size={18} color="#ffffff" />
            <Text style={styles.stopButtonText}>Stop</Text>
          </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
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
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 10,
  },
  livePillActive: {
    backgroundColor: '#dcfce7',
    borderColor: '#bbf7d0',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#94a3b8',
    marginRight: 6,
  },
  liveDotActive: {
    backgroundColor: '#16a34a',
  },
  livePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
  },
  livePillTextActive: {
    color: '#166534',
  },
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: 10,
    paddingBottom: 28,
  },
  controlPanel: {
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
  signalPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  signalText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dropdownWrap: {
    width: 148,
    marginRight: 8,
    zIndex: 2,
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
  buttonRow: {
    flexDirection: 'row',
    marginTop: 10,
  },
  rfidButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  rfidButtonText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '800',
    color: '#1d4ed8',
  },
  searchButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: PRIMARY_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  searchButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  disabledButton: {
    opacity: 0.7,
  },
  scanMeta: {
    marginTop: 8,
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  errorBanner: {
    marginTop: 10,
    minHeight: 38,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 12,
    fontWeight: '700',
    color: '#b91c1c',
  },
  resultPanel: {
    marginTop: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 14,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  resultTitle: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
    maxWidth: 220,
  },
  resultCountPill: {
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  resultCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
  },
  metadataGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: -8,
  },
  metadataItem: {
    width: '50%',
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  metadataLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  metadataValue: {
    marginTop: 3,
    minHeight: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#edf2f7',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
  },
  mapSection: {
    marginTop: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 14,
  },
  mapHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  mapTitle: {
    marginTop: 3,
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  locationPill: {
    maxWidth: 142,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  locationPillText: {
    flex: 1,
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
  },
  mapCanvas: {
    height: 248,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  mapLiveLayer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapGridVertical: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: '#e2e8f0',
  },
  mapGridHorizontal: {
    position: 'absolute',
    height: 1,
    width: '100%',
    backgroundColor: '#e2e8f0',
  },
  mapGridDiagonal: {
    position: 'absolute',
    width: 1,
    height: 360,
    backgroundColor: '#edf2f7',
    transform: [{ rotate: '45deg' }],
  },
  scanSweep: {
    position: 'absolute',
    width: 54,
    height: '100%',
    backgroundColor: 'rgba(29, 78, 216, 0.12)',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(29, 78, 216, 0.24)',
  },
  pulseRing: {
    position: 'absolute',
    right: 58,
    top: 54,
    width: 138,
    height: 138,
    borderRadius: 69,
    borderWidth: 2,
    borderColor: '#16a34a',
    backgroundColor: 'rgba(22, 163, 74, 0.08)',
  },
  assetDotOuter: {
    position: 'absolute',
    right: 112,
    top: 106,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(22, 163, 74, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetDotInner: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#16a34a',
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  currentLocationTag: {
    position: 'absolute',
    left: 12,
    top: 12,
    maxWidth: '72%',
    minHeight: 36,
    borderRadius: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dbe2ea',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentLocationText: {
    flex: 1,
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  directionCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    minHeight: 58,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  directionIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  directionCopy: {
    flex: 1,
    minWidth: 0,
  },
  directionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  directionText: {
    marginTop: 3,
    fontSize: 11,
    color: '#64748b',
  },
  mapIdleState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  mapIdleIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mapIdleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  mapIdleText: {
    marginTop: 5,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  locationMetadataCard: {
    marginTop: 10,
    minHeight: 58,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationMetadataIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  locationMetadataCopy: {
    flex: 1,
    minWidth: 0,
  },
  locationMetadataTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  locationMetadataText: {
    marginTop: 3,
    fontSize: 11,
    color: '#64748b',
  },
  stopButton: {
    marginTop: 12,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#b91c1c',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
