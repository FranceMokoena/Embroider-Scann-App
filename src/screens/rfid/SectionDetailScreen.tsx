import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useRoute } from '@react-navigation/native';

import {
  AssetRecord,
  fetchAssetsBySection,
  fetchSectionsSummary,
  getAssetDisplayName,
  SectionSummary,
} from '../../services/assetApi';
import { PRIMARY_BLUE } from '../../theme/erpTheme';

type SectionDetailRouteParams = {
  SectionDetailScreen: {
    sectionName: string;
  };
};

const dash = '—';

const formatDateTime = (value?: string | null) =>
  value ? new Date(value).toLocaleString() : dash;

const getAssetSection = (asset: AssetRecord) =>
  asset.section || asset.department || asset.category || asset.location || dash;

const getAssetEpc = (asset: AssetRecord) => asset.epc || asset.epcKey || dash;

const statusStyleKey = (status?: string | null) => {
  const normalized = (status || '').toLowerCase();

  if (normalized === 'healthy') return 'healthy';
  if (normalized === 'repairable') return 'repairable';
  if (normalized === 'beyond repair') return 'beyondRepair';
  return 'neutral';
};

export default function SectionDetailScreen({ navigation }: any) {
  const route = useRoute<RouteProp<SectionDetailRouteParams, 'SectionDetailScreen'>>();
  const sectionName = route.params?.sectionName || '';

  const [summary, setSummary] = useState<SectionSummary | null>(null);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetRecord | null>(null);

  const loadSectionData = useCallback(async () => {
    if (!sectionName) {
      setSummary(null);
      setAssets([]);
      return;
    }

    try {
      const [summaries, sectionAssets] = await Promise.all([
        fetchSectionsSummary(),
        fetchAssetsBySection(sectionName),
      ]);

      const match =
        summaries.find(item => item.section === sectionName) || {
          section: sectionName,
          totalAssets: sectionAssets.length,
          healthyAssets: sectionAssets.filter(a => a.status === 'Healthy').length,
          repairableAssets: sectionAssets.filter(a => a.status === 'Repairable').length,
          beyondRepairAssets: sectionAssets.filter(a => a.status === 'Beyond Repair').length,
          createdAt: null,
          createdBy: null,
        };

      setSummary(match);
      setAssets(sectionAssets);
    } catch (error) {
      console.error('Failed to load section detail', error);
      setSummary(null);
      setAssets([]);
    }
  }, [sectionName]);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await loadSectionData();
      setLoading(false);
    })();
  }, [loadSectionData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSectionData();
    setRefreshing(false);
  };

  const statusCounts = useMemo(
    () => ({
      healthy: assets.filter(a => a.status === 'Healthy').length,
      repairable: assets.filter(a => a.status === 'Repairable').length,
      beyondRepair: assets.filter(a => a.status === 'Beyond Repair').length,
    }),
    [assets],
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

          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>
              {sectionName || 'Section'}
            </Text>
            <Text style={styles.subtitle}>Section record and assets</Text>
          </View>
        </View>

        <View style={styles.countWrap}>
          <Text style={styles.countValue}>{assets.length}</Text>
          <Text style={styles.countLabel}>Assets</Text>
        </View>
      </View>

      {summary ? (
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Created</Text>
              <Text style={styles.summaryValue}>{formatDateTime(summary.createdAt)}</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>By (Admin)</Text>
              <Text style={styles.summaryValue}>{summary.createdBy || dash}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statPill, styles.statTotal]}>
              <Text style={styles.statValue}>{summary.totalAssets}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
            <View style={[styles.statPill, styles.statHealthy]}>
              <Text style={styles.statValue}>{statusCounts.healthy}</Text>
              <Text style={styles.statLabel}>Healthy</Text>
            </View>
            <View style={[styles.statPill, styles.statRepairable]}>
              <Text style={styles.statValue}>{statusCounts.repairable}</Text>
              <Text style={styles.statLabel}>Repairable</Text>
            </View>
            <View style={[styles.statPill, styles.statBeyond]}>
              <Text style={styles.statValue}>{statusCounts.beyondRepair}</Text>
              <Text style={styles.statLabel}>Beyond Repair</Text>
            </View>
          </View>
        </View>
      ) : null}

      <ScrollView
        style={styles.tableWrap}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color={PRIMARY_BLUE} style={{ marginTop: 30 }} />
        ) : assets.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={44} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No Assets In This Section</Text>
            <Text style={styles.emptyText}>
              No assets are currently assigned to this section.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text numberOfLines={1} style={[styles.cell, styles.headerCell]}>Asset Name</Text>
                <Text numberOfLines={1} style={[styles.cell, styles.headerCell]}>Asset No</Text>
                <Text numberOfLines={1} style={[styles.cell, styles.headerCell]}>EPC</Text>
                <Text numberOfLines={1} style={[styles.cell, styles.headerCell]}>Status</Text>
                <Text numberOfLines={1} style={[styles.cell, styles.headerCell]}>Serial No</Text>
                <Text numberOfLines={1} style={[styles.cell, styles.headerCell]}>Created</Text>
                <Text numberOfLines={1} style={[styles.cell, styles.headerCell]}>Updated</Text>
              </View>

              {assets.map(asset => {
                const statusKey = statusStyleKey(asset.status);

                return (
                  <Pressable
                    key={asset.id || asset._id}
                    onPress={() => setSelectedAsset(asset)}
                    style={styles.tableRow}
                  >
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cell}>
                      {getAssetDisplayName(asset)}
                    </Text>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cell}>
                      {asset.assetNumber || dash}
                    </Text>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cell}>
                      {getAssetEpc(asset)}
                    </Text>
                    <Text
                      numberOfLines={1}
                      ellipsizeMode="tail"
                      style={[styles.cell, styles.statusCell, styles[`status_${statusKey}`]]}
                    >
                      {asset.status || dash}
                    </Text>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cell}>
                      {asset.serialNumber || dash}
                    </Text>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cell}>
                      {formatDateTime(asset.createdAt)}
                    </Text>
                    <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cell}>
                      {formatDateTime(asset.updatedAt)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </ScrollView>

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
                  {selectedAsset ? getAssetDisplayName(selectedAsset) : dash}
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
                  ['Verification Status', selectedAsset.verificationStatus || dash],
                  ['Assigned By', selectedAsset.assignmentInformation?.assignedBy || dash],
                  ['Assigned At', formatDateTime(selectedAsset.assignmentInformation?.assignedAt)],
                  ['Created', formatDateTime(selectedAsset.createdAt)],
                  ['Last Updated', formatDateTime(selectedAsset.updatedAt)],
                ].map(([label, value]) => (
                  <View key={label} style={styles.detailRow}>
                    <Text style={styles.detailLabel}>{label}</Text>
                    <Text style={styles.detailValue} numberOfLines={3}>
                      {value}
                    </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  titleWrap: {
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
  countWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
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
  summaryCard: {
    marginHorizontal: 10,
    marginTop: 10,
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  summaryValue: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statPill: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
  },
  statTotal: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  statHealthy: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  statRepairable: {
    backgroundColor: '#fffbeb',
    borderColor: '#fde68a',
  },
  statBeyond: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
  tableWrap: {
    flex: 1,
    padding: 10,
  },
  table: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    overflow: 'hidden',
    minWidth: 820,
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  headerCell: {
    fontWeight: '700',
    fontSize: 11,
    color: '#0f172a',
    backgroundColor: '#f8fafc',
  },
  cell: {
    width: 118,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 11,
    color: '#0f172a',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    overflow: 'hidden',
  },
  statusCell: {
    fontWeight: '700',
  },
  status_healthy: {
    color: '#15803d',
  },
  status_repairable: {
    color: '#b45309',
  },
  status_beyondRepair: {
    color: '#b91c1c',
  },
  status_neutral: {
    color: '#64748b',
  },
  emptyState: {
    marginTop: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginTop: 12,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  detailModal: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 16,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 2,
  },
  modalCloseButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailGrid: {
    gap: 10,
  },
  detailRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
    paddingBottom: 8,
  },
  detailLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  detailValue: {
    marginTop: 3,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '600',
  },
});
