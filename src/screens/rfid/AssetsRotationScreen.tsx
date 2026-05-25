import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';

import { ApiError } from '../../config/api';
import {
  fetchAllAssets,
  fetchAssetSectionOptions,
  fetchAssignmentLifecycle,
  getAssetDisplayName,
  getAssetId,
  transferAssets,
  type AssetLifecycleRecord,
  type AssetRecord,
  type TransferAssetsResponse,
} from '../../services/assetApi';
import { PRIMARY_BLUE } from '../../theme/erpTheme';
import { getVerificationContext } from '../../utils/verificationSemantics';
import { exportTransferHistoryToPdf } from '../../utils/assetPdfExport';
import { useSectionAwareRefresh } from './hooks/useSectionAwareRefresh';

const dash = '-';
const allSectionsValue = '__all_sections__';
const keepCurrentStatusValue = '__keep_current_status__';
const previewLimit = 8;
const historyLimit = 40;
const statusOptions = ['Healthy', 'Repairable', 'Beyond Repair'];

const normalizeText = (value?: string | null) =>
  typeof value === 'string' ? value.trim() : '';

const normalizeSectionKey = (value?: string | null) =>
  normalizeText(value).toLowerCase();

const normalizeSectionOptions = (values: string[]) =>
  Array.from(
    new Set(values.map(section => normalizeText(section)).filter(Boolean)),
  ).sort((left, right) => left.localeCompare(right));

const getAssetSection = (asset: AssetRecord) =>
  normalizeText(asset.currentSection) || normalizeText(asset.section) || dash;

const getAssetEpc = (asset: AssetRecord) =>
  normalizeText(asset.epc) || normalizeText(asset.epcKey) || dash;

const getAssetStatus = (asset: AssetRecord) =>
  normalizeText(asset.status) || dash;

const isValidStatusOption = (value: string) =>
  statusOptions.includes(value);

const formatDateTime = (value?: string | null) => {
  if (!value) return dash;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? dash : date.toLocaleString();
};

const getLifecycleDate = (record: AssetLifecycleRecord) =>
  record.assignedAt || record.lastUpdated || null;

const getAssetKey = (asset: AssetRecord, index: number) =>
  getAssetId(asset) ||
  normalizeText(asset.epc) ||
  normalizeText(asset.epcKey) ||
  normalizeText(asset.assetNumber) ||
  `asset-${index}`;

const getHistoryKey = (record: AssetLifecycleRecord, index: number) =>
  record._id ||
  `${record.assetId || record.assetName || 'history'}-${record.assignedAt || record.lastUpdated || 'unknown'}-${index}`;

const isTransferResponse = (value: unknown): value is TransferAssetsResponse => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybe = value as Partial<TransferAssetsResponse>;

  return Boolean(
    maybe.summary &&
    Array.isArray(maybe.transferred) &&
    Array.isArray(maybe.errors),
  );
};

const getTransferResponseFromError = (error: unknown) => {
  if (error instanceof ApiError && isTransferResponse(error.data)) {
    return error.data;
  }

  return null;
};

const getTransferFailedAssetIds = (result: TransferAssetsResponse) =>
  result.errors.map(item => item.assetId).filter(Boolean);

const getTransferAlertMessage = (result: TransferAssetsResponse) => {
  const summaryLine =
    `${result.summary.transferred} transferred, ` +
    `${result.summary.skipped} skipped, ` +
    `${result.summary.failed} failed.`;

  const firstError = result.errors[0]?.message;
  const firstSkipped = result.skipped[0]?.reason;

  if (firstError) {
    return `${summaryLine}\n\nFirst error: ${firstError}`;
  }

  if (firstSkipped) {
    return `${summaryLine}\n\nFirst skipped reason: ${firstSkipped}`;
  }

  return summaryLine;
};

const hasTransferIssues = (result: TransferAssetsResponse) =>
  result.summary.failed > 0 ||
  result.summary.skipped > 0 ||
  result.summary.transferred === 0;

