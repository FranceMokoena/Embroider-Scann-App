import React, { useCallback, useEffect, useState } from 'react';
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
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Alert } from 'react-native';

import { fetchSectionsSummary, createSection, SectionSummary } from '../../services/assetApi';
import { exportSectionsToPdf } from '../../utils/assetPdfExport';
import { PRIMARY_BLUE } from '../../theme/erpTheme';

const formatDateTime = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
};

export default function SectionsScreen({ navigation }: any) {
  const [sections, setSections] = useState<SectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingSection, setCreatingSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionManager, setNewSectionManager] = useState('');
  const [newSectionDescription, setNewSectionDescription] = useState('');
  const [formError, setFormError] = useState('');
  const [savingSection, setSavingSection] = useState(false);

  const loadSections = useCallback(async () => {
    try {
      const summary = await fetchSectionsSummary();
      setSections(summary);
    } catch (error) {
      console.error('Failed to load sections summary', error);
      setSections([]);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      await loadSections();
      setLoading(false);
    })();
  }, [loadSections]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadSections();
    setRefreshing(false);
  };

  const handleViewSection = (section: SectionSummary) => {
    navigation.navigate('SectionDetailScreen', {
      sectionName: section.section,
    });
  };

  const resetCreateForm = () => {
    setNewSectionName('');
    setNewSectionManager('');
    setNewSectionDescription('');
    setFormError('');
  };

  const handleCreateSection = async () => {
    if (!newSectionName.trim()) {
      setFormError('Section name is required');
      return;
    }

    setFormError('');
    setSavingSection(true);

    try {
      await createSection({
        section: newSectionName.trim(),
        manager: newSectionManager.trim(),
        description: newSectionDescription.trim() || undefined,
      });

      resetCreateForm();
      setCreatingSection(false);
      await loadSections();
    } catch (error: any) {
      setFormError(error?.message || 'Unable to create section');
    } finally {
      setSavingSection(false);
    }
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

          <View>
            <Text style={styles.title}>Sections</Text>
            <Text style={styles.subtitle}>All organizational sections</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={async () => {
              try {
                const data = sections.length > 0 ? sections : await fetchSectionsSummary();
                await exportSectionsToPdf({
                  title: 'Sections Export',
                  statusLabel: 'All Sections',
                  sections: data,
                });
              } catch (err: any) {
                console.error('Export failed', err);
                Alert.alert('Export failed', err?.message || 'Unable to export PDF');
              }
            }}
            style={[styles.createButton, styles.exportButton]}
            activeOpacity={0.85}
          >
            <Ionicons name="download-outline" size={18} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setCreatingSection(true)}
            style={styles.createButton}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.countWrap}>
            <Text style={styles.countValue}>{sections.length}</Text>
            <Text style={styles.countLabel}>Sections</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.tableWrap}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {loading ? (
          <ActivityIndicator
            size="large"
            color={PRIMARY_BLUE}
            style={{ marginTop: 30 }}
          />
        ) : sections.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="business-outline" size={44} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No Sections Found</Text>
            <Text style={styles.emptyText}>
              Sections appear when assets are assigned to a section or when you create a new section manually.
            </Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHeader]}>
                <Text numberOfLines={1} style={[styles.cell, styles.headerCell, styles.sectionCell]}>
                  Section
                </Text>
                <Text numberOfLines={1} style={[styles.cell, styles.headerCell, styles.dateCell]}>
                  Created
                </Text>
                <Text numberOfLines={1} style={[styles.cell, styles.headerCell, styles.managerCell]}>
                  Manager
                </Text>
                <Text numberOfLines={1} style={[styles.cell, styles.headerCell, styles.countCell]}>
                  Total Assets
                </Text>
                <Text numberOfLines={1} style={[styles.cell, styles.headerCell, styles.countCell]}>
                  Healthy
                </Text>
                <Text numberOfLines={1} style={[styles.cell, styles.headerCell, styles.countCell]}>
                  Repairable
                </Text>
                <Text numberOfLines={1} style={[styles.cell, styles.headerCell, styles.countCell]}>
                  Beyond Repair
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.cell, styles.headerCell, styles.actionCell, styles.actionHeaderText]}
                >
                  View Record
                </Text>
              </View>

              {sections.map(section => (
                <View key={section.section} style={styles.tableRow}>
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[styles.cell, styles.sectionCell, styles.sectionNameText]}
                  >
                    {section.section}
                  </Text>

                  <Text
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    style={[styles.cell, styles.dateCell]}
                  >
                    {formatDateTime(section.createdAt)}
                  </Text>

                  <Text
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    style={[styles.cell, styles.managerCell]}
                  >
                    {section.manager?.trim() || '—'}
                  </Text>

                  <Text style={[styles.cell, styles.countCell, styles.totalCount]}>
                    {section.totalAssets}
                  </Text>

                  <Text style={[styles.cell, styles.countCell, styles.healthyCount]}>
                    {section.healthyAssets}
                  </Text>

                  <Text style={[styles.cell, styles.countCell, styles.repairableCount]}>
                    {section.repairableAssets}
                  </Text>

                  <Text style={[styles.cell, styles.countCell, styles.beyondRepairCount]}>
                    {section.beyondRepairAssets}
                  </Text>

                  <View style={[styles.cell, styles.actionCell, styles.actionCellBody]}>
                    <Pressable
                      style={styles.viewButton}
                      onPress={() => handleViewSection(section)}
                    >
                      <Ionicons name="eye-outline" size={16} color={PRIMARY_BLUE} />
                      <Text style={styles.viewButtonText}>View</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </ScrollView>

      <Modal
        visible={creatingSection}
        transparent
        animationType="fade"
        onRequestClose={() => setCreatingSection(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setCreatingSection(false)} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>New Section</Text>
          <Text style={styles.modalSubtitle}>Enter the details for the new section.</Text>

          <TextInput
            placeholder="Section name"
            value={newSectionName}
            onChangeText={setNewSectionName}
            style={styles.textInput}
            placeholderTextColor="#64748b"
          />
          <TextInput
            placeholder="Section manager"
            value={newSectionManager}
            onChangeText={setNewSectionManager}
            style={styles.textInput}
            placeholderTextColor="#64748b"
          />
          <TextInput
            placeholder="Description"
            value={newSectionDescription}
            onChangeText={setNewSectionDescription}
            style={[styles.textInput, styles.textArea]}
            placeholderTextColor="#64748b"
            multiline
            numberOfLines={3}
          />

          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

          <View style={styles.modalActions}>
            <Pressable
              style={[styles.modalButton, styles.modalCancelButton]}
              onPress={() => {
                resetCreateForm();
                setCreatingSection(false);
              }}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.modalButton, styles.modalConfirmButton]}
              onPress={handleCreateSection}
              disabled={savingSection}
            >
              <Text style={styles.modalButtonText}>
                {savingSection ? 'Saving…' : 'Create'}
              </Text>
            </Pressable>
          </View>
        </View>
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
    minWidth: 1100,
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
    width: 112,
    paddingVertical: 10,
    paddingHorizontal: 8,
    fontSize: 11,
    color: '#0f172a',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    overflow: 'hidden',
  },
  sectionCell: {
    width: 140,
  },
  dateCell: {
    width: 150,
  },
  managerCell: {
    width: 140,
  },
  countCell: {
    width: 88,
    textAlign: 'center',
    fontWeight: '700',
  },
  actionCell: {
    width: 108,
    borderRightWidth: 0,
    justifyContent: 'center',
  },
  actionCellBody: {
    alignItems: 'center',
  },
  actionHeaderText: {
    textAlign: 'center',
  },

  exportButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0ea5a4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionNameText: {
    fontWeight: '700',
    color: PRIMARY_BLUE,
  },
  totalCount: {
    color: '#0f172a',
  },
  healthyCount: {
    color: '#15803d',
  },
  repairableCount: {
    color: '#b45309',
  },
  beyondRepairCount: {
    color: '#b91c1c',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    minWidth: 72,
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: PRIMARY_BLUE,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
  },
  modalCard: {
    position: 'absolute',
    top: '20%',
    left: '5%',
    right: '5%',
    backgroundColor: '#ffffff',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 14,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#0f172a',
    marginBottom: 12,
    fontSize: 13,
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 12,
    marginBottom: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  modalCancelButton: {
    backgroundColor: '#f1f5f9',
  },
  modalConfirmButton: {
    backgroundColor: PRIMARY_BLUE,
    marginLeft: 10,
  },
  modalButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
