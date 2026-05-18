import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { PRIMARY_BLUE } from '../../theme/erpTheme';

type AssetRecord = {
  id?: string;
  _id?: string;
  assetName?: string;
  name?: string;
  assetNumber?: string | null;
  epc?: string | null;
  epcKey?: string | null;
  department?: string | null;
  status?: string | null;
  serialNumber?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  assignedTechnician?: string | null;
  technician?: string | null;
  assignedTo?: string | null;
  location?: string | null;
  verificationStatus?: string | null;
};

type FilterMode = 'assetName' | 'assetNumber' | 'epc' | 'department' | 'status' | 'serialNumber';

const filterOptions: Array<{ label: string; value: FilterMode }> = [
  { label: 'Asset Name', value: 'assetName' },
  { label: 'Asset Number', value: 'assetNumber' },
  { label: 'EPC', value: 'epc' },
  { label: 'Department', value: 'department' },
  { label: 'Status', value: 'status' },
  { label: 'Serial Number', value: 'serialNumber' },
];

const dash = '—';

const getAssetId = (asset: AssetRecord) =>
  asset.id || asset._id || asset.assetNumber || asset.epc || asset.epcKey || 'asset';

const getAssetName = (asset: AssetRecord) =>
  asset.assetName || asset.name || dash;

const getAssetEpc = (asset: AssetRecord) =>
  asset.epc || asset.epcKey || dash;

const getAssignedTechnician = (asset: AssetRecord) =>
  asset.assignedTechnician || asset.technician || asset.assignedTo || dash;

const getCurrentLocation = (asset: AssetRecord) =>
  asset.location || asset.department || dash;

const getVerificationStatus = (asset: AssetRecord) =>
  asset.verificationStatus || dash;

const formatDate = (value?: string | null) =>
  value ? new Date(value).toLocaleDateString() : dash;

const getFilterValue = (asset: AssetRecord, mode: FilterMode) => {
  if (mode === 'assetName') return getAssetName(asset);
  if (mode === 'assetNumber') return asset.assetNumber || '';
  if (mode === 'epc') return getAssetEpc(asset);
  if (mode === 'department') return asset.department || '';
  if (mode === 'status') return asset.status || '';
  return asset.serialNumber || '';
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

  const selectedFilter = filterOptions.find(option => option.value === filterMode);

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

  useEffect(() => {
    void loadAssets();
  }, [loadAssets]);

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      await loadAssets();
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
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{item.department || dash}</Text>
      <View style={styles.statusCell}>{renderStatusBadge(item.status)}</View>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{item.serialNumber || dash}</Text>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{formatDate(item.createdAt)}</Text>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{formatDate(item.updatedAt)}</Text>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{getAssignedTechnician(item)}</Text>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{getCurrentLocation(item)}</Text>
      <Text style={styles.cell} numberOfLines={1} ellipsizeMode="tail">{getVerificationStatus(item)}</Text>
    </TouchableOpacity>
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

      <View style={styles.tableSection}>
        <View style={styles.tableHeaderBar}>
          <View>
            <Text style={styles.eyebrow}>Master Records</Text>
            <Text style={styles.tableTitle}>Enterprise Asset Table</Text>
          </View>

          <View style={styles.syncPill}>
            <View style={styles.syncDot} />
            <Text style={styles.syncText}>{loading ? 'Syncing' : 'Current'}</Text>
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
          >
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Asset Name</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Asset Number</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>EPC</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Department</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Status</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Serial Number</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Created Date</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Updated Date</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Assigned Technician</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Current Location</Text>
                <Text style={[styles.cell, styles.headerCell]} numberOfLines={1}>Verification Status</Text>
              </View>

              <FlatList
                style={styles.assetList}
                data={filteredAssets}
                keyExtractor={(item, index) => `${getAssetId(item)}-${index}`}
                renderItem={renderAssetRow}
                initialNumToRender={18}
                maxToRenderPerBatch={18}
                windowSize={8}
                removeClippedSubviews
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
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
          <Pressable style={styles.detailModal} onPress={() => {}}>
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
                  ['Department', selectedAsset.department || dash],
                  ['Status', selectedAsset.status || dash],
                  ['Serial Number', selectedAsset.serialNumber || dash],
                  ['Current Location', getCurrentLocation(selectedAsset)],
                  ['Assigned Technician', getAssignedTechnician(selectedAsset)],
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
    zIndex: 2,
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
  tableSection: {
    flex: 1,
    margin: 10,
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
    minWidth: 1320,
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  tableScroll: {
    flex: 1,
  },
  assetList: {
    flex: 1,
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
});
