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

import { apiRequest } from '../../config/api';
import { normalizeEpc } from '../../rfid/chainwayRfid';
import { fetchDepartmentOptions, getAssetId, patchAssetById } from '../../services/assetApi';
import { useSectionAwareRefresh } from './hooks/useSectionAwareRefresh';
import { PRIMARY_BLUE } from '../../theme/erpTheme';
import { exportAssetsToPdf, exportLifecycleToPdf } from '../../utils/assetPdfExport';

type AssetRecord = {
  id?: string;
  _id?: string;
  assetName?: string;
  name?: string;
  assetNumber?: string | null;
  epc?: string | null;
  epcKey?: string | null;
  section?: string | null;
  department?: string | null;
  category?: string | null;
  status?: string | null;
  serialNumber?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  location?: string | null;
  verificationStatus?: string | null;
};

type FilterMode = 'assetName' | 'assetNumber' | 'epc' | 'section' | 'status' | 'serialNumber';

const filterOptions: Array<{ label: string; value: FilterMode }> = [
  { label: 'Asset Name', value: 'assetName' },
  { label: 'Asset Number', value: 'assetNumber' },
  { label: 'EPC', value: 'epc' },
  { label: 'Section', value: 'section' },
  { label: 'Status', value: 'status' },
  { label: 'Serial Number', value: 'serialNumber' },
];

type AssetLifecycleRecord = {
  _id?: string;
  assetName?: string;
  assetNumber?: string;
  initialSection?: string;
  currentSection?: string;
  assignedBy?: string;
  assignmentDate?: string;
  lastUpdated?: string;
};

const dash = '-';

const getAssetName = (asset: AssetRecord) =>
  asset.assetName || asset.name || dash;

const getAssetEpc = (asset: AssetRecord) =>
  asset.epc || asset.epcKey || dash;

const getAssetSection = (asset: AssetRecord) =>
  asset.section || asset.department || asset.category || asset.location || dash;

const getCurrentLocation = (asset: AssetRecord) =>
  getAssetSection(asset);

const getVerificationStatus = (asset: AssetRecord) =>
  asset.verificationStatus || dash;

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString() : dash;

const getFilterValue = (asset: AssetRecord, mode: FilterMode) => {
  if (mode === 'assetName') return getAssetName(asset);
  if (mode === 'assetNumber') return asset.assetNumber || '';
  if (mode === 'epc') return getAssetEpc(asset);
  if (mode === 'section') return getAssetSection(asset);
  if (mode === 'status') return asset.status || '';
  return asset.serialNumber || '';
};

const assetMatchesAssignCriteria = (
  asset: AssetRecord,
  mode: FilterMode,
  rawNeedle: string,
) => {
  const needle = rawNeedle.trim();
  if (!needle) {
    return false;
  }

  if (mode === 'epc') {
    const hay = normalizeEpc(getFilterValue(asset, 'epc'));
    const n = normalizeEpc(needle);
    return hay.includes(n) || hay === n;
  }

  return getFilterValue(asset, mode).toLowerCase().includes(needle.toLowerCase());
};

const statusStyleKey = (status?: string | null) => {
  const normalized = (status || '').toLowerCase();

  if (normalized === 'healthy') return 'healthy';
  if (normalized === 'repairable') return 'repairable';
  if (normalized === 'beyond repair') return 'beyondRepair';
  return 'neutral';
};

