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
import { Ionicons } from '@expo/vector-icons';

import { ApiError } from '../../config/api';
import {
  AssetLifecycleRecord,
  AssetRecord,
  fetchAllAssets,
  fetchAssetSectionOptions,
  fetchAssignmentLifecycle,
  getAssetDisplayName,
  getAssetId,
  transferAssets,
  TransferAssetsResponse,
} from '../../services/assetApi';
import { PRIMARY_BLUE } from '../../theme/erpTheme';
import { useSectionAwareRefresh } from './hooks/useSectionAwareRefresh';

const dash = '-';
const allSectionsValue = '__all_sections__';
const allStatusesValue = '__all_statuses__';
const lifecycleLimit = 50;
const previewLimit = 40;

const defaultStatusOptions = ['Healthy', 'Repairable', 'Beyond Repair'];

const normalizeText = (value?: string | null) =>
  typeof value === 'string' ? value.trim() : '';

const getAssetSection = (asset: AssetRecord) =>
  normalizeText(asset.section) || dash;

const getAssetEpc = (asset: AssetRecord) =>
  normalizeText(asset.epc) || normalizeText(asset.epcKey) || dash;

const getVerificationStatus = (asset?: AssetRecord | null) =>
  normalizeText(asset?.verificationStatus) || dash;

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return dash;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return dash;
  }

  return date.toLocaleString();
};

const statusStyleKey = (status?: string | null) => {
  const normalized = normalizeText(status).toLowerCase();

  if (normalized === 'healthy') return 'healthy';
  if (normalized === 'repairable') return 'repairable';
  if (normalized === 'beyond repair') return 'beyondRepair';
  return 'neutral';
};

const getLatestVerification = (asset?: AssetRecord | null) => {
  if (!asset) {
    return {
      section: dash,
      verifiedAt: dash,
    };
  }

  const latestHistory = (asset.verificationHistory || []).reduce<
    NonNullable<AssetRecord['verificationHistory']>[number] | null
  >((latest, entry) => {
    if (!entry?.verifiedAt) {
      return latest;
    }

    if (!latest?.verifiedAt) {
      return entry;
    }

    return new Date(entry.verifiedAt).getTime() > new Date(latest.verifiedAt).getTime()
      ? entry
      : latest;
  }, null);

  return {
    section: normalizeText(latestHistory?.section) || dash,
    verifiedAt: formatDateTime(asset.verifiedAt || latestHistory?.verifiedAt),
  };
};

const getLifecycleDate = (record: AssetLifecycleRecord) =>
  record.assignedAt || record.lastUpdated || null;

const getLifecycleFromSection = (record: AssetLifecycleRecord) =>
  normalizeText(record.fromSection) || dash;

const getLifecycleToSection = (record: AssetLifecycleRecord) =>
  normalizeText(record.toSection) || dash;

const getLifecycleKey = (record: AssetLifecycleRecord) =>
  normalizeText(record._id)
  || [
    normalizeText(record.assetId),
    normalizeText(getLifecycleDate(record)),
    getLifecycleFromSection(record),
    getLifecycleToSection(record),
  ].filter(Boolean).join('-');

const isTransferResponse = (value: unknown): value is TransferAssetsResponse => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const maybe = value as Partial<TransferAssetsResponse>;
  return Boolean(maybe.summary && Array.isArray(maybe.transferred) && Array.isArray(maybe.errors));
};

const getTransferResponseFromError = (error: unknown) => {
  if (error instanceof ApiError && isTransferResponse(error.data)) {
    return error.data;
  }

  return null;
};

