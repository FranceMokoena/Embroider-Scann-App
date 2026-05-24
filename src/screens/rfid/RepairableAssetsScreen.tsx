import React from 'react';
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

import ErpConfirmModal from '../../components/erp/ErpConfirmModal';
import { getAssetDisplayName } from '../../services/assetApi';
import { PRIMARY_BLUE } from '../../theme/erpTheme';
import { useAssetListScreen } from './hooks/useAssetListScreen';

export default function RepairableAssetsScreen({ navigation }: any) {
  const {
    assets,
    loading,
    refreshing,
    reviewMessage,
    setReviewMessage,
    selectedAsset,
    deleteModalVisible,
    exportModalVisible,
    isDeleting,
    isExporting,
    setDeleteModalVisible,
    setExportModalVisible,
    onRefresh,
    handleSelectAsset,
    isAssetSelected,
    handleDeletePress,
    handleExportPress,
    handleConfirmDelete,
    handleConfirmExport,
    handleSendForStatusReview,
  } = useAssetListScreen({
    statusFilter: 'Repairable',
    exportTitle: 'Repairable Assets Export',
    reviewMessageTemplate: count =>
      `${count} asset successfully sent for Repairable status review`,
  });

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
      </View>

      

      <View style={styles.actionBar}>
        

        <TouchableOpacity style={[styles.actionButton, styles.repairButton]} onPress={handleSendForStatusReview} activeOpacity={0.8}>
          <Ionicons name="send-outline" size={14} color="#92400e" />
          <Text style={[styles.actionText, styles.repairText]}>Send For Review</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={handleDeletePress} activeOpacity={0.8}>
          <Ionicons name="trash-outline" size={14} color="#b91c1c" />
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.exportButton]} onPress={handleExportPress} activeOpacity={0.8}>
          <Ionicons name="download-outline" size={14} color={PRIMARY_BLUE} />
          <Text style={[styles.actionText, styles.exportText]}>Export</Text>
        </TouchableOpacity>
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
                <Text style={[styles.cell, styles.headerCell]}>Section</Text>
                <Text style={[styles.cell, styles.headerCell]}>Status</Text>
                <Text style={[styles.cell, styles.headerCell]}>Serial Number</Text>
                <Text style={[styles.cell, styles.headerCell]}>Created Date</Text>
              </View>

              {assets.map(asset => (
                <Pressable
                  key={asset.id || asset._id}
                  onPress={() => handleSelectAsset(asset)}
                  style={[styles.tableRow, isAssetSelected(asset) && styles.tableRowSelected]}
                >
                  <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cell}>{asset.assetName || asset.name || '—'}</Text>
                  <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cell}>{asset.assetNumber || '—'}</Text>
                  <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cell}>{asset.epc || asset.epcKey || '—'}</Text>
                  <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cell}>{asset.section || asset.department || asset.category || asset.location || '—'}</Text>
                  <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.cell, styles.statusText]}>{asset.status || '—'}</Text>
                  <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cell}>{asset.serialNumber || '—'}</Text>
                  <Text numberOfLines={1} ellipsizeMode="tail" style={styles.cell}>{asset.createdAt ? new Date(asset.createdAt).toLocaleDateString() : '—'}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
      </ScrollView>

      <ErpConfirmModal
        visible={deleteModalVisible}
        title="Delete Asset"
        message={
          selectedAsset
            ? `Permanently delete "${getAssetDisplayName(selectedAsset)}"? This action cannot be undone.`
            : ''
        }
        confirmLabel="Confirm Delete"
        confirmTone="danger"
        loading={isDeleting}
        onCancel={() => setDeleteModalVisible(false)}
        onConfirm={handleConfirmDelete}
      />

      <ErpConfirmModal
        visible={exportModalVisible}
        title="Export Asset"
        message={
          selectedAsset
            ? `Export "${getAssetDisplayName(selectedAsset)}" as an ERP PDF register document?`
            : ''
        }
        confirmLabel="Proceed Export"
        loading={isExporting}
        onCancel={() => setExportModalVisible(false)}
        onConfirm={handleConfirmExport}
      />

      <Modal
        visible={Boolean(reviewMessage)}
        transparent
        animationType="fade"
        onRequestClose={() => setReviewMessage('')}
      >
        <Pressable style={styles.feedbackOverlay} onPress={() => setReviewMessage('')}>
          <Pressable style={styles.feedbackCard} onPress={() => {}}>
            <View style={styles.feedbackIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={34} color="#92400e" />
            </View>
            <Text style={styles.feedbackTitle}>Review Request Sent</Text>
            <Text style={styles.feedbackText}>{reviewMessage}</Text>
            <TouchableOpacity
              style={styles.feedbackButton}
              onPress={() => setReviewMessage('')}
              activeOpacity={0.85}
            >
              <Text style={styles.feedbackButtonText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' ,marginTop: 25},
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#e6e9ee' },
  backButton: { padding: 8, marginRight: 12 },
  headerText: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#475569', marginTop: 2 },
  countWrap: { alignItems: 'flex-end' },
  countLabel: { fontSize: 12, color: '#64748b' },
  countValue: { fontSize: 16, fontWeight: '800', color: PRIMARY_BLUE },
  actionBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, gap: 8, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, gap: 5 },
  productionButton: { backgroundColor: '#dcfce7', borderWidth: 1, borderColor: '#bbf7d0' },
  repairButton: { backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a' },
  deleteButton: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fecaca' },
  exportButton: { backgroundColor: '#dbeafe', borderWidth: 1, borderColor: '#bfdbfe' },
  actionText: { fontSize: 11, fontWeight: '600' },
  productionText: { color: '#166534' },
  repairText: { color: '#92400e' },
  deleteText: { color: '#b91c1c' },
  exportText: { color: '#1d4ed8' },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#e6e9ee' },
  summaryItem: { alignItems: 'center', minWidth: 100 },
  summaryNumber: { fontSize: 16, fontWeight: '700', color: '#0f172a' },
  summaryLabel: { fontSize: 11, color: '#64748b', marginTop: 4 },
  tableWrap: { flex: 1, padding: 12 },
  table: { backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: '#dbe2ea', minWidth: 780, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#edf2f7' },
  tableRowSelected: { backgroundColor: '#eff6ff' },
  tableHeader: { backgroundColor: '#f8fafc' },
  headerCell: { fontWeight: '700', fontSize: 11, color: '#0f172a', backgroundColor: '#f8fafc' },
  cell: { width: 112, paddingVertical: 10, paddingHorizontal: 8, fontSize: 11, color: '#0f172a', borderRightWidth: 1, borderRightColor: '#e2e8f0', overflow: 'hidden' },
  statusText: { fontWeight: '700', color: '#92400e' },
  emptyState: { marginTop: 50, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155', marginTop: 12 },
  emptyText: { marginTop: 6, fontSize: 12, color: '#64748b', textAlign: 'center', paddingHorizontal: 30 },
  feedbackOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.38)', justifyContent: 'center', paddingHorizontal: 20 },
  feedbackCard: { backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#dbe2ea', padding: 20, alignItems: 'center' },
  feedbackIconWrap: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  feedbackTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', textAlign: 'center' },
  feedbackText: { marginTop: 8, fontSize: 13, lineHeight: 19, color: '#475569', textAlign: 'center' },
  feedbackButton: { marginTop: 18, height: 42, alignSelf: 'stretch', borderRadius: 8, backgroundColor: PRIMARY_BLUE, alignItems: 'center', justifyContent: 'center' },
  feedbackButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
});
