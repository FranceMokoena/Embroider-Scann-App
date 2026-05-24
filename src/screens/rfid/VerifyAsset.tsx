import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Modal,
  Pressable,
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
import { fetchSectionOptions } from '../../services/assetApi';
import { notifyAssetUpdated } from '../../services/assetSync';
import { PRIMARY_BLUE } from '../../theme/erpTheme';
import { useSectionAwareRefresh } from './hooks/useSectionAwareRefresh';

export default function VerifyAsset({ navigation }: any) {
  const { controller, snapshot } = useRFIDStreamController();

  const ownerId = useMemo(
    () => `VerifyAsset-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`,
    [],
  );

  const [section, setSection] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentDropdownOpen, setDepartmentDropdownOpen] = useState(false);
  const [departmentSearch, setDepartmentSearch] = useState('');
  const [epcValue, setEpcValue] = useState('');
  const [lastScanAt, setLastScanAt] = useState<number | null>(null);
  const [isEpcCaptureActive, setIsEpcCaptureActive] = useState(false);
  const [scannedEpcs, setScannedEpcs] = useState<string[]>([]);
  const [auditAssets, setAuditAssets] = useState<any[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [verificationModalVisible, setVerificationModalVisible] = useState(false);
  const [verificationModalType, setVerificationModalType] = useState<'success' | 'failure'>('success');
  const [verificationModalMessage, setVerificationModalMessage] = useState('');
  const verificationScale = useRef(new Animated.Value(0)).current;
  const verificationIconScale = useRef(new Animated.Value(0)).current;

  const lastCapturedEpcRef = useRef<string | null>(null);
  const tagsScrollRef = useRef<ScrollView | null>(null);

  const isOwner = controller.isOwner(ownerId);

  const isScanning =
    isOwner &&
    (snapshot.lifecycle === 'starting' || snapshot.lifecycle === 'scanning');
  const latestEntry = snapshot.entries[0] ?? null;

  const auditSummary = auditResult
    ? {
        expectedAssets: auditResult.expectedCount ?? 0,
        foundAssets: auditResult.matchedAssets?.length ?? 0,
        missingAssets: auditResult.missingAssets?.length ?? 0,
        unknownAssets:
          (auditResult.unexpectedAssets?.length ?? 0) +
          (auditResult.unregisteredTags?.length ?? 0),
      }
    : null;

  const filteredDepartments = useMemo(() => {
    const query = departmentSearch.trim().toLowerCase();

    if (!query) {
      return departments;
    }

    return departments.filter(department => department.toLowerCase().includes(query));
  }, [departmentSearch, departments]);

  const loadDepartments = useCallback(async () => {
    setDepartmentsLoading(true);
    try {
      const sectionOptions = await fetchSectionOptions();
      setDepartments(sectionOptions);
    } catch (error) {
      console.error('Failed to load sections for audit dropdown', error);
    } finally {
      setDepartmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDepartments();
  }, [loadDepartments]);

  useFocusEffect(
    useCallback(() => {
      void loadDepartments();

      return () => {
        if (controller.isOwner(ownerId)) {
          void controller.stopScan(ownerId);
        }
      };
    }, [controller, ownerId, loadDepartments]),
  );

  useEffect(() => {
    if (!isEpcCaptureActive) return;

    const scanActive =
      snapshot.lifecycle === 'starting' || snapshot.lifecycle === 'scanning';

    if (!scanActive) return;
    if (!latestEntry || latestEntry.epcRaw === lastCapturedEpcRef.current) return;

    lastCapturedEpcRef.current = latestEntry.epcRaw;
    setEpcValue(latestEntry.epcRaw);
    setScannedEpcs(previous => {
      const normalized = normalizeEpc(latestEntry.epcRaw);
      return previous.includes(normalized) ? previous : [normalized, ...previous];
    });
    setLastScanAt(latestEntry.lastSeenAt);
    setIsEpcCaptureActive(false);
    void controller.stopScan(ownerId);
  }, [
    controller,
    isEpcCaptureActive,
    latestEntry,
    ownerId,
    snapshot.lifecycle,
  ]);

  const handleStartCapture = async () => {
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
      Alert.alert(
        'RFID Start Failed',
        error instanceof Error ? error.message : 'Failed to start RFID scanning.',
      );
    }
  };

  const handleEpcChange = (value: string) => {
    const normalizedValue = normalizeEpc(value);
    setEpcValue(normalizedValue);

    if (normalizedValue.trim()) {
      setIsEpcCaptureActive(false);
    }
  };

  const handleAddEpc = () => {
    const normalized = normalizeEpc(epcValue);
    if (!normalized) {
      return;
    }

    setScannedEpcs(previous =>
      previous.includes(normalized) ? previous : [normalized, ...previous],
    );
    setEpcValue('');
    setLastScanAt(Date.now());
  };

  const handleRemoveEpc = (epc: string) => {
    setScannedEpcs(previous => previous.filter(item => item !== epc));
  };

  const handleClearEpc = async () => {
    setEpcValue('');
    setLastScanAt(null);
    setScannedEpcs([]);
    setAuditAssets([]);
    setAuditResult(null);
    setIsEpcCaptureActive(false);

    if (controller.isOwner(ownerId)) {
      await controller.stopScan(ownerId);
    }
  };

  const handleSelectDepartment = (department: string) => {
    setSection(department);
    setDepartmentSearch('');
    setDepartmentDropdownOpen(false);
  };

  const getAssetSection = (asset: any) =>
    String(asset?.section || asset?.department || asset?.category || asset?.location || '').trim();

  const buildAuditRows = (
    expectedAssets: any[],
    lookupResults: Array<{ epc: string; asset: any | null }>,
    selectedLocation: string,
  ) => {
    const expectedByEpc = new Map(expectedAssets.map((asset: any) => [asset.epc, asset]));
    const scannedByEpc = new Map(
      lookupResults.filter(result => result.asset).map(result => [result.epc, result.asset]),
    );

    const uniqueEpcs = Array.from(new Set([normalizeEpc(epcValue), ...scannedEpcs].filter(Boolean)));

    const matchedAssets = uniqueEpcs
      .filter(epc => expectedByEpc.has(epc))
      .map(epc => ({
        ...expectedByEpc.get(epc),
        auditResult: 'Matched',
        verificationStatus: 'Pending',
      }));

    const missingAssets = expectedAssets
      .filter((asset: any) => !uniqueEpcs.includes(asset.epc))
      .map((asset: any) => ({
        ...asset,
        auditResult: 'Missing',
        verificationStatus: 'Pending',
      }));

    const unexpectedAssets = uniqueEpcs
      .filter(epc => {
        const asset = scannedByEpc.get(epc);
        return asset && !expectedByEpc.has(epc) && getAssetSection(asset) !== selectedLocation;
      })
      .map(epc => ({
        ...scannedByEpc.get(epc),
        auditResult: 'Unexpected',
        verificationStatus: 'Pending',
      }));

    const unregisteredTags = uniqueEpcs
      .filter(epc => !scannedByEpc.has(epc))
      .map(epc => ({
        id: `unregistered-${epc}`,
        assetName: 'Unregistered Tag',
        assetNumber: '—',
        epc,
        section: '—',
        status: 'Unregistered',
        serialNumber: '—',
        auditResult: 'Unregistered',
        verificationStatus: 'Pending',
      }));

    return [...matchedAssets, ...unexpectedAssets, ...missingAssets, ...unregisteredTags];
  };

  const reloadSectionAuditInventory = useCallback(async () => {
    const normalizedSection = section.trim();

    if (!normalizedSection || (auditAssets.length === 0 && !auditResult)) {
      return;
    }

    const uniqueEpcs = Array.from(
      new Set([normalizeEpc(epcValue), ...scannedEpcs].filter(Boolean)),
    );

    if (uniqueEpcs.length === 0) {
      return;
    }

    try {
      const assetsResponse = await apiRequest<{ assets: any[] }>(
        `/api/assets?section=${encodeURIComponent(normalizedSection)}`,
        { method: 'GET' },
      );

      const expectedAssets = assetsResponse.assets || [];
      const lookupResults = await Promise.all(
        uniqueEpcs.map(async epc => {
          try {
            const result = await apiRequest<{ asset: any }>(
              `/api/rfid/lookup/${encodeURIComponent(epc)}`,
              { method: 'GET' },
            );

            return { epc, asset: result.asset || null };
          } catch {
            return { epc, asset: null };
          }
        }),
      );

      const rows = buildAuditRows(expectedAssets, lookupResults, normalizedSection);
      setAuditAssets(rows);

      if (auditResult) {
        setAuditResult({
          expectedCount: expectedAssets.length,
          scannedCount: uniqueEpcs.length,
          uniqueScannedCount: uniqueEpcs.length,
          matchedAssets: rows.filter(row => row.auditResult === 'Matched'),
          missingAssets: rows.filter(row => row.auditResult === 'Missing'),
          unexpectedAssets: rows.filter(row => row.auditResult === 'Unexpected'),
          unregisteredTags: rows.filter(row => row.auditResult === 'Unregistered'),
          verificationPercentage: expectedAssets.length === 0
            ? 0
            : Math.round(
                (rows.filter(row => row.auditResult === 'Matched').length / expectedAssets.length) * 100,
              ),
        });
      }
    } catch (error) {
      console.error('Failed to refresh section audit inventory after transfer', error);
    }
  }, [auditAssets.length, auditResult, epcValue, scannedEpcs, section]);

  useSectionAwareRefresh({
    watchedSections: section.trim() ? [section.trim()] : [],
    onRefresh: reloadSectionAuditInventory,
  });

  const handleStartAudit = async () => {
    const normalizedSection = section.trim();
    const uniqueEpcs = Array.from(
      new Set([normalizeEpc(epcValue), ...scannedEpcs].filter(Boolean)),
    );

    if (!normalizedSection) {
      Alert.alert(
        'Section Required',
        'Select a section before starting audit.',
      );
      return;
    }

    if (uniqueEpcs.length === 0) {
      Alert.alert('No Tags Scanned', 'Scan at least one RFID tag before starting audit.');
      return;
    }

    try {
      setIsAuditLoading(true);
      setAuditResult(null);
      setAuditAssets([]);

      const assetsResponse = await apiRequest<{ assets: any[] }>(
        `/api/assets?section=${encodeURIComponent(normalizedSection)}`,
        { method: 'GET' },
      );

      const lookupResults = await Promise.all(
        uniqueEpcs.map(async epc => {
          try {
            const result = await apiRequest<{ asset: any }>(
              `/api/rfid/lookup/${encodeURIComponent(epc)}`,
              { method: 'GET' },
            );

            return { epc, asset: result.asset || null };
          } catch {
            return { epc, asset: null };
          }
        }),
      );

      const expectedAssets = assetsResponse.assets || [];
      const rows = buildAuditRows(expectedAssets, lookupResults, normalizedSection);
      setAuditAssets(rows);
      setAuditResult({
        expectedCount: expectedAssets.length,
        scannedCount: uniqueEpcs.length,
        uniqueScannedCount: uniqueEpcs.length,
        matchedAssets: rows.filter(row => row.auditResult === 'Matched'),
        missingAssets: rows.filter(row => row.auditResult === 'Missing'),
        unexpectedAssets: rows.filter(row => row.auditResult === 'Unexpected'),
        unregisteredTags: rows.filter(row => row.auditResult === 'Unregistered'),
        verificationPercentage: expectedAssets.length === 0
          ? 0
          : Math.round((rows.filter(row => row.auditResult === 'Matched').length / expectedAssets.length) * 100),
      });
    } catch (error) {
      Alert.alert(
        'Audit Failed',
        error instanceof Error ? error.message : 'Unable to load audit data.',
      );
    } finally {
      setIsAuditLoading(false);
    }
  };

  const animateVerification = () => {
    verificationScale.setValue(0);
    verificationIconScale.setValue(0);

    Animated.parallel([
      Animated.spring(verificationScale, {
        toValue: 1,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(120),
        Animated.spring(verificationIconScale, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  };

  const openVerificationModal = (type: 'success' | 'failure', message: string) => {
    setVerificationModalType(type);
    setVerificationModalMessage(message);
    setVerificationModalVisible(true);
    animateVerification();
  };

  const handleVerifyRoom = async () => {
    const normalizedSection = section.trim();
    const uniqueEpcs = Array.from(
      new Set([normalizeEpc(epcValue), ...scannedEpcs].filter(Boolean)),
    );

    if (!normalizedSection) {
      openVerificationModal(
        'failure',
        'Select a section before verification.',
      );
      return;
    }

    if (uniqueEpcs.length === 0) {
      openVerificationModal(
        'failure',
        'Scan at least one RFID tag before verification.',
      );
      return;
    }

    try {
      setIsVerifying(true);
      const result = await apiRequest<{ audit: any }>('/api/rfid/verify-room', {
        method: 'POST',
        body: {
          section: normalizedSection,
          location: normalizedSection,
          epcs: uniqueEpcs,
        },
      });

      setAuditResult(result.audit);
      if (Array.isArray(result.audit?.matchedAssets)) {
        result.audit.matchedAssets.forEach((asset: any) => {
          if (asset?.id) {
            notifyAssetUpdated(asset.id);
          }
        });
        if (result.audit.matchedAssets.length > 0) {
          notifyAssetUpdated();
        }
      }
      const matchedAssets = result.audit.matchedAssets || [];
      const missingAssets = result.audit.missingAssets || [];
      const unexpectedAssets = result.audit.unexpectedAssets || [];
      const unregisteredTags = result.audit.unregisteredTags || [];
      const missingCount = missingAssets.length;
      const unexpectedCount = unexpectedAssets.length;
      const unregisteredCount = unregisteredTags.length;
      const isVerified = missingCount === 0 && unexpectedCount === 0 && unregisteredCount === 0;

      openVerificationModal(
        isVerified ? 'success' : 'failure',
        isVerified
          ? 'The scanned asset list has been verified against the selected section.'
          : 'Verification completed with unresolved section mismatches. Review the audit result table.',
      );

      const matchedEpcs = new Set(matchedAssets.map((asset: any) => asset.epc));
      const missingEpcs = new Set(missingAssets.map((asset: any) => asset.epc));
      const unexpectedEpcs = new Set(unexpectedAssets.map((asset: any) => asset.epc));

      setAuditAssets(previous =>
        previous.map(asset => {
          if (!asset.epc) return asset;
          if (matchedEpcs.has(asset.epc)) {
            return { ...asset, verificationStatus: 'Verified' };
          }
          if (missingEpcs.has(asset.epc)) {
            return { ...asset, verificationStatus: 'Missing' };
          }
          if (unexpectedEpcs.has(asset.epc)) {
            return { ...asset, verificationStatus: 'Mismatch' };
          }
          return asset;
        }),
      );
    } catch (error) {
      openVerificationModal(
        'failure',
        error instanceof Error ? error.message : 'Unable to verify this room.',
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const isVerificationSuccess = verificationModalType === 'success';

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
        ) : null}

        {/* SECTION */}
        <View style={{ marginTop: 14 }}>
          <Text style={styles.sectionLabel}>Select Section</Text>

          <TouchableOpacity
            style={styles.dropdownButton}
            onPress={() => setDepartmentDropdownOpen(prev => !prev)}
            activeOpacity={0.85}
          >
            <Text
              numberOfLines={1}
              style={styles.dropdownButtonText}
            >
              {section || 'Select a section'}
            </Text>

            <Ionicons
              name={departmentDropdownOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color="#374151"
            />
          </TouchableOpacity>

          {departmentDropdownOpen && (
            <View style={styles.dropdownList}>
              <View style={styles.dropdownSearchRow}>
                <Ionicons name="search-outline" size={16} color="#64748b" />
                <TextInput
                  style={styles.dropdownSearchInput}
                  placeholder="Search sections"
                  placeholderTextColor="#94a3b8"
                  value={departmentSearch}
                  onChangeText={setDepartmentSearch}
                  autoCorrect={false}
                />
              </View>

              {departmentsLoading ? (
                <ActivityIndicator size="small" color={PRIMARY_BLUE} />
              ) : departments.length === 0 ? (
                <Text style={styles.dropdownEmptyText}>
                  No sections available yet.
                </Text>
              ) : filteredDepartments.length === 0 ? (
                <Text style={styles.dropdownEmptyText}>
                  No matching sections found.
                </Text>
              ) : (
                filteredDepartments.map(department => (
                  <TouchableOpacity
                    key={department}
                    style={styles.dropdownItem}
                    onPress={() => handleSelectDepartment(department)}
                    activeOpacity={0.75}
                  >
                    <Text numberOfLines={1} style={styles.dropdownItemText}>
                      {department}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
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
                handleEpcChange(value);
                setLastScanAt(null);
              }}
              onBlur={() => {
                setIsEpcCaptureActive(false);
              }}
              onSubmitEditing={handleAddEpc}
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
            />

            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleStartCapture}
              activeOpacity={0.85}
            >
              <Ionicons
                name={isEpcCaptureActive ? 'radio-outline' : 'scan-outline'}
                size={18}
                color="#ffffff"
              />

              <Text style={styles.scanButtonText}>
                {isEpcCaptureActive ? 'Stop' : 'Scan'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.helperText}>
            {isEpcCaptureActive
              ? 'Listening for Chainway RFID broadcasts. Scan the tag now.'
              : 'RFID broadcasts auto-fill this field. Manual EPC entry is still supported.'}
          </Text>

          <View style={styles.manualActionsRow}>
            <TouchableOpacity
              style={styles.addChipButton}
              onPress={handleAddEpc}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={16} color={PRIMARY_BLUE} />
              <Text style={styles.addChipText}>Add Tag</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleClearEpc}>
              <Text style={styles.clearLinkText}>Clear Scanned Tags</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* TAG DISPLAY */}
        <View style={styles.tagDisplayBox}>
          <View style={styles.tagHeaderRow}>
            <Text style={styles.tagDisplayTitle}>Scanned EPC Tags</Text>
            <View style={styles.tagCountBadge}>
              <Text style={styles.tagCountText}>
                {scannedEpcs.length} EPC{scannedEpcs.length === 1 ? '' : 's'}
              </Text>
            </View>
          </View>

          {scannedEpcs.length === 0 ? (
            <Text style={styles.tagDisplayText}>
              Scan tags or enter an EPC to begin the audit capture panel.
            </Text>
          ) : (
            <ScrollView
              ref={ref => { tagsScrollRef.current = ref; }}
              style={styles.tagScrollBox}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              contentContainerStyle={styles.tagChipGrid}
            >
              {scannedEpcs.map(epc => (
                <View key={epc} style={styles.tagChip}>
                  <Text style={styles.tagChipText} numberOfLines={1} ellipsizeMode="middle">
                    {epc}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveEpc(epc)} style={styles.tagRemoveButton}>
                    <Ionicons name="close-circle" size={16} color="#0f172a" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.bottomActionContainer}>
          <TouchableOpacity
            style={styles.startAuditButton}
            onPress={handleStartAudit}
          >
            {isAuditLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.startAuditText}>Start Audit</Text>
            )}
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

        {auditAssets.length > 0 || auditResult ? (
          <View style={styles.auditResultContainer}>
            <Text style={styles.auditResultTitle}>Audit Result</Text>

            {auditResult ? (
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
            ) : null}

            <View style={styles.tableWrap}>
              {isAuditLoading ? (
                <ActivityIndicator size="large" color={PRIMARY_BLUE} style={{ marginVertical: 22 }} />
              ) : auditAssets.length === 0 ? (
                <View style={styles.emptyStateCard}>
                  <Text style={styles.emptyStateTitle}>No audit assets loaded</Text>
                  <Text style={styles.emptyStateDescription}>
                    Start the audit to display matching assets and captured EPC details.
                  </Text>
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader]}>
                      <Text numberOfLines={1} style={[styles.tableCell, styles.tableHeaderCell]}>Asset Name</Text>
                      <Text numberOfLines={1} style={[styles.tableCell, styles.tableHeaderCell]}>Asset Number</Text>
                      <Text numberOfLines={1} style={[styles.tableCell, styles.tableHeaderCell]}>EPC</Text>
                      <Text numberOfLines={1} style={[styles.tableCell, styles.tableHeaderCell]}>Section</Text>
                      <Text numberOfLines={1} style={[styles.tableCell, styles.tableHeaderCell]}>Status</Text>
                      <Text numberOfLines={1} style={[styles.tableCell, styles.tableHeaderCell]}>Serial Number</Text>
                      <Text numberOfLines={1} style={[styles.tableCell, styles.tableHeaderCell]}>Created Date</Text>
                    </View>

                    {auditAssets.map((asset, index) => (
                      <View
                        key={`${asset.epc || asset.assetNumber}-${index}`}
                        style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}
                      >
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.tableCell}>{asset.assetName || '—'}</Text>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.tableCell}>{asset.assetNumber || '—'}</Text>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.tableCell}>{asset.epc || '—'}</Text>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.tableCell}>{getAssetSection(asset) || '—'}</Text>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.tableCell}>{asset.status || '—'}</Text>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.tableCell}>{asset.serialNumber || '—'}</Text>
                        <Text numberOfLines={1} ellipsizeMode="tail" style={styles.tableCell}>
                          {asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : '—'}
                        </Text>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          </View>
        ) : null}

        <Modal
          visible={verificationModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setVerificationModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setVerificationModalVisible(false)}>
            <Animated.View style={[styles.modalCard, { transform: [{ scale: verificationScale }] }]}> 
              <Animated.View
                style={[
                  styles.modalIconCircle,
                  isVerificationSuccess
                    ? styles.modalIconCircleSuccess
                    : styles.modalIconCircleFailure,
                  { transform: [{ scale: verificationIconScale }] },
                ]}
              >
                <Ionicons
                  name={isVerificationSuccess ? 'checkmark' : 'close'}
                  size={42}
                  color={isVerificationSuccess ? '#166534' : '#991b1b'}
                />
              </Animated.View>

              <Text style={styles.modalTitle}>
                {isVerificationSuccess ? 'Verification Successful' : 'Verification Failed'}
              </Text>
              <Text style={styles.modalText}>{verificationModalMessage}</Text>

              <View style={styles.modalStatRow}>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Verified Assets</Text>
                  <Text style={styles.modalStatValue}>
                    {isVerificationSuccess ? auditResult?.matchedAssets?.length ?? 0 : 0}
                  </Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Section</Text>
                  <Text style={styles.modalStatValue}>{section || 'N/A'}</Text>
                </View>
                <View style={styles.modalStatItem}>
                  <Text style={styles.modalStatLabel}>Timestamp</Text>
                  <Text style={styles.modalStatValue}>
                    {isVerificationSuccess && auditResult?.auditTimestamp
                      ? new Date(auditResult.auditTimestamp).toLocaleString()
                      : new Date().toLocaleString()}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setVerificationModalVisible(false)}
                activeOpacity={0.85}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </Animated.View>
          </Pressable>
        </Modal>

      </ScrollView>
    </SafeAreaView>
  );
}
