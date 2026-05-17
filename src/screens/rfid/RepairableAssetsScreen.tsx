import React, { useEffect, useState, useCallback } from 'react';
import {
  ActivityIndicator,
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
import { apiRequest } from '../../config/api';
import { PRIMARY_BLUE } from '../../theme/erpTheme';

// RepairableAssetsScreen
// Purpose: Dedicated ERP administrative screen listing assets with status === 'Repairable'.

export default function RepairableAssetsScreen({ navigation }: any) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiRequest<{ assets: any[] }>(`/api/assets?status=Repairable`, { method: 'GET' });
      setAssets(result.assets || []);
    } catch (err) {
      console.error('Failed to load repairable assets', err);
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f3f4f6" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={20} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerText}>
          <Text style={styles.title}>Repairable Assets</Text>
          <Text style={styles.subtitle}>Assets requiring maintenance or repair</Text>
        </View>

        <View style={styles.countWrap}>
          <Text style={styles.countLabel}>Total</Text>
          <Text style={styles.countValue}>{assets.length}</Text>
        </View>
      </View>

      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{assets.length}</Text>
          <Text style={styles.summaryLabel}>Total Assets</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>—</Text>
          <Text style={styles.summaryLabel}>Scanned Today</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{new Set(assets.map(a => a.department || '—')).size}</Text>
          <Text style={styles.summaryLabel}>Departments</Text>
        </View>
      </View>

      <ScrollView
        style={styles.tableWrap}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {loading ? (
          <ActivityIndicator size="large" color={PRIMARY_BLUE} style={{ marginTop: 24 }} />
        ) : assets.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No assets with status "Repairable" were found.</Text>
          </View>
        ) : (
          <ScrollView horizontal>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text style={[styles.cell, styles.headerCell]}>Asset Name</Text>
                <Text style={[styles.cell, styles.headerCell]}>Asset Number</Text>
                <Text style={[styles.cell, styles.headerCell]}>EPC</Text>
                <Text style={[styles.cell, styles.headerCell]}>Department</Text>
                <Text style={[styles.cell, styles.headerCell]}>Status</Text>
                <Text style={[styles.cell, styles.headerCell]}>Serial Number</Text>
                <Text style={[styles.cell, styles.headerCell]}>Created Date</Text>
              </View>

              {assets.map(asset => (
                <View key={asset._id} style={styles.tableRow}>
                  <Text style={styles.cell}>{asset.assetName || asset.name || '—'}</Text>
                  <Text style={styles.cell}>{asset.assetNumber || '—'}</Text>
                  <Text style={styles.cell}>{asset.epc || asset.epcKey || '—'}</Text>
                  <Text style={styles.cell}>{asset.department || '—'}</Text>
                  <Text style={styles.cell}>{asset.status || '—'}</Text>
                  <Text style={styles.cell}>{asset.serialNumber || '—'}</Text>
                  <Text style={styles.cell}>{asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : '—'}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#e6e9ee' },
  backButton: { padding: 8, marginRight: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#475569', marginTop: 2 },
  countWrap: { alignItems: 'flex-end' },
  countLabel: { fontSize: 12, color: '#64748b' },
  countValue: { fontSize: 16, fontWeight: '800', color: PRIMARY_BLUE },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#e6e9ee' },
  summaryItem: { alignItems: 'center', minWidth: 100 },
  summaryNumber: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  summaryLabel: { fontSize: 11, color: '#64748b', marginTop: 4 },
  tableWrap: { flex: 1, padding: 12 },
  table: { backgroundColor: '#ffffff', borderRadius: 6, borderWidth: 1, borderColor: '#e6e9ee', minWidth: 800 },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderColor: '#f1f5f9' },
  tableHeader: { backgroundColor: '#fafafa', borderBottomWidth: 1 },
  headerCell: { fontWeight: '700', color: '#0f172a' },
  cell: { minWidth: 140, paddingRight: 12, color: '#0f172a' },
  emptyState: { padding: 24, alignItems: 'center' },
  emptyText: { color: '#6b7280' },
});