export default function AllAssetsScreen({ navigation }: any) {
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('assetName');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);

  const [assignFilterMode, setAssignFilterMode] = useState<FilterMode>('assetNumber');
  const [assignFilterValue, setAssignFilterValue] = useState('');
  const [assignFieldDropdownOpen, setAssignFieldDropdownOpen] = useState(false);
  const [assignTargetDepartment, setAssignTargetDepartment] = useState('');
  const [assignDeptDropdownOpen, setAssignDeptDropdownOpen] = useState(false);
  const [isApplyingAssignment, setIsApplyingAssignment] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [isExportingAssets, setIsExportingAssets] = useState(false);
  const [isExportingLifecycle, setIsExportingLifecycle] = useState(false);

  const [lifecycle, setLifecycle] = useState<AssetLifecycleRecord[]>([]);
  const [lifecycleLoading, setLifecycleLoading] = useState(false);

  const selectedFilter = filterOptions.find(option => option.value === filterMode);
  const selectedAssignFilter = filterOptions.find(option => option.value === assignFilterMode);

  const assetDepartments = useMemo(() => {
    const set = new Set<string>();
    assets.forEach(asset => {
      const d = getAssetSection(asset).trim();
      if (d) {
        set.add(d);
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [assets]);

  const availableDepartments = useMemo(() => {
    const set = new Set<string>([...departmentOptions, ...assetDepartments].filter(Boolean));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [assetDepartments, departmentOptions]);

  const loadAssets = useCallback(async () => {
    setLoading(true);

    try {
      const result = await apiRequest<{ assets?: AssetRecord[] }>('/api/assets', {
        method: 'GET',
      });

      setAssets(result.assets || []);
    } catch (error) {
      console.error('Failed to load all assets', error);
      setAssets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLifecycle = useCallback(async () => {
    setLifecycleLoading(true);

    try {
      const result = await apiRequest<{ lifecycle?: AssetLifecycleRecord[] }>('/api/assets/lifecycle/history', {
        method: 'GET',
      });

      setLifecycle(result.lifecycle || []);
    } catch (error) {
      console.error('Failed to load assignment lifecycle', error);
      setLifecycle([]);
    } finally {
      setLifecycleLoading(false);
    }
  }, []);

  const loadDepartmentOptions = useCallback(async () => {
    setDepartmentsLoading(true);

    try {
      const options = await fetchDepartmentOptions();
      setDepartmentOptions(options);
    } catch (error) {
      console.error('Failed to load section options', error);
      setDepartmentOptions([]);
    } finally {
      setDepartmentsLoading(false);
    }
  }, []);

  const refreshAllAssetViews = useCallback(async () => {
    await loadAssets();
    await loadLifecycle();
    await loadDepartmentOptions();
  }, [loadAssets, loadLifecycle, loadDepartmentOptions]);

  useEffect(() => {
    void refreshAllAssetViews();
  }, [refreshAllAssetViews]);

  useSectionAwareRefresh({
    onRefresh: refreshAllAssetViews,
  });

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await loadAssets();
      await loadLifecycle();
      await loadDepartmentOptions();
    } finally {
      setRefreshing(false);
    }
  };

  const filteredAssets = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    if (!query) {
      return assets;
    }

    return assets.filter(asset =>
      getFilterValue(asset, filterMode).toLowerCase().includes(query),
    );
  }, [assets, filterMode, searchQuery]);

  const handleApplyDepartmentAssignment = async () => {
    // TODO: Phase 7 — deprecate direct section PATCH UI.
    const targetDept = assignTargetDepartment.trim();
    if (!targetDept) {
      Alert.alert(
        'Section required',
        'Choose an existing section from the dropdown list.',
      );
      return;
    }

    if (!availableDepartments.includes(targetDept)) {
      Alert.alert(
        'Invalid section',
        'Select a section that already exists in the system.',
      );
      return;
    }

    const matches = assets.filter(asset =>
      assetMatchesAssignCriteria(asset, assignFilterMode, assignFilterValue),
    );

    if (matches.length === 0) {
      Alert.alert(
        'No matching assets',
        'No assets matched the selected field and value. Check your criteria and try again.',
      );
      return;
    }

    Alert.alert(
      'Confirm assignment',
      `Assign ${matches.length} asset(s) to "${targetDept}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            setIsApplyingAssignment(true);
            let ok = 0;
            const errors: string[] = [];

            for (const asset of matches) {
              const id = getAssetId(asset);
              if (!id) {
                continue;
              }
              try {
                await patchAssetById(id, { section: targetDept });
                ok += 1;
              } catch (e) {
                errors.push(
                  `${getAssetName(asset)}: ${e instanceof Error ? e.message : 'failed'}`,
                );
              }
            }

            setIsApplyingAssignment(false);
            setAssignFilterValue('');
            setAssignTargetDepartment('');
            await loadAssets();
            await loadLifecycle();
            await loadDepartmentOptions();

            if (errors.length) {
              Alert.alert(
                'Partially complete',
                `${ok} updated. ${errors.length} failed:\n${errors.slice(0, 5).join('\n')}`,
              );
            } else {
              Alert.alert('Success', `${ok} asset(s) assigned to ${targetDept}.`);
            }
          },
        },
      ],
    );
  };

  const handleExportAssets = async () => {
    setIsExportingAssets(true);

    try {
      await exportAssetsToPdf({
        title: 'All Assets - Master Records',
        statusLabel: loading ? 'Syncing' : 'Current',
        assets: filteredAssets,
      });
    } catch (error) {
      Alert.alert(
        'Export failed',
        error instanceof Error ? error.message : 'Failed to export the asset table.',
      );
    } finally {
      setIsExportingAssets(false);
    }
  };

  const handleExportLifecycle = async () => {
    setIsExportingLifecycle(true);

    try {
      await exportLifecycleToPdf({
        title: 'Asset Assignment Lifecycle',
        statusLabel: lifecycleLoading ? 'Loading' : 'Ready',
        records: lifecycle,
      });
    } catch (error) {
      Alert.alert(
        'Export failed',
        error instanceof Error ? error.message : 'Failed to export the assignment lifecycle.',
      );
    } finally {
      setIsExportingLifecycle(false);
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

  const renderAssetRow = ({ item, index }: { item: AssetRecord; index: number }) => (
    <TouchableOpacity
      style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}
      activeOpacity={0.82}
      onPress={() => setSelectedAsset(item)}
    >
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{getAssetName(item)}</Text>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{item.assetNumber || dash}</Text>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="middle">{getAssetEpc(item)}</Text>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{getAssetSection(item)}</Text>
      <View style={styles.statusCell}>{renderStatusBadge(item.status)}</View>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{item.serialNumber || dash}</Text>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{formatDate(item.createdAt)}</Text>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{formatDate(item.updatedAt)}</Text>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{getCurrentLocation(item)}</Text>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{getVerificationStatus(item)}</Text>
    </TouchableOpacity>
  );

  const renderLifecycleRow = ({ item, index }: { item: AssetLifecycleRecord; index: number }) => (
    <View style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlternate]}>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{item.assetName || dash}</Text>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{item.initialSection || dash}</Text>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{item.currentSection || dash}</Text>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{item.assignedBy || dash}</Text>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{formatDate(item.assignmentDate)}</Text>
      <TouchableOpacity
        style={styles.viewButton}
        activeOpacity={0.75}
        onPress={() => {
          const matchedAsset = assets.find(a => a.assetName === item.assetName);
          if (matchedAsset) {
            setSelectedAsset(matchedAsset);
          }
        }}
      >
        <Text style={styles.viewButtonText}>View</Text>
      </TouchableOpacity>
    </View>
  );

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
            <Text style={styles.title}>All Assets</Text>
            <Text style={styles.subtitle}>Centralized enterprise asset registry</Text>
          </View>
        </View>

        <View style={styles.countBadge}>
          <Text style={styles.countValue}>{filteredAssets.length}</Text>
          <Text style={styles.countLabel}>Assets</Text>
        </View>
      </View>

      <View style={styles.topScroll}>
        <View style={styles.topScrollContent}>
        <View style={styles.filterPanel}>
          <View style={styles.filterHeaderRow}>
            <View>
              <Text style={styles.eyebrow}>Registry Controls</Text>
              <Text style={styles.filterTitle}>Search and Filter</Text>
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
            <View style={styles.dropdownWrap}>
              <TouchableOpacity
                style={styles.dropdownButton}
                onPress={() => setDropdownOpen(previous => !previous)}
                activeOpacity={0.85}
              >
                <Text style={styles.dropdownButtonText} numberOfLines={1}>
                  {selectedFilter?.label || 'Asset Name'}
                </Text>
                <Ionicons
                  name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#334155"
                />
              </TouchableOpacity>

              {dropdownOpen ? (
                <View style={styles.dropdownList}>
                  {filterOptions.map(option => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.dropdownItem,
                        filterMode === option.value && styles.dropdownItemActive,
                      ]}
                      onPress={() => {
                        setFilterMode(option.value);
                        setDropdownOpen(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[
                        styles.dropdownItemText,
                        filterMode === option.value && styles.dropdownItemTextActive,
                      ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>

            <TextInput
              style={styles.searchInput}
              placeholder="Search asset registry"
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>
        </View>

        
      </View>
      </View>

      <View style={styles.tableSection}>
        <View style={styles.tableHeaderBar}>
          <View>
            <Text style={styles.eyebrow}>Master Records</Text>
            <Text style={styles.tableTitle}>Enterprise Asset Table</Text>
          </View>

          <View style={styles.tableActions}>
            <View style={styles.syncPill}>
              <View style={styles.syncDot} />
              <Text style={styles.syncText}>{loading ? 'Syncing' : 'Current'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.exportButtonCompact, isExportingAssets && styles.exportButtonDisabled]}
              onPress={handleExportAssets}
              disabled={isExportingAssets}
              activeOpacity={0.85}
            >
              {isExportingAssets ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons name="download-outline" size={14} color="#ffffff" />
              )}
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={PRIMARY_BLUE} style={{ marginTop: 34 }} />
        ) : filteredAssets.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="server-outline" size={42} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No assets found in the system</Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            style={styles.tableScroll}
            // allow nested vertical scrolling for child FlatList (Android)
            nestedScrollEnabled
            // help lock horizontal/vertical gesture direction so vertical swipes can reach the inner list
            directionalLockEnabled
          >
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Asset Name</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Asset Number</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>EPC</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Section</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Status</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Serial Number</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Created Date</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Updated Date</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Current Section</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Verification Status</Text>
              </View>

              <FlatList
                style={styles.assetList}
                contentContainerStyle={styles.assetListContent}
                data={filteredAssets}
                keyExtractor={(item, index) => `${getAssetId(item)}-${index}`}
                renderItem={(props) => {
                  // debug: ensure renderItem fires
                  // console.log('renderAssetRow', props.index);
                  return renderAssetRow(props);
                }}
                // allow nested vertical scrolling when inside a horizontal ScrollView
                nestedScrollEnabled
                showsVerticalScrollIndicator
                initialNumToRender={18}
                maxToRenderPerBatch={18}
                windowSize={8}
                
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListFooterComponent={<View style={{ height: 12 }} />}
              />
            </View>
          </ScrollView>
        )}
      </View>

      

      <Modal
        visible={Boolean(selectedAsset)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedAsset(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedAsset(null)}>
          <Pressable style={styles.detailModal} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.eyebrow}>Asset Detail</Text>
                <Text style={styles.modalTitle} numberOfLines={1}>
                  {selectedAsset ? getAssetName(selectedAsset) : dash}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setSelectedAsset(null)}
                activeOpacity={0.85}
              >
                <Ionicons name="close-outline" size={22} color="#0f172a" />
              </TouchableOpacity>
            </View>

            {selectedAsset ? (
              <View style={styles.detailGrid}>
                {[
                  ['Asset Number', selectedAsset.assetNumber || dash],
                  ['EPC', getAssetEpc(selectedAsset)],
                  ['Section', getAssetSection(selectedAsset)],
                  ['Status', selectedAsset.status || dash],
                  ['Serial Number', selectedAsset.serialNumber || dash],
                  ['Current Section', getCurrentLocation(selectedAsset)],
                  ['Verification Status', getVerificationStatus(selectedAsset)],
                ].map(([label, value]) => (
                  <View key={label} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{label}</Text>
                    <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
                  </View>
                ))}
              </View>
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
  topScroll: {
    maxHeight: 340,
    zIndex: 2,
  },
  topScrollContent: {
    paddingBottom: 8,
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
  filterPanel: {
    margin: 10,
    marginBottom: 0,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 12,
    zIndex: 4,
  },
  assignPanel: {
    margin: 10,
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 12,
    zIndex: 3,
  },
  assignHint: {
    marginTop: 6,
    marginBottom: 10,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  assignSubLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 4,
  },
  assignButton: {
    marginTop: 14,
    height: 44,
    borderRadius: 8,
    backgroundColor: PRIMARY_BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignButtonDisabled: {
    opacity: 0.7,
  },
  assignButtonText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  deptDropdownList: {
    maxHeight: 200,
  },
  dropdownEmpty: {
    padding: 12,
    fontSize: 12,
    color: '#64748b',
  },
  filterHeaderRow: {
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
  filterTitle: {
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dropdownWrap: {
    width: 150,
    marginRight: 8,
    zIndex: 5,
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
  tableSection: {
    flex: 1,
    margin: 10,
    marginTop: 0,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 10,
  },
  tableHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  tableActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  exportButton: {
    minHeight: 34,
    borderRadius: 8,
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonCompact: {
    height: 32,
    borderRadius: 8,
    backgroundColor: PRIMARY_BLUE,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonDisabled: {
    opacity: 0.72,
  },
  exportButtonText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  emptyState: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'center',
  },
  table: {
    minWidth: 1200,
    // avoid forcing flex here; let the surrounding ScrollView determine sizing
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#ffffff',
  },
  tableScroll: {
    // do not force flex on horizontal scroll; allow natural sizing
    // flex: 1,
  },
  assetList: {
    // Fixed max height so FlatList becomes scrollable when content exceeds this
    maxHeight: 420,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    justifyContent: 'center',
    padding: 18,
  },
  detailModal: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
  detailGrid: {
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
  },
  detailRow: {
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  detailValue: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  viewButton: {
    minWidth: 60,
    minHeight: 34,
    borderRadius: 6,
    backgroundColor: PRIMARY_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
});
