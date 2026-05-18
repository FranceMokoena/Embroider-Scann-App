import React, { useEffect, useState, useCallback } from 'react';
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
import { apiRequest } from '../../config/api';
import { PRIMARY_BLUE } from '../../theme/erpTheme';

// HealthyAssetsScreen
// UI REWORK ONLY
// Logic, architecture, naming and backend flow untouched.

export default function HealthyAssetsScreen({ navigation }: any) {
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');

  const loadAssets = useCallback(async () => {
    setLoading(true);

    try {
      const result = await apiRequest<{ assets: any[] }>(
        `/api/assets?status=Healthy`,
        { method: 'GET' }
      );

      setAssets(result.assets || []);
    } catch (err) {
      console.error('Failed to load healthy assets', err);
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

  const handleSendForStatusReview = () => {
    setReviewMessage(
      `${assets.length} asset successfully sent for Healthy status review`,
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#f4f6f8"
      />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.leftHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons
              name="arrow-back"
              size={18}
              color="#0f172a"
            />
          </TouchableOpacity>

          <View>
            <Text style={styles.title}>Healthy Assets</Text>
            <Text style={styles.subtitle}>
              Active operational assets
            </Text>
          </View>
        </View>

        <View style={styles.countWrap}>
          <Text style={styles.countValue}>{assets.length}</Text>
          <Text style={styles.countLabel}>Assets</Text>
        </View>
      </View>

      {/* ACTION BAR */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionButton, styles.productionButton]}
          onPress={handleSendForStatusReview}
          activeOpacity={0.8}
        >
          <Ionicons name="send-outline" size={14} color="#166534" />
          <Text style={[styles.actionText, styles.productionText]}>Send For Review</Text>
        </TouchableOpacity>

       

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => {}}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={14} color="#b91c1c" />
          <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.exportButton]}
          onPress={() => {}}
          activeOpacity={0.8}
        >
          <Ionicons name="download-outline" size={14} color={PRIMARY_BLUE} />
          <Text style={[styles.actionText, styles.exportText]}>Export</Text>
        </TouchableOpacity>
      </View>

      {/* TABLE */}
      <ScrollView
        style={styles.tableWrap}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {loading ? (
          <ActivityIndicator
            size="large"
            color={PRIMARY_BLUE}
            style={{ marginTop: 30 }}
          />
        ) : assets.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name="cube-outline"
              size={44}
              color="#94a3b8"
            />

            <Text style={styles.emptyTitle}>
              No Healthy Assets
            </Text>

            <Text style={styles.emptyText}>
              No operational assets were found in the system.
            </Text>
          </View>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            <View style={styles.table}>

              {/* TABLE HEADER */}
              <View style={[styles.tableRow, styles.tableHeader]}>

                <Text
                  numberOfLines={1}
                  style={[styles.cell, styles.headerCell]}
                >
                  Asset Name
                </Text>

                <Text
                  numberOfLines={1}
                  style={[styles.cell, styles.headerCell]}
                >
                  Asset No
                </Text>

                <Text
                  numberOfLines={1}
                  style={[styles.cell, styles.headerCell]}
                >
                  EPC
                </Text>

                <Text
                  numberOfLines={1}
                  style={[styles.cell, styles.headerCell]}
                >
                  Department
                </Text>

                <Text
                  numberOfLines={1}
                  style={[styles.cell, styles.headerCell]}
                >
                  Status
                </Text>

                <Text
                  numberOfLines={1}
                  style={[styles.cell, styles.headerCell]}
                >
                  Serial No
                </Text>

                <Text
                  numberOfLines={1}
                  style={[styles.cell, styles.headerCell]}
                >
                  Created
                </Text>
              </View>

              {/* TABLE ROWS */}
              {assets.map(asset => (
                <View
                  key={asset._id}
                  style={styles.tableRow}
                >

                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={styles.cell}
                  >
                    {asset.assetName || asset.name || '—'}
                  </Text>

                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={styles.cell}
                  >
                    {asset.assetNumber || '—'}
                  </Text>

                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={styles.cell}
                  >
                    {asset.epc || asset.epcKey || '—'}
                  </Text>

                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={styles.cell}
                  >
                    {asset.department || '—'}
                  </Text>

                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={[
                      styles.cell,
                      styles.statusText,
                    ]}
                  >
                    {asset.status || '—'}
                  </Text>

                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={styles.cell}
                  >
                    {asset.serialNumber || '—'}
                  </Text>

                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={styles.cell}
                  >
                    {asset.createdAt
                      ? new Date(
                          asset.createdAt
                        ).toLocaleDateString()
                      : '—'}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
      </ScrollView>

      <Modal
        visible={Boolean(reviewMessage)}
        transparent
        animationType="fade"
        onRequestClose={() => setReviewMessage('')}
      >
        <Pressable style={styles.feedbackOverlay} onPress={() => setReviewMessage('')}>
          <Pressable style={styles.feedbackCard} onPress={() => {}}>
            <View style={styles.feedbackIconWrap}>
              <Ionicons name="checkmark-circle-outline" size={34} color="#166534" />
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
  container: {
    flex: 1,
    backgroundColor: '#f4f6f8',
    marginTop:25,
  },
actionButton: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: 10,
  paddingVertical: 7,
  borderRadius: 8,
  gap: 5,
},

productionButton: {
  backgroundColor: '#dcfce7',
  borderWidth: 1,
  borderColor: '#bbf7d0',
},

deleteButton: {
  backgroundColor: '#fee2e2',
  borderWidth: 1,
  borderColor: '#fecaca',
},

exportButton: {
  backgroundColor: '#dbeafe',
  borderWidth: 1,
  borderColor: '#bfdbfe',
},

actionText: {
  fontSize: 11,
  fontWeight: '600',
},

productionText: {
  color: '#166534',
},

deleteText: {
  color: '#b91c1c',
},

exportText: {
  color: '#1d4ed8',
},

repairButton: {
  backgroundColor: '#fef3c7',
  borderWidth: 1,
  borderColor: '#fde68a',
},

repairText: {
  color: '#92400e',
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

  /* ACTION BAR */

  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },

 

  /* TABLE */

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
    minWidth: 780,
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

  statusText: {
    fontWeight: '700',
    color: '#15803d',
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
  feedbackOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  feedbackCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 20,
    alignItems: 'center',
  },
  feedbackIconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  feedbackText: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
    textAlign: 'center',
  },
  feedbackButton: {
    marginTop: 18,
    height: 42,
    alignSelf: 'stretch',
    borderRadius: 8,
    backgroundColor: PRIMARY_BLUE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