export default function AssetsRotationScreen({ navigation }: any) {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [sectionOptions, setSectionOptions] = useState<string[]>([]);
  const [lifecycle, setLifecycle] = useState<AssetLifecycleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionsLoading, setSectionsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [dataError, setDataError] = useState('');

  const [sectionFilter, setSectionFilter] = useState(allSectionsValue);
  const [statusFilter, setStatusFilter] = useState(allStatusesValue);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [targetSection, setTargetSection] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  const [confirmationError, setConfirmationError] = useState('');
  const [transferResult, setTransferResult] = useState<TransferAssetsResponse | null>(null);

  const assetsById = useMemo(() => {
    const map = new Map<string, AssetRecord>();

    assets.forEach(asset => {
      const id = getAssetId(asset);
      if (id) {
        map.set(id, asset);
      }
    });

    return map;
  }, [assets]);

  const selectedIdSet = useMemo(
    () => new Set(selectedAssetIds),
    [selectedAssetIds],
  );

  const assetSections = useMemo(() => {
    const set = new Set<string>();

    assets.forEach(asset => {
      const section = normalizeText(asset.section);
      if (section) {
        set.add(section);
      }
    });

    return Array.from(set).sort((left, right) => left.localeCompare(right));
  }, [assets]);

  const availableSections = useMemo(() => {
    const set = new Set<string>([...sectionOptions, ...assetSections].filter(Boolean));
    return Array.from(set).sort((left, right) => left.localeCompare(right));
  }, [assetSections, sectionOptions]);

  const statusOptions = useMemo(() => {
    const set = new Set<string>(defaultStatusOptions);

    assets.forEach(asset => {
      const status = normalizeText(asset.status);
      if (status) {
        set.add(status);
      }
    });

    return Array.from(set).sort((left, right) => left.localeCompare(right));
  }, [assets]);

  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return assets.filter(asset => {
      if (sectionFilter !== allSectionsValue && getAssetSection(asset) !== sectionFilter) {
        return false;
      }

      if (statusFilter !== allStatusesValue && normalizeText(asset.status) !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        asset.assetNumber,
        getAssetDisplayName(asset),
        getAssetEpc(asset),
      ].some(value => normalizeText(value).toLowerCase().includes(query));
    });
  }, [assets, searchQuery, sectionFilter, statusFilter]);

  const selectedAssets = useMemo(
    () => selectedAssetIds
      .map(assetId => assetsById.get(assetId))
      .filter((asset): asset is AssetRecord => Boolean(asset)),
    [assetsById, selectedAssetIds],
  );

  const previewRows = useMemo(
    () => selectedAssets.map(asset => ({
      asset,
      assetId: getAssetId(asset),
      fromSection: getAssetSection(asset),
      toSection: targetSection.trim(),
      willSkip: targetSection.trim() !== '' && getAssetSection(asset) === targetSection.trim(),
    })),
    [selectedAssets, targetSection],
  );

  const visibleLifecycle = useMemo(
    () => lifecycle.slice(0, lifecycleLimit),
    [lifecycle],
  );

  const validTargetSelected =
    targetSection.trim() !== '' && availableSections.includes(targetSection.trim());

  const canOpenConfirmation =
    selectedAssets.length > 0 && validTargetSelected && !isTransferring;

  const loadAssets = useCallback(async () => {
    try {
      const nextAssets = await fetchAllAssets();
      const nextIds = new Set(nextAssets.map(getAssetId).filter(Boolean));

      setAssets(nextAssets);
      setSelectedAssetIds(previous => previous.filter(assetId => nextIds.has(assetId)));
    } catch (error) {
      console.error('Failed to load assets for rotation', error);
      setDataError('Asset records could not be loaded. Pull to refresh or try again.');
    }
  }, []);

  const loadSectionOptions = useCallback(async () => {
    setSectionsLoading(true);

    try {
      const options = await fetchAssetSectionOptions();
      setSectionOptions(options);
    } catch (error) {
      console.error('Failed to load rotation section options', error);
      setDataError('Section options could not be loaded. Transfer targets may be incomplete.');
    } finally {
      setSectionsLoading(false);
    }
  }, []);

  const loadLifecycle = useCallback(async () => {
    setHistoryLoading(true);

    try {
      const records = await fetchAssignmentLifecycle();
      setLifecycle(records);
    } catch (error) {
      console.error('Failed to load rotation lifecycle', error);
      setDataError('Lifecycle history could not be loaded.');
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const refreshRotationData = useCallback(async (showScreenLoader = false) => {
    if (showScreenLoader) {
      setLoading(true);
    }

    setDataError('');

    try {
      await Promise.all([
        loadAssets(),
        loadSectionOptions(),
        loadLifecycle(),
      ]);
    } finally {
      if (showScreenLoader) {
        setLoading(false);
      }
    }
  }, [loadAssets, loadLifecycle, loadSectionOptions]);

  useEffect(() => {
    void refreshRotationData(true);
  }, [refreshRotationData]);

  useSectionAwareRefresh({
    onRefresh: () => refreshRotationData(false),
  });

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await refreshRotationData(false);
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleAsset = (asset: AssetRecord) => {
    const assetId = getAssetId(asset);
    if (!assetId) {
      return;
    }

    setSelectedAssetIds(previous =>
      previous.includes(assetId)
        ? previous.filter(id => id !== assetId)
        : [...previous, assetId],
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredAssets.map(getAssetId).filter(Boolean);

    setSelectedAssetIds(previous =>
      Array.from(new Set([...previous, ...filteredIds])),
    );
  };

  const handleClearSelection = () => {
    setSelectedAssetIds([]);
  };

  const handleOpenConfirmation = () => {
    if (selectedAssets.length === 0) {
      Alert.alert('No assets selected', 'Select at least one asset before starting a rotation transfer.');
      return;
    }

    if (!validTargetSelected) {
      Alert.alert('Target section required', 'Choose a valid target section from the section list.');
      return;
    }

    setConfirmationError('');
    setConfirmationVisible(true);
  };

  const handleConfirmTransfer = async () => {
    if (isTransferring) {
      return;
    }

    const assetIds = selectedAssets.map(getAssetId).filter(Boolean);
    const toSection = targetSection.trim();

    if (assetIds.length === 0 || !toSection) {
      setConfirmationError('The transfer request is missing assets or a target section.');
      return;
    }

    setIsTransferring(true);
    setConfirmationError('');

    try {
      const result = await transferAssets({
        assetIds,
        toSection,
        reason: transferReason.trim() || undefined,
        transferType: 'rotation',
      });

      setTransferResult(result);
      setConfirmationVisible(false);
      setTransferReason('');

      const failedIds = new Set(result.errors.map(item => item.assetId));
      setSelectedAssetIds(result.errors.length > 0 ? assetIds.filter(id => failedIds.has(id)) : []);

      await refreshRotationData(false);
    } catch (error) {
      const transferErrorResult = getTransferResponseFromError(error);

      if (transferErrorResult) {
        setTransferResult(transferErrorResult);
        setConfirmationVisible(false);
        await refreshRotationData(false);
        return;
      }

      console.error('Rotation transfer failed', error);
      setConfirmationError(
        error instanceof Error ? error.message : 'Unable to complete the rotation transfer.',
      );
    } finally {
      setIsTransferring(false);
    }
  };

  const renderStatusBadge = (status?: string | null) => {
    const key = statusStyleKey(status);

    return (
      <View style={[
        styles.statusBadge,
        key === 'healthy' && styles.statusBadgeHealthy,
        key === 'repairable' && styles.statusBadgeRepairable,
        key === 'beyondRepair' && styles.statusBadgeBeyondRepair,
      ]}
      >
        <Text style={[
          styles.statusBadgeText,
          key === 'healthy' && styles.statusTextHealthy,
          key === 'repairable' && styles.statusTextRepairable,
          key === 'beyondRepair' && styles.statusTextBeyondRepair,
        ]}
        >
          {status || dash}
        </Text>
      </View>
    );
  };

  const renderAssetRow = ({ item, index }: { item: AssetRecord; index: number }) => {
    const assetId = getAssetId(item);
    const selected = selectedIdSet.has(assetId);
    const verification = getLatestVerification(item);

    return (
      <TouchableOpacity
        style={[
          styles.tableRow,
          index % 2 === 1 && styles.tableRowAlternate,
          selected && styles.tableRowSelected,
        ]}
        activeOpacity={0.82}
        onPress={() => handleToggleAsset(item)}
      >
        <View style={[styles.selectCell, selected && styles.selectCellActive]}>
          <Ionicons
            name={selected ? 'checkmark' : 'add-outline'}
            size={16}
            color={selected ? '#ffffff' : PRIMARY_BLUE}
          />
        </View>
        <Text style={[styles.cell, styles.assetNameCell]} numberOfLines={1}>
          {getAssetDisplayName(item)}
        </Text>
        <Text style={styles.cell} numberOfLines={1}>{item.assetNumber || dash}</Text>
        <Text style={styles.cell} numberOfLines={1} ellipsizeMode="middle">{getAssetEpc(item)}</Text>
        <Text style={styles.cell} numberOfLines={1}>{getAssetSection(item)}</Text>
        <View style={styles.statusCell}>{renderStatusBadge(item.status)}</View>
        <Text style={styles.cell} numberOfLines={1}>{getVerificationStatus(item)}</Text>
        <Text style={styles.cell} numberOfLines={1}>{verification.section}</Text>
        <Text style={styles.dateCell} numberOfLines={1}>{verification.verifiedAt}</Text>
      </TouchableOpacity>
    );
  };

  const renderLifecycleRow = ({ item, index }: { item: AssetLifecycleRecord; index: number }) => {
    const asset = item.assetId ? assetsById.get(item.assetId) : undefined;
    const assetName = item.assetName || (asset ? getAssetDisplayName(asset) : dash);
    const status = item.assetStatus || item.status || asset?.status || dash;
    const verificationStatus = item.verificationStatus || asset?.verificationStatus || dash;

    return (
      <View style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
        <Text style={[styles.cell, styles.assetNameCell]} numberOfLines={1}>
          {assetName}
        </Text>
        <Text style={styles.cell} numberOfLines={1}>{item.assetNumber || asset?.assetNumber || dash}</Text>
        <Text style={styles.dateCell} numberOfLines={1}>{formatDateTime(getLifecycleDate(item))}</Text>
        <Text style={styles.cell} numberOfLines={1}>{getLifecycleFromSection(item)}</Text>
        <Text style={styles.cell} numberOfLines={1}>{getLifecycleToSection(item)}</Text>
        <Text style={styles.cell} numberOfLines={1}>{item.assignedBy || dash}</Text>
        <Text style={styles.cell} numberOfLines={1}>{item.transferType || dash}</Text>
        <Text style={styles.reasonCell} numberOfLines={1}>{item.reason || dash}</Text>
        <View style={styles.statusCell}>{renderStatusBadge(status)}</View>
        <Text style={styles.cell} numberOfLines={1}>{verificationStatus}</Text>
      </View>
    );
  };

  const renderFilterChip = (
    label: string,
    selected: boolean,
    onPress: () => void,
  ) => (
    <TouchableOpacity
      key={label}
      style={[styles.filterChip, selected && styles.filterChipActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text style={[styles.filterChipText, selected && styles.filterChipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderResultAssetName = (assetId: string, asset?: AssetRecord) => {
    if (asset) {
      return getAssetDisplayName(asset);
    }

    const matched = assetsById.get(assetId);
    return matched ? getAssetDisplayName(matched) : assetId;
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
            <Text style={styles.title}>Assets Rotation</Text>
            <Text style={styles.subtitle}>Enterprise section transfer hub</Text>
          </View>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countValue}>{selectedAssets.length}</Text>
          <Text style={styles.countLabel}>Selected</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentBody}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {dataError ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={17} color="#b91c1c" />
            <Text style={styles.errorBannerText}>{dataError}</Text>
          </View>
        ) : null}

        <View style={styles.metricsRow}>
          <View style={styles.metricPill}>
            <Text style={styles.metricValue}>{filteredAssets.length}</Text>
            <Text style={styles.metricLabel}>Filtered</Text>
          </View>
          <View style={styles.metricPill}>
            <Text style={styles.metricValue}>{assets.length}</Text>
            <Text style={styles.metricLabel}>Assets</Text>
          </View>
          <View style={styles.metricPill}>
            <Text style={styles.metricValue}>{availableSections.length}</Text>
            <Text style={styles.metricLabel}>Sections</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.eyebrow}>Registry Controls</Text>
              <Text style={styles.panelTitle}>Filter Assets</Text>
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

          <TextInput
            style={styles.searchInput}
            placeholder="Search asset number, asset name, or EPC"
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <Text style={styles.filterLabel}>Section</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {renderFilterChip('All Sections', sectionFilter === allSectionsValue, () => setSectionFilter(allSectionsValue))}
            {availableSections.map(section =>
              renderFilterChip(section, sectionFilter === section, () => setSectionFilter(section)),
            )}
          </ScrollView>

          <Text style={styles.filterLabel}>Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {renderFilterChip('All Statuses', statusFilter === allStatusesValue, () => setStatusFilter(allStatusesValue))}
            {statusOptions.map(status =>
              renderFilterChip(status, statusFilter === status, () => setStatusFilter(status)),
            )}
          </ScrollView>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <View>
              <Text style={styles.eyebrow}>Rotation Workflow</Text>
              <Text style={styles.panelTitle}>Select Target Section</Text>
            </View>

            <View style={styles.syncPill}>
              <View style={styles.syncDot} />
              <Text style={styles.syncText}>{sectionsLoading ? 'Loading' : 'Ready'}</Text>
            </View>
          </View>

          <View style={styles.selectionActions}>
            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={handleSelectAllFiltered}
              activeOpacity={0.85}
              disabled={filteredAssets.length === 0}
            >
              <Ionicons name="checkmark-done-outline" size={15} color={PRIMARY_BLUE} />
              <Text style={styles.secondaryActionText}>Select Filtered</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryActionButton}
              onPress={handleClearSelection}
              activeOpacity={0.85}
              disabled={selectedAssets.length === 0}
            >
              <Ionicons name="close-outline" size={16} color={PRIMARY_BLUE} />
              <Text style={styles.secondaryActionText}>Clear</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.filterLabel}>Target Section</Text>
          {sectionsLoading && availableSections.length === 0 ? (
            <ActivityIndicator size="small" color={PRIMARY_BLUE} style={styles.inlineLoader} />
          ) : availableSections.length === 0 ? (
            <View style={styles.emptyInline}>
              <Text style={styles.emptyInlineText}>No section options are available.</Text>
            </View>
          ) : (
            <View style={styles.targetGrid}>
              {availableSections.map(section => (
                <TouchableOpacity
                  key={section}
                  style={[
                    styles.targetChip,
                    targetSection === section && styles.targetChipActive,
                  ]}
                  onPress={() => setTargetSection(section)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.targetChipText,
                      targetSection === section && styles.targetChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {section}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <TextInput
            style={[styles.searchInput, styles.reasonInput]}
            placeholder="Reason for rotation transfer"
            placeholderTextColor="#94a3b8"
            value={transferReason}
            onChangeText={setTransferReason}
            multiline
          />

          <TouchableOpacity
            style={[
              styles.transferButton,
              !canOpenConfirmation && styles.transferButtonDisabled,
            ]}
            onPress={handleOpenConfirmation}
            activeOpacity={0.85}
            disabled={!canOpenConfirmation}
          >
            <Ionicons name="swap-horizontal-outline" size={18} color="#ffffff" />
            <Text style={styles.transferButtonText}>Preview and Confirm Rotation</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.tableSection}>
          <View style={styles.tableHeaderBar}>
            <View>
              <Text style={styles.eyebrow}>Asset Selection</Text>
              <Text style={styles.tableTitle}>Section-Aware Asset Table</Text>
            </View>

            <View style={styles.syncPill}>
              <View style={styles.syncDot} />
              <Text style={styles.syncText}>{loading ? 'Syncing' : 'Current'}</Text>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={PRIMARY_BLUE} style={styles.largeLoader} />
          ) : filteredAssets.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={42} color="#94a3b8" />
              <Text style={styles.emptyTitle}>No assets match the current filters</Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
              <View style={styles.assetTable}>
                <View style={[styles.tableRow, styles.tableHeaderRow]}>
                  <Text style={[styles.selectHeader, styles.headerCell]} numberOfLines={1}>Select</Text>
                  <Text style={[styles.cell, styles.assetNameCell, styles.headerCell]} numberOfLines={1}>Asset</Text>
                  <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Asset No</Text>
                  <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>EPC</Text>
                  <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Section</Text>
                  <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Status</Text>
                  <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Verification</Text>
                  <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Verified Section</Text>
                  <Text style={[styles.dateCell, styles.headerCell]} numberOfLines={1}>Verified At</Text>
                </View>

                <FlatList
                  style={styles.assetList}
                  contentContainerStyle={styles.assetListContent}
                  data={filteredAssets}
                  keyExtractor={item =>
                    getAssetId(item) || normalizeText(item.assetNumber) || normalizeText(item.epc)
                  }
                  renderItem={renderAssetRow}
                  nestedScrollEnabled
                  initialNumToRender={18}
                  maxToRenderPerBatch={18}
                  windowSize={8}
                />
              </View>
            </ScrollView>
          )}
        </View>

        <View style={styles.tableSection}>
          <View style={styles.tableHeaderBar}>
            <View>
              <Text style={styles.eyebrow}>Transfer Preview</Text>
              <Text style={styles.tableTitle}>Selected Rotation Batch</Text>
            </View>
            <Text style={styles.previewCountText}>
              {previewRows.length} asset(s)
            </Text>
          </View>

          {previewRows.length === 0 || !targetSection.trim() ? (
            <View style={styles.emptyStateCompact}>
              <Text style={styles.emptyTitle}>Select assets and a target section to preview the transfer.</Text>
            </View>
          ) : (
            <>
              {previewRows.slice(0, previewLimit).map(row => {
                const verification = getLatestVerification(row.asset);

                return (
                  <View key={row.assetId} style={styles.previewRow}>
                    <View style={styles.previewBody}>
                      <Text style={styles.previewAssetName} numberOfLines={1}>
                        {getAssetDisplayName(row.asset)}
                      </Text>
                      <Text style={styles.previewMeta} numberOfLines={1}>
                        {row.fromSection} to {row.toSection} | {row.asset.status || dash}
                      </Text>
                      <Text style={styles.previewMeta} numberOfLines={1}>
                        Verification {getVerificationStatus(row.asset)} | Latest {verification.section} | {verification.verifiedAt}
                      </Text>
                    </View>
                    <View style={[styles.previewStatePill, row.willSkip && styles.previewStatePillWarning]}>
                      <Text style={[styles.previewStateText, row.willSkip && styles.previewStateTextWarning]}>
                        {row.willSkip ? 'Skip' : 'Transfer'}
                      </Text>
                    </View>
                  </View>
                );
              })}

              {previewRows.length > previewLimit ? (
                <Text style={styles.limitText}>
                  Showing {previewLimit} of {previewRows.length} selected assets.
                </Text>
              ) : null}
            </>
          )}
        </View>

        <View style={styles.tableSection}>
          <View style={styles.tableHeaderBar}>
            <View>
              <Text style={styles.eyebrow}>Lifecycle</Text>
              <Text style={styles.tableTitle}>Transfer History</Text>
            </View>

            <View style={styles.syncPill}>
              <View style={styles.syncDot} />
              <Text style={styles.syncText}>{historyLoading ? 'Loading' : 'Latest'}</Text>
            </View>
          </View>

          {historyLoading && lifecycle.length === 0 ? (
            <ActivityIndicator size="small" color={PRIMARY_BLUE} style={styles.inlineLoader} />
          ) : lifecycle.length === 0 ? (
            <View style={styles.emptyStateCompact}>
              <Text style={styles.emptyTitle}>No lifecycle records are available.</Text>
            </View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled>
                <View style={styles.lifecycleTable}>
                  <View style={[styles.tableRow, styles.tableHeaderRow]}>
                    <Text style={[styles.cell, styles.assetNameCell, styles.headerCell]} numberOfLines={1}>Asset</Text>
                    <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Asset No</Text>
                    <Text style={[styles.dateCell, styles.headerCell]} numberOfLines={1}>Date</Text>
                    <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>From</Text>
                    <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>To</Text>
                    <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Assigned By</Text>
                    <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Type</Text>
                    <Text style={[styles.reasonCell, styles.headerCell]} numberOfLines={1}>Reason</Text>
                    <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Asset Status</Text>
                    <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Verification</Text>
                  </View>

                  <FlatList
                    style={styles.lifecycleList}
                    contentContainerStyle={styles.assetListContent}
                    data={visibleLifecycle}
                    keyExtractor={item => getLifecycleKey(item)}
                    renderItem={renderLifecycleRow}
                    nestedScrollEnabled
                    initialNumToRender={12}
                    maxToRenderPerBatch={12}
                    windowSize={6}
                  />
                </View>
              </ScrollView>

              {lifecycle.length > lifecycleLimit ? (
                <Text style={styles.limitText}>
                  Showing latest {lifecycleLimit} of {lifecycle.length} lifecycle records.
                </Text>
              ) : null}
            </>
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
          <Pressable style={styles.confirmModal} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.eyebrow}>Confirm Transfer</Text>
                <Text style={styles.modalTitle}>Rotate {selectedAssets.length} asset(s)</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setConfirmationVisible(false)}
                activeOpacity={0.85}
                disabled={isTransferring}
              >
                <Ionicons name="close-outline" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <View style={styles.confirmSummary}>
              <Text style={styles.confirmLine}>Target section: {targetSection || dash}</Text>
              <Text style={styles.confirmLine}>Transfer type: rotation</Text>
              <Text style={styles.confirmLine}>
                Predicted skips: {previewRows.filter(row => row.willSkip).length}
              </Text>
              <Text style={styles.confirmLine}>
                Reason: {transferReason.trim() || dash}
              </Text>
            </View>

            {confirmationError ? (
              <Text style={styles.confirmationError}>{confirmationError}</Text>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setConfirmationVisible(false)}
                activeOpacity={0.85}
                disabled={isTransferring}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmButton, isTransferring && styles.transferButtonDisabled]}
                onPress={handleConfirmTransfer}
                activeOpacity={0.85}
                disabled={isTransferring}
              >
                {isTransferring ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={17} color="#ffffff" />
                    <Text style={styles.confirmButtonText}>Execute Transfer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={Boolean(transferResult)}
        transparent
        animationType="fade"
        onRequestClose={() => setTransferResult(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setTransferResult(null)}>
          <Pressable style={styles.resultModal} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.eyebrow}>Transfer Result</Text>
                <Text style={styles.modalTitle}>
                  {transferResult?.summary.failed
                    ? 'Completed with issues'
                    : transferResult?.summary.skipped
                      ? 'Completed with skips'
                      : 'Transfer complete'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setTransferResult(null)}
                activeOpacity={0.85}
              >
                <Ionicons name="close-outline" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {transferResult ? (
              <ScrollView style={styles.resultScroll} showsVerticalScrollIndicator>
                <View style={styles.resultGrid}>
                  <View style={styles.resultPill}>
                    <Text style={styles.resultValue}>{transferResult.summary.requested}</Text>
                    <Text style={styles.resultLabel}>Requested</Text>
                  </View>
                  <View style={styles.resultPill}>
                    <Text style={styles.resultValue}>{transferResult.summary.transferred}</Text>
                    <Text style={styles.resultLabel}>Transferred</Text>
                  </View>
                  <View style={styles.resultPill}>
                    <Text style={styles.resultValue}>{transferResult.summary.skipped}</Text>
                    <Text style={styles.resultLabel}>Skipped</Text>
                  </View>
                  <View style={styles.resultPill}>
                    <Text style={styles.resultValue}>{transferResult.summary.failed}</Text>
                    <Text style={styles.resultLabel}>Failed</Text>
                  </View>
                </View>

                {transferResult.transferred.length > 0 ? (
                  <View style={styles.resultSection}>
                    <Text style={styles.resultSectionTitle}>Transferred</Text>
                    {transferResult.transferred.slice(0, 12).map(item => (
                      <Text key={item.assetId} style={styles.resultLine} numberOfLines={2}>
                        {renderResultAssetName(item.assetId, item.asset)}: {item.fromSection || dash} to {item.toSection}
                      </Text>
                    ))}
                  </View>
                ) : null}

                {transferResult.skipped.length > 0 ? (
                  <View style={styles.resultSection}>
                    <Text style={styles.resultSectionTitle}>Skipped</Text>
                    {transferResult.skipped.map(item => (
                      <Text key={item.assetId} style={styles.resultLine} numberOfLines={2}>
                        {renderResultAssetName(item.assetId)}: {item.reason || 'skipped'}
                      </Text>
                    ))}
                  </View>
                ) : null}

                {transferResult.errors.length > 0 ? (
                  <View style={styles.resultSection}>
                    <Text style={styles.resultSectionTitle}>Failures</Text>
                    {transferResult.errors.map(item => (
                      <Text key={item.assetId} style={styles.resultErrorLine} numberOfLines={3}>
                        {renderResultAssetName(item.assetId)}: {item.message}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </ScrollView>
            ) : null}
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
  countBadge: {
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
    fontSize: 10,
    color: '#64748b',
    marginTop: 1,
  },
  content: {
    flex: 1,
  },
  contentBody: {
    padding: 10,
    paddingBottom: 22,
  },
  errorBanner: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  errorBannerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '700',
    color: '#991b1b',
  },
  metricsRow: {
    flexDirection: 'row',
    marginHorizontal: -4,
    marginBottom: 10,
  },
  metricPill: {
    flex: 1,
    minHeight: 58,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  metricValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  metricLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  panel: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 12,
    marginBottom: 10,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
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
    color: '#1d4ed8',
  },
  searchInput: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    fontSize: 13,
    color: '#0f172a',
  },
  reasonInput: {
    marginTop: 10,
    minHeight: 76,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  filterLabel: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    textTransform: 'uppercase',
  },
  chipScroll: {
    marginRight: -12,
  },
  filterChip: {
    maxWidth: 190,
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginRight: 8,
  },
  filterChipActive: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  filterChipTextActive: {
    color: PRIMARY_BLUE,
  },
  selectionActions: {
    flexDirection: 'row',
    marginHorizontal: -4,
  },
  secondaryActionButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginHorizontal: 4,
  },
  secondaryActionText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '800',
    color: PRIMARY_BLUE,
  },
  inlineLoader: {
    marginVertical: 14,
  },
  emptyInline: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  emptyInlineText: {
    fontSize: 12,
    color: '#64748b',
  },
  targetGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: -8,
  },
  targetChip: {
    maxWidth: '48%',
    minHeight: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    paddingHorizontal: 10,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  targetChipActive: {
    borderColor: '#1d4ed8',
    backgroundColor: '#dbeafe',
  },
  targetChipText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  targetChipTextActive: {
    color: '#1d4ed8',
  },
  transferButton: {
    marginTop: 12,
    minHeight: 44,
    borderRadius: 8,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  transferButtonDisabled: {
    opacity: 0.58,
  },
  transferButtonText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  tableSection: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 10,
    marginBottom: 10,
  },
  tableHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  tableTitle: {
    marginTop: 3,
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  syncPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  syncDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#16a34a',
    marginRight: 6,
  },
  syncText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
  },
  previewCountText: {
    fontSize: 12,
    fontWeight: '800',
    color: PRIMARY_BLUE,
  },
  largeLoader: {
    marginVertical: 34,
  },
  emptyState: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateCompact: {
    minHeight: 86,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'center',
  },
  assetTable: {
    minWidth: 1220,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  lifecycleTable: {
    minWidth: 1380,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  assetList: {
    maxHeight: 380,
  },
  lifecycleList: {
    maxHeight: 280,
  },
  assetListContent: {
    paddingBottom: 6,
  },
  tableHeaderRow: {
    backgroundColor: '#f8fafc',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  tableRowAlternate: {
    backgroundColor: '#f8fafc',
  },
  tableRowSelected: {
    backgroundColor: '#eff6ff',
  },
  selectHeader: {
    width: 70,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    fontSize: 11,
  },
  selectCell: {
    width: 70,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCellActive: {
    backgroundColor: PRIMARY_BLUE,
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
  assetNameCell: {
    width: 160,
  },
  dateCell: {
    width: 170,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    fontSize: 11,
    color: '#0f172a',
    overflow: 'hidden',
  },
  reasonCell: {
    width: 180,
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
    width: 120,
    paddingVertical: 7,
    paddingHorizontal: 8,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    justifyContent: 'center',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#f1f5f9',
  },
  statusBadgeHealthy: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeRepairable: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeBeyondRepair: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  statusTextHealthy: {
    color: '#166534',
  },
  statusTextRepairable: {
    color: '#92400e',
  },
  statusTextBeyondRepair: {
    color: '#991b1b',
  },
  previewRow: {
    minHeight: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 8,
  },
  previewBody: {
    flex: 1,
    minWidth: 0,
    marginRight: 10,
  },
  previewAssetName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  previewMeta: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  previewStatePill: {
    borderRadius: 999,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewStatePillWarning: {
    backgroundColor: '#fef3c7',
  },
  previewStateText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#166534',
  },
  previewStateTextWarning: {
    color: '#92400e',
  },
  limitText: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    justifyContent: 'center',
    padding: 18,
  },
  confirmModal: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 16,
  },
  resultModal: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 16,
    maxHeight: '82%',
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
    maxWidth: 260,
  },
  modalCloseButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmSummary: {
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
  },
  confirmLine: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  confirmationError: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '700',
    color: '#b91c1c',
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  cancelButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  confirmButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginLeft: 8,
  },
  confirmButtonText: {
    marginLeft: 7,
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  resultScroll: {
    maxHeight: 520,
  },
  resultGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 10,
  },
  resultPill: {
    width: '48%',
    minHeight: 62,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  resultLabel: {
    marginTop: 2,
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  resultSection: {
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
    paddingTop: 10,
    marginTop: 6,
  },
  resultSectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  resultLine: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 5,
  },
  resultErrorLine: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b91c1c',
    marginBottom: 5,
  },
});