export default function AssetsRotationScreen({ navigation }: any) {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [history, setHistory] = useState<AssetLifecycleRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [isExportingHistory, setIsExportingHistory] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [sectionFilter, setSectionFilter] = useState(allSectionsValue);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [targetSection, setTargetSection] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [transferReason, setTransferReason] = useState('');

  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [transferResult, setTransferResult] =
    useState<TransferAssetsResponse | null>(null);

  const loadData = useCallback(
    async (options: { showLoader?: boolean; showHistoryLoader?: boolean } = {}) => {
      if (options.showLoader) {
        setLoading(true);
      }
      if (options.showHistoryLoader) {
        setHistoryLoading(true);
      }

      try {
        const [assetData, sectionData, lifecycleData] = await Promise.all([
          fetchAllAssets(),
          fetchAssetSectionOptions(),
          fetchAssignmentLifecycle(),
        ]);

        setAssets(assetData);
        setSections(normalizeSectionOptions(sectionData));
        setHistory(lifecycleData);
      } catch (error) {
        console.error('Failed to load rotation data', error);
        Alert.alert('Error', 'Failed to load rotation data.');
      } finally {
        if (options.showLoader) {
          setLoading(false);
        }
        if (options.showHistoryLoader) {
          setHistoryLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    void loadData({ showLoader: true, showHistoryLoader: true });
  }, [loadData]);

  useSectionAwareRefresh({
    enabled: !loading,
    onRefresh: () => loadData({ showHistoryLoader: true }),
  });

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await loadData({ showHistoryLoader: true });
    } finally {
      setRefreshing(false);
    }
  };

  const assetById = useMemo(() => {
    const map = new Map<string, AssetRecord>();

    assets.forEach(asset => {
      const assetId = getAssetId(asset);
      if (assetId) {
        map.set(assetId, asset);
      }
    });

    return map;
  }, [assets]);

  useEffect(() => {
    setSelectedAssetIds(previous =>
      previous.filter(assetId => assetById.has(assetId)),
    );
  }, [assetById]);

  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const selectedSection = normalizeText(sectionFilter);

    return assets.filter(asset => {
      const currentSection = getAssetSection(asset);

      if (
        selectedSection !== allSectionsValue &&
        normalizeSectionKey(currentSection) !== normalizeSectionKey(selectedSection)
      ) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        getAssetDisplayName(asset),
        asset.assetNumber,
        getAssetEpc(asset),
        currentSection,
      ].some(value => normalizeText(value).toLowerCase().includes(query));
    });
  }, [assets, searchQuery, sectionFilter]);

  const filteredAssetIds = useMemo(
    () => filteredAssets.map(getAssetId).filter(Boolean),
    [filteredAssets],
  );

  const selectedAssetIdSet = useMemo(
    () => new Set(selectedAssetIds),
    [selectedAssetIds],
  );

  const selectedAssets = useMemo(
    () =>
      selectedAssetIds
        .map(assetId => assetById.get(assetId))
        .filter(Boolean) as AssetRecord[],
    [assetById, selectedAssetIds],
  );

  const previewAssets = useMemo(
    () => selectedAssets.slice(0, previewLimit),
    [selectedAssets],
  );

  const historyPreview = useMemo(
    () => history.slice(0, historyLimit),
    [history],
  );

  const allFilteredSelected =
    filteredAssetIds.length > 0 &&
    filteredAssetIds.every(assetId => selectedAssetIdSet.has(assetId));

  const targetSectionIsRegistered = useMemo(
    () =>
      !targetSection ||
      sections.some(
        section => normalizeSectionKey(section) === normalizeSectionKey(targetSection),
      ),
    [sections, targetSection],
  );

  const normalizedNewStatus = normalizeText(newStatus);
  const newStatusIsValid =
    !normalizedNewStatus || isValidStatusOption(normalizedNewStatus);

  const selectedAllAlreadyInTarget = useMemo(() => {
    const normalizedTarget = normalizeSectionKey(targetSection);

    return Boolean(normalizedTarget) &&
      selectedAssets.length > 0 &&
      selectedAssets.every(
        asset => normalizeSectionKey(getAssetSection(asset)) === normalizedTarget,
      );
  }, [selectedAssets, targetSection]);

  const canOpenPreview =
    selectedAssets.length > 0 &&
    Boolean(targetSection.trim()) &&
    targetSectionIsRegistered &&
    newStatusIsValid &&
    !selectedAllAlreadyInTarget;

  const handleToggleAsset = useCallback((asset: AssetRecord) => {
    const assetId = getAssetId(asset);

    if (!assetId) return;

    setSelectedAssetIds(previous => {
      if (previous.includes(assetId)) {
        return previous.filter(id => id !== assetId);
      }

      return [...previous, assetId];
    });
  }, []);

  const handleSelectFilteredAssets = useCallback(() => {
    if (filteredAssetIds.length === 0) {
      return;
    }

    setSelectedAssetIds(previous =>
      Array.from(new Set([...previous, ...filteredAssetIds])),
    );
  }, [filteredAssetIds]);

  const handleClearSelection = useCallback(() => {
    setSelectedAssetIds([]);
  }, []);

  const validateTransfer = useCallback(() => {
    const normalizedTarget = targetSection.trim();
    const normalizedReason = transferReason.trim();
    const normalizedStatus = newStatus.trim();

    if (selectedAssets.length === 0) {
      Alert.alert('Select Assets', 'Please select at least one asset.');
      return null;
    }

    if (!normalizedTarget) {
      Alert.alert('Target Section', 'Please choose a target section.');
      return null;
    }

    if (!sections.some(section => normalizeSectionKey(section) === normalizeSectionKey(normalizedTarget))) {
      Alert.alert(
        'Invalid Section',
        'Choose a registered section from the official sections list.',
      );
      return null;
    }

    if (normalizedStatus && !isValidStatusOption(normalizedStatus)) {
      Alert.alert(
        'Invalid Status',
        'Choose Healthy, Repairable, Beyond Repair, or keep the current status.',
      );
      return null;
    }

    const everyAssetAlreadyThere = selectedAssets.every(
      asset => normalizeSectionKey(getAssetSection(asset)) === normalizeSectionKey(normalizedTarget),
    );

    if (everyAssetAlreadyThere) {
      Alert.alert(
        'No Rotation Needed',
        'All selected assets are already assigned to the target section.',
      );
      return null;
    }

    return {
      assetIds: selectedAssets.map(asset => getAssetId(asset)).filter(Boolean),
      newStatus: normalizedStatus || undefined,
      reason: normalizedReason,
      toSection: normalizedTarget,
    };
  }, [newStatus, sections, selectedAssets, targetSection, transferReason]);

  const handleOpenPreview = useCallback(() => {
    const validated = validateTransfer();

    if (!validated) {
      return;
    }

    setTargetSection(validated.toSection);
    setNewStatus(validated.newStatus || '');
    setTransferReason(validated.reason);
    setConfirmationVisible(true);
  }, [validateTransfer]);

  const handleTransfer = useCallback(async () => {
    if (isTransferring) {
      return;
    }

    const validated = validateTransfer();

    if (!validated || validated.assetIds.length === 0) {
      return;
    }

    try {
      setIsTransferring(true);
      setTransferResult(null);

      const result = await transferAssets({
        assetIds: validated.assetIds,
        toSection: validated.toSection,
        newStatus: validated.newStatus,
        reason: validated.reason,
        transferType: 'rotation',
      });

      setTransferResult(result);
      setConfirmationVisible(false);

      await loadData({ showHistoryLoader: true });

      if (hasTransferIssues(result)) {
        const failedAssetIds = getTransferFailedAssetIds(result);
        setSelectedAssetIds(failedAssetIds);

        Alert.alert(
          result.summary.transferred > 0
            ? 'Transfer Partially Complete'
            : 'Transfer Failed',
          getTransferAlertMessage(result),
        );
      } else {
        setSelectedAssetIds([]);
        setNewStatus('');
        setTransferReason('');
        setTargetSection('');
      }
    } catch (error) {
      const transferError = getTransferResponseFromError(error);

      if (transferError) {
        setTransferResult(transferError);
        setConfirmationVisible(false);
        setSelectedAssetIds(getTransferFailedAssetIds(transferError));
        if (transferError.summary.transferred > 0) {
          await loadData({ showHistoryLoader: true });
        }
        Alert.alert(
          transferError.summary.transferred > 0
            ? 'Transfer Partially Complete'
            : 'Transfer Failed',
          getTransferAlertMessage(transferError),
        );
      } else {
        Alert.alert(
          'Transfer Failed',
          error instanceof Error ? error.message : 'Unable to transfer assets.',
        );
      }
    } finally {
      setIsTransferring(false);
    }
  }, [isTransferring, loadData, validateTransfer]);

  const handleExportTransferHistory = useCallback(async () => {
    if (historyPreview.length === 0 || isExportingHistory) {
      return;
    }

    setIsExportingHistory(true);

    try {
      await exportTransferHistoryToPdf({
        title: 'Asset Rotation Transfer History',
        statusLabel:
          history.length > historyLimit
            ? `Latest ${historyPreview.length} of ${history.length}`
            : 'Current transfer history',
        records: historyPreview,
      });
    } catch (error) {
      Alert.alert(
        'Export Failed',
        error instanceof Error ? error.message : 'Unable to export transfer history.',
      );
    } finally {
      setIsExportingHistory(false);
    }
  }, [history.length, historyPreview, isExportingHistory]);

  const renderVerificationBadge = useCallback((asset: AssetRecord) => {
    const context = getVerificationContext(asset);

    return (
      <View
        style={[
          styles.verificationBadge,
          context.status === 'verified-current' && styles.verificationBadgeCurrent,
          context.status === 'verified-previous' && styles.verificationBadgePrevious,
        ]}
      >
        <Text
          numberOfLines={2}
          style={[
            styles.verificationBadgeText,
            context.status === 'verified-current' && styles.verificationTextCurrent,
            context.status === 'verified-previous' && styles.verificationTextPrevious,
          ]}
        >
          {context.label}
        </Text>
      </View>
    );
  }, []);

  const renderAssetRow = useCallback(
    ({ item, index }: { item: AssetRecord; index: number }) => {
      const assetId = getAssetId(item);
      const selected = selectedAssetIdSet.has(assetId);

      return (
        <Pressable
          style={[
            styles.tableRow,
            index % 2 === 1 && styles.tableRowAlternate,
            selected && styles.tableRowSelected,
          ]}
          onPress={() => handleToggleAsset(item)}
        >
          <View style={[styles.cell, styles.selectCell]}>
            <Ionicons
              name={selected ? 'checkbox' : 'square-outline'}
              size={20}
              color={selected ? PRIMARY_BLUE : '#64748b'}
            />
          </View>
          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.cell, styles.assetCell]}>
            {getAssetDisplayName(item)}
          </Text>
          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.cell, styles.numberCell]}>
            {item.assetNumber || dash}
          </Text>
          <Text numberOfLines={1} ellipsizeMode="middle" style={[styles.cell, styles.epcCell]}>
            {getAssetEpc(item)}
          </Text>
          <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.cell, styles.sectionCell]}>
            {getAssetSection(item)}
          </Text>
          <View style={[styles.cell, styles.verificationCell]}>
            {renderVerificationBadge(item)}
          </View>
        </Pressable>
      );
    },
    [handleToggleAsset, renderVerificationBadge, selectedAssetIdSet],
  );

  const renderHistoryRow = useCallback(
    ({ item, index }: { item: AssetLifecycleRecord; index: number }) => (
      <View style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.cell, styles.historyAssetCell]}>
          {item.assetName || dash}
        </Text>
        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.cell, styles.historySectionCell]}>
          {item.fromSection || dash}
        </Text>
        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.cell, styles.historySectionCell]}>
          {item.toSection || dash}
        </Text>
        <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.cell, styles.historyDateCell]}>
          {formatDateTime(getLifecycleDate(item))}
        </Text>
        <Text numberOfLines={2} ellipsizeMode="tail" style={[styles.cell, styles.historyReasonCell]}>
          {normalizeText(item.reason) || dash}
        </Text>
      </View>
    ),
    [],
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={PRIMARY_BLUE} />
      </SafeAreaView>
    );
  }

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
            <Text style={styles.title}>Assets Rotation</Text>
            <Text style={styles.subtitle}>Section transfer management</Text>
          </View>
        </View>

        <View style={styles.countWrap}>
          <Text style={styles.countValue}>{selectedAssets.length}</Text>
          <Text style={styles.countLabel}>Selected</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{assets.length}</Text>
            <Text style={styles.summaryLabel}>Total Assets</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{filteredAssets.length}</Text>
            <Text style={styles.summaryLabel}>Filtered</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{selectedAssets.length}</Text>
            <Text style={styles.summaryLabel}>Selected</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{sections.length}</Text>
            <Text style={styles.summaryLabel}>Registered Sections</Text>
          </View>
        </View>

        <View style={styles.filterPanel}>
          <View style={styles.panelHeaderRow}>
            <View>
              <Text style={styles.eyebrow}>Rotation Controls</Text>
              <Text style={styles.panelTitle}>Search and Filter</Text>
            </View>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={onRefresh}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh-outline" size={15} color={PRIMARY_BLUE} />
              <Text style={styles.refreshText}>Refresh</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search asset, number, EPC, or section"
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <View style={styles.filterPickerWrap}>
              <Picker
                selectedValue={sectionFilter}
                onValueChange={value => setSectionFilter(String(value))}
                style={styles.picker}
                itemStyle={styles.pickerItem}
                dropdownIconColor="#334155"
              >
                <Picker.Item label="All Sections" value={allSectionsValue} />
                {sections.map(section => (
                  <Picker.Item key={section} label={section} value={section} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.tablePanel}>
          <View style={styles.tableHeaderBar}>
            <View>
              <Text style={styles.eyebrow}>Selection</Text>
              <Text style={styles.panelTitle}>Asset Selection Table</Text>
            </View>

            <View style={styles.tableActions}>
              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  (filteredAssetIds.length === 0 || allFilteredSelected) && styles.buttonDisabled,
                ]}
                onPress={handleSelectFilteredAssets}
                disabled={filteredAssetIds.length === 0 || allFilteredSelected}
                activeOpacity={0.85}
              >
                <Ionicons name="checkbox-outline" size={15} color={PRIMARY_BLUE} />
                <Text style={styles.secondaryButtonText}>Select Filtered</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.secondaryButton,
                  selectedAssetIds.length === 0 && styles.buttonDisabled,
                ]}
                onPress={handleClearSelection}
                disabled={selectedAssetIds.length === 0}
                activeOpacity={0.85}
              >
                <Ionicons name="close-circle-outline" size={15} color={PRIMARY_BLUE} />
                <Text style={styles.secondaryButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
          </View>

          {filteredAssets.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={40} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No assets match the current filter</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              nestedScrollEnabled
              directionalLockEnabled
            >
              <View style={styles.assetTable}>
                <View style={[styles.tableRow, styles.tableHeaderRow]}>
                  <Text numberOfLines={1} style={[styles.cell, styles.headerCell, styles.selectCell]}>
                    Select
                  </Text>
                  <Text numberOfLines={1} style={[styles.cell, styles.headerCell, styles.assetCell]}>
                    Asset
                  </Text>
                  <Text numberOfLines={1} style={[styles.cell, styles.headerCell, styles.numberCell]}>
                    Asset Number
                  </Text>
                  <Text numberOfLines={1} style={[styles.cell, styles.headerCell, styles.epcCell]}>
                    EPC
                  </Text>
                  <Text numberOfLines={1} style={[styles.cell, styles.headerCell, styles.sectionCell]}>
                    Current Section
                  </Text>
                  <Text numberOfLines={1} style={[styles.cell, styles.headerCell, styles.verificationCell]}>
                    Verification Status
                  </Text>
                </View>

                <FlatList
                  data={filteredAssets}
                  keyExtractor={getAssetKey}
                  renderItem={renderAssetRow}
                  style={styles.assetList}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  initialNumToRender={16}
                  maxToRenderPerBatch={16}
                  windowSize={7}
                  ListFooterComponent={<View style={styles.tableFooter} />}
                />
              </View>
            </ScrollView>
          )}
        </View>

        <View style={styles.formPanel}>
          <View style={styles.panelHeaderRow}>
            <View>
              <Text style={styles.eyebrow}>Transfer</Text>
              <Text style={styles.panelTitle}>Rotation Details</Text>
            </View>

            {selectedAllAlreadyInTarget ? (
              <View style={styles.warningPill}>
                <Text style={styles.warningPillText}>No move needed</Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.fieldLabel}>Target Section</Text>
          <View style={styles.pickerShell}>
            <Picker
              selectedValue={targetSection}
              onValueChange={value => setTargetSection(String(value))}
              style={styles.picker}
              itemStyle={styles.pickerItem}
              dropdownIconColor="#334155"
            >
              <Picker.Item label="Select Section" value="" />
              {sections.map(section => (
                <Picker.Item key={section} label={section} value={section} />
              ))}
            </Picker>
          </View>

          <Text style={styles.fieldLabel}>New Status</Text>
          <View style={styles.pickerShell}>
            <Picker
              selectedValue={newStatus || keepCurrentStatusValue}
              onValueChange={value => {
                const selectedValue = String(value);
                setNewStatus(
                  selectedValue === keepCurrentStatusValue ? '' : selectedValue,
                );
              }}
              style={styles.picker}
              itemStyle={styles.pickerItem}
              dropdownIconColor="#334155"
            >
              <Picker.Item
                label="Keep Current Status"
                value={keepCurrentStatusValue}
              />
              {statusOptions.map(status => (
                <Picker.Item key={status} label={status} value={status} />
              ))}
            </Picker>
          </View>

          <Text style={styles.fieldLabel}>Reason</Text>
          <TextInput
            style={styles.reasonInput}
            placeholder="Reason for transfer"
            placeholderTextColor="#94a3b8"
            multiline
            value={transferReason}
            onChangeText={setTransferReason}
          />

          <TouchableOpacity
            style={[styles.primaryButton, !canOpenPreview && styles.primaryButtonDisabled]}
            onPress={handleOpenPreview}
            activeOpacity={0.85}
          >
            <Ionicons name="eye-outline" size={18} color="#ffffff" />
            <Text style={styles.primaryButtonText}>Preview and Continue Rotation</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.previewPanel}>
          <View style={styles.panelHeaderRow}>
            <View>
              <Text style={styles.eyebrow}>Review</Text>
              <Text style={styles.panelTitle}>Transfer Preview</Text>
            </View>

            {selectedAssets.length > previewLimit ? (
              <Text style={styles.capText}>
                Showing {previewLimit} of {selectedAssets.length}
              </Text>
            ) : null}
          </View>

          {selectedAssets.length === 0 ? (
            <Text style={styles.emptyText}>No assets selected.</Text>
          ) : (
            previewAssets.map((asset, index) => (
              <View key={getAssetKey(asset, index)} style={styles.previewRow}>
                <View style={styles.previewCopy}>
                  <Text numberOfLines={1} style={styles.previewName}>
                    {getAssetDisplayName(asset)}
                  </Text>
                  <Text numberOfLines={1} style={styles.previewMeta}>
                    {asset.assetNumber || dash} | {getAssetEpc(asset)}
                  </Text>
                </View>

                <View style={styles.previewState}>
                  <Text numberOfLines={1} style={styles.previewMove}>
                    Section: {getAssetSection(asset)} {'->'} {targetSection || dash}
                  </Text>
                  <Text numberOfLines={1} style={styles.previewStatus}>
                    Status: {getAssetStatus(asset)} {'->'} {newStatus || getAssetStatus(asset)}
                  </Text>
                </View>
              </View>
            ))
          )}

          {transferResult ? (
            <View
              style={[
                styles.resultPanel,
                hasTransferIssues(transferResult) && styles.resultPanelWarning,
              ]}
            >
              <Text style={styles.resultTitle}>Latest Transfer Result</Text>
              <View style={styles.resultGrid}>
                <Text style={styles.resultItem}>Requested: {transferResult.summary.requested}</Text>
                <Text style={styles.resultItem}>Transferred: {transferResult.summary.transferred}</Text>
                <Text style={styles.resultItem}>Skipped: {transferResult.summary.skipped}</Text>
                <Text style={styles.resultItem}>Failed: {transferResult.summary.failed}</Text>
              </View>
              {transferResult.errors.length > 0 ? (
                <View style={styles.resultIssueBox}>
                  <Text style={styles.resultIssueTitle}>Transfer Errors</Text>
                  {transferResult.errors.slice(0, 4).map(item => (
                    <Text
                      key={`${item.assetId}-${item.message}`}
                      numberOfLines={3}
                      style={styles.resultIssueText}
                    >
                      {item.message}
                    </Text>
                  ))}
                </View>
              ) : null}
              {transferResult.skipped.length > 0 ? (
                <View style={styles.resultIssueBox}>
                  <Text style={styles.resultIssueTitle}>Skipped Assets</Text>
                  {transferResult.skipped.slice(0, 4).map(item => (
                    <Text
                      key={`${item.assetId}-${item.reason}`}
                      numberOfLines={2}
                      style={styles.resultIssueText}
                    >
                      {item.reason || 'Skipped by transfer validation.'}
                    </Text>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}
        </View>

        <View style={styles.tablePanel}>
          <View style={styles.tableHeaderBar}>
            <View>
              <Text style={styles.eyebrow}>Lifecycle</Text>
              <Text style={styles.panelTitle}>Transfer History</Text>
            </View>

            <View style={styles.tableActions}>
              {history.length > historyLimit ? (
                <Text style={styles.capText}>
                  Latest {historyLimit} of {history.length}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.exportIconButton,
                  (historyPreview.length === 0 || isExportingHistory) && styles.buttonDisabled,
                ]}
                onPress={handleExportTransferHistory}
                disabled={historyPreview.length === 0 || isExportingHistory}
                activeOpacity={0.85}
                accessibilityLabel="Export transfer history PDF"
              >
                {isExportingHistory ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons name="download-outline" size={16} color="#ffffff" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {historyLoading ? (
            <ActivityIndicator color={PRIMARY_BLUE} style={styles.panelLoader} />
          ) : historyPreview.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={40} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No transfer history available</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              nestedScrollEnabled
              directionalLockEnabled
            >
              <View style={styles.historyTable}>
                <View style={[styles.tableRow, styles.tableHeaderRow]}>
                  <Text numberOfLines={1} style={[styles.cell, styles.headerCell, styles.historyAssetCell]}>
                    Asset
                  </Text>
                  <Text numberOfLines={1} style={[styles.cell, styles.headerCell, styles.historySectionCell]}>
                    From
                  </Text>
                  <Text numberOfLines={1} style={[styles.cell, styles.headerCell, styles.historySectionCell]}>
                    To
                  </Text>
                  <Text numberOfLines={1} style={[styles.cell, styles.headerCell, styles.historyDateCell]}>
                    Date
                  </Text>
                  <Text numberOfLines={1} style={[styles.cell, styles.headerCell, styles.historyReasonCell]}>
                    Reason
                  </Text>
                </View>

                <FlatList
                  data={historyPreview}
                  keyExtractor={getHistoryKey}
                  renderItem={renderHistoryRow}
                  style={styles.historyList}
                  nestedScrollEnabled
                  showsVerticalScrollIndicator
                  initialNumToRender={12}
                  maxToRenderPerBatch={12}
                  windowSize={6}
                  ListFooterComponent={<View style={styles.tableFooter} />}
                />
              </View>
            </ScrollView>
          )}
        </View>
      </ScrollView>

      <Modal
        visible={confirmationVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!isTransferring) {
            setConfirmationVisible(false);
          }
        }}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => {
            if (!isTransferring) {
              setConfirmationVisible(false);
            }
          }}
        >
          <Pressable style={styles.modalCard} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.eyebrow}>Confirmation</Text>
                <Text style={styles.modalTitle}>Confirm Rotation</Text>
              </View>

              <TouchableOpacity
                style={[styles.modalCloseButton, isTransferring && styles.buttonDisabled]}
                onPress={() => setConfirmationVisible(false)}
                disabled={isTransferring}
                activeOpacity={0.85}
              >
                <Ionicons name="close-outline" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSummary}>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Assets</Text>
                <Text style={styles.modalValue}>{selectedAssets.length}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Target</Text>
                <Text numberOfLines={1} style={styles.modalValue}>{targetSection || dash}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>New Status</Text>
                <Text numberOfLines={1} style={styles.modalValue}>
                  {newStatus || 'Keep Current Status'}
                </Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>Reason</Text>
                <Text numberOfLines={3} style={styles.modalValue}>{transferReason || dash}</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton, isTransferring && styles.buttonDisabled]}
                onPress={() => setConfirmationVisible(false)}
                disabled={isTransferring}
                activeOpacity={0.85}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalConfirmButton, isTransferring && styles.buttonDisabled]}
                onPress={handleTransfer}
                disabled={isTransferring}
                activeOpacity={0.85}
              >
                {isTransferring ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm Transfer</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    marginTop: 25,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f6f8',
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
    marginTop: 2,
    fontSize: 11,
    color: '#64748b',
  },
  countWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginLeft: 10,
  },
  countValue: {
    fontSize: 16,
    fontWeight: '800',
    color: PRIMARY_BLUE,
  },
  countLabel: {
    marginTop: 1,
    fontSize: 10,
    color: '#64748b',
  },
  content: {
    padding: 10,
    paddingBottom: 38,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  summaryCard: {
    width: '48.5%',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  filterPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 12,
    marginBottom: 10,
  },
  tablePanel: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 10,
    marginBottom: 10,
  },
  formPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 12,
    marginBottom: 10,
  },
  previewPanel: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 12,
    marginBottom: 10,
  },
  panelHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  tableHeaderBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  tableActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  panelTitle: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  refreshButton: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '800',
    color: PRIMARY_BLUE,
  },
  searchRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    minWidth: 180,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0f172a',
  },
  filterPickerWrap: {
    width: 220,
    minHeight: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  pickerShell: {
    minHeight: 54,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  picker: {
    minHeight: 54,
    width: '100%',
    color: '#0f172a',
    backgroundColor: 'transparent',
  },
  pickerItem: {
    fontSize: 13,
    color: '#0f172a',
  },
  fieldLabel: {
    marginTop: 2,
    marginBottom: 6,
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
  },
  reasonInput: {
    minHeight: 88,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 13,
    color: '#0f172a',
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  primaryButton: {
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: PRIMARY_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.62,
  },
  primaryButtonText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  secondaryButton: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  secondaryButtonText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '800',
    color: PRIMARY_BLUE,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  warningPill: {
    borderRadius: 999,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  warningPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#92400e',
  },
  capText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  assetTable: {
    minWidth: 910,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  historyTable: {
    minWidth: 970,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  assetList: {
    maxHeight: 420,
  },
  historyList: {
    maxHeight: 360,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  tableHeaderRow: {
    backgroundColor: '#f8fafc',
  },
  tableRowAlternate: {
    backgroundColor: '#f8fafc',
  },
  tableRowSelected: {
    backgroundColor: '#eff6ff',
  },
  cell: {
    width: 120,
    minHeight: 44,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    fontSize: 11,
    color: '#0f172a',
    overflow: 'hidden',
  },
  headerCell: {
    minHeight: 40,
    fontWeight: '800',
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  selectCell: {
    width: 72,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  assetCell: {
    width: 190,
  },
  numberCell: {
    width: 130,
  },
  epcCell: {
    width: 190,
  },
  sectionCell: {
    width: 150,
  },
  verificationCell: {
    width: 178,
    justifyContent: 'center',
    borderRightWidth: 0,
  },
  historyAssetCell: {
    width: 190,
  },
  historySectionCell: {
    width: 150,
  },
  historyDateCell: {
    width: 180,
  },
  historyReasonCell: {
    width: 300,
    borderRightWidth: 0,
  },
  verificationBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  verificationBadgeCurrent: {
    backgroundColor: '#dcfce7',
  },
  verificationBadgePrevious: {
    backgroundColor: '#fef3c7',
  },
  verificationBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  verificationTextCurrent: {
    color: '#166534',
  },
  verificationTextPrevious: {
    color: '#92400e',
  },
  tableFooter: {
    height: 8,
  },
  emptyState: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
  },
  panelLoader: {
    marginVertical: 24,
  },
  previewRow: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: '#edf2f7',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  previewCopy: {
    flex: 1,
    minWidth: 0,
  },
  previewName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  previewMeta: {
    marginTop: 2,
    fontSize: 11,
    color: '#64748b',
  },
  previewState: {
    flex: 1,
    minWidth: 120,
    alignItems: 'flex-end',
  },
  previewMove: {
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  previewStatus: {
    marginTop: 3,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  resultPanel: {
    marginTop: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    padding: 10,
  },
  resultPanelWarning: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  resultTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: PRIMARY_BLUE,
    marginBottom: 6,
  },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  resultItem: {
    minWidth: 110,
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  resultIssueBox: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#fecaca',
    paddingTop: 8,
  },
  resultIssueTitle: {
    marginBottom: 4,
    fontSize: 11,
    fontWeight: '800',
    color: '#991b1b',
    textTransform: 'uppercase',
  },
  resultIssueText: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
    color: '#7f1d1d',
  },
  exportIconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#0ea5a4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    justifyContent: 'center',
    padding: 18,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    marginTop: 3,
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSummary: {
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  modalRow: {
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    paddingVertical: 8,
  },
  modalLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  modalValue: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 14,
    gap: 10,
  },
  modalButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  modalCancelButton: {
    backgroundColor: '#f1f5f9',
  },
  modalConfirmButton: {
    backgroundColor: PRIMARY_BLUE,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  modalConfirmText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
});
