import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { useRFIDStreamController } from '../../rfid/RFIDStreamController';
import { normalizeEpc } from '../../rfid/chainwayRfid';
import { apiRequest } from '../../config/api';
import { PRIMARY_BLUE } from '../../theme/erpTheme';

const STATUS_OPTIONS = [
  'Healthy',
  'Repairable',
  'Beyond Repair',
];

export default function BulkAssetCreate({ navigation }: any) {
  const { controller, snapshot } = useRFIDStreamController();

  const ownerId = useMemo(
    () => `BulkAsset-${Date.now()}`,
    [],
  );

  const [epcList, setEpcList] = useState<string[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);

  // FORM
  const [assetName, setAssetName] = useState('');
  const [assetNumber, setAssetNumber] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('Healthy');
  // ADD THIS STATE ABOVE
const [statusOpen, setStatusOpen] = useState(false);

  const lastRef = useRef<string | null>(null);

  const isControllerOwner = controller.isOwner(ownerId);
  const isControllerScanning = isControllerOwner &&
    (snapshot.lifecycle === 'scanning' ||
      snapshot.lifecycle === 'starting');
  const latestEntry = snapshot.entries[0] ?? null;

  useFocusEffect(
    useCallback(() => {
      return () => {
        if (controller.isOwner(ownerId)) {
          void controller.stopScan(ownerId);
        }
      };
    }, [controller, ownerId]),
  );

  // RFID MULTI CAPTURE
  useEffect(() => {
    if (!isScanning || !isControllerScanning) return;

    if (!latestEntry || latestEntry.epcRaw === lastRef.current) {
      return;
    }

    lastRef.current = latestEntry.epcRaw;

    const clean = normalizeEpc(latestEntry.epcRaw);

    setEpcList(prev => {
      if (prev.includes(clean)) return prev;
      return [clean, ...prev];
    });
  }, [isScanning, isControllerScanning, latestEntry]);

  const startScan = async () => {
    try {
      setIsScanning(true);
      lastRef.current = null;
      controller.clear();
      await controller.startScan(ownerId);
    } catch {
      setIsScanning(false);

      Alert.alert(
        'Scanner Error',
        'Unable to start RFID scanning.',
      );
    }
  };

  const stopScan = async () => {
    setIsScanning(false);
    await controller.stopScan(ownerId);
  };

  const removeTag = (tag: string) => {
    setEpcList(prev => prev.filter(t => t !== tag));
  };

  const submitBulkAssets = async () => {
    if (epcList.length === 0) {
      Alert.alert(
        'No RFID Tags',
        'Please scan RFID tags first.',
      );
      return;
    }

    if (
      !assetName ||
      !assetNumber ||
      !department ||
      !status
    ) {
      Alert.alert(
        'Missing Information',
        'Please complete all required fields.',
      );
      return;
    }

    setLoading(true);

    try {
      const result = await apiRequest<{
        createdCount?: number;
        skippedCount?: number;
        skipped?: Array<{ epc: string; reason: string }>;
      }>('/api/assets/bulk-create', {
        method: 'POST',
        body: {
          assetName,
          assetNumber,
          serialNumber,
          department,
          status,
          epcs: epcList,
        },
      });

      Alert.alert(
        'Registration Complete',
        `${result.createdCount ?? epcList.length} assets registered successfully.${
          result.skippedCount ? ` ${result.skippedCount} duplicate EPC(s) skipped.` : ''
        }`,
      );

      // RESET
      setEpcList([]);
      setAssetName('');
      setAssetNumber('');
      setSerialNumber('');
      setDepartment('');
      setStatus('Healthy');

    } catch (error) {
      Alert.alert(
        'Registration Failed',
        error instanceof Error ? error.message : 'Unable to complete bulk registration.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#f1f5f9"
      />

      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons
              name="arrow-back"
              size={20}
              color="#0f172a"
            />
          </TouchableOpacity>

          <View>
            <Text style={styles.headerTitle}>
              Bulk Asset Registration
            </Text>

            <Text style={styles.headerSubtitle}>
              RFID Enterprise Registration Portal
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* SUMMARY BAR */}
        <View style={styles.summaryCard}>
  
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
    
    {/* STATUS DOT + TEXT */}
    <View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: isScanning ? '#22c55e' : '#ef4444',
      }}
    />

    <Text style={styles.summaryValue}>
      {isScanning ? 'LIVE' : 'IDLE'}
    </Text>
    <Text style={{ fontSize: 20, fontWeight: '800', color: '#0f172a' }}>
      {epcList.length}
    </Text>

    <Text style={{ fontSize: 12, color: '#64748b', fontWeight: '600' }}>
      Tags Scanned
    </Text>





  </View>

  <Text style={styles.summaryLabel}>
    Scanner Status
  </Text>
</View>

{/* NEW: TOTAL TAG COUNT */}
  <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
    
  </View>












        {/* RFID PANEL */}
        <View style={styles.erpCard}>

          <View style={styles.cardHeader}>
            <Ionicons
              name="scan-outline"
              size={18}
              color="#0f172a"
            />

            <Text style={styles.cardTitle}>
              RFID Capture Console
            </Text>
          </View>

          <Text style={styles.description}>
            Scan and capture RFID tags before
            proceeding with enterprise asset registration.
          </Text>

          <TouchableOpacity
            style={[
              styles.scanBtn,
              isScanning && styles.stopBtn,
            ]}
            onPress={
              isScanning ? stopScan : startScan
            }
          >
            <Ionicons
              name={
                isScanning
                  ? 'stop-circle-outline'
                  : 'scan-outline'
              }
              size={18}
              color="#fff"
            />

            <Text style={styles.scanBtnText}>
              {isScanning
                ? 'Stop RFID Scanning'
                : 'Start RFID Scanning'}
            </Text>
          </TouchableOpacity>

          {/* RFID TABLE */}
          <View style={styles.tableContainer}>

            <View style={styles.tableHeader}>
              <Text style={[styles.tableHead, { flex: 1 }]}>
                EPC TAG
              </Text>

              <Text style={styles.tableHead}>
                ACTION
              </Text>
            </View>

            {epcList.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="radio-outline"
                  size={28}
                  color="#94a3b8"
                />

                <Text style={styles.emptyText}>
                  No RFID tags captured
                </Text>
              </View>
            ) : (
              epcList.map((tag, index) => (
                <View
                  key={tag}
                  style={[
                    styles.tableRow,
                    index % 2 === 0 && styles.altRow,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={styles.tagText}
                  >
                    {tag}
                  </Text>

                  <TouchableOpacity
                    onPress={() => removeTag(tag)}
                    style={styles.removeBtn}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={16}
                      color="#dc2626"
                    />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>

        {/* ERP FORM */}
        <View style={styles.erpCard}>

          <View style={styles.cardHeader}>
            <Ionicons
              name="document-text-outline"
              size={18}
              color="#0f172a"
            />

            <Text style={styles.cardTitle}>
              Asset Information Form
            </Text>
          </View>

          {/* ROW */}
          <View style={styles.formRow}>
            <Text style={styles.label}>
              Asset Name
            </Text>

            <TextInput
              value={assetName}
              onChangeText={setAssetName}
              style={styles.input}
              placeholder="Enter asset name"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* ROW */}
          <View style={styles.formRow}>
            <Text style={styles.label}>
              Asset Number
            </Text>

            <TextInput
              value={assetNumber}
              onChangeText={setAssetNumber}
              style={styles.input}
              placeholder="Enter asset number"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* ROW */}
          <View style={styles.formRow}>
            <Text style={styles.label}>
              Serial Number
            </Text>

            <TextInput
              value={serialNumber}
              onChangeText={setSerialNumber}
              style={styles.input}
              placeholder="Optional"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* ROW */}
          <View style={styles.formRow}>
            <Text style={styles.label}>
              Department
            </Text>

            <TextInput
              value={department}
              onChangeText={setDepartment}
              style={styles.input}
              placeholder="ICT / Finance / HR"
              placeholderTextColor="#94a3b8"
            />
          </View>








          {/* STATUS */}
          {/* STATUS DROPDOWN */}
<View style={styles.formRow}>
  <Text style={styles.label}>Status</Text>

  <View style={{ flex: 1 }}>

    {/* SELECTED FIELD */}
    <TouchableOpacity
      onPress={() => setStatusOpen(prev => !prev)}
      style={styles.dropdownBtn}
    >
      <Text style={styles.dropdownText}>{status}</Text>

      <Ionicons
        name={statusOpen ? 'chevron-up' : 'chevron-down'}
        size={18}
        color="#334155"
      />
    </TouchableOpacity>

    {/* DROPDOWN LIST (TEXT ONLY) */}
    {statusOpen && (
      <View style={styles.dropdownMenu}>
        {STATUS_OPTIONS.map(item => {
          const active = status === item;

          return (
            <TouchableOpacity
              key={item}
              onPress={() => {
                setStatus(item);
                setStatusOpen(false);
              }}
              style={styles.dropdownRow}
            >
              <Text
                style={[
                  styles.dropdownRowText,
                  active && styles.dropdownRowTextActive,
                ]}
              >
                {item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    )}

  </View>
</View>

        </View>

        {/* SUBMIT */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            loading && { opacity: 0.7 },
          ]}
          onPress={submitBulkAssets}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons
                name="save-outline"
                size={18}
                color="#fff"
              />

              <Text style={styles.submitText}>
                Register Assets
              </Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({

  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },

  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#dbe3ec',
    marginTop:25,
  },

  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },

  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },

  content: {
    padding: 16,
    paddingBottom: 50,
  },



dropdownBtn: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  height: 42,
  borderWidth: 1,
  borderColor: '#cbd5e1',
  borderRadius: 8,
  backgroundColor: '#f8fafc',
  paddingHorizontal: 12,
},

dropdownText: {
  fontSize: 13,
  fontWeight: '700',
  color: '#0f172a',
},

dropdownMenu: {
  marginTop: 6,
  borderWidth: 1,
  borderColor: '#e2e8f0',
  borderRadius: 10,
  backgroundColor: '#ffffff',
  overflow: 'hidden',
  elevation: 2,
},

// ✅ CLEAN TEXT ROW (NOT BUTTON LOOKING)
dropdownRow: {
  paddingVertical: 10,
  paddingHorizontal: 12,
},

dropdownRowText: {
  fontSize: 13,
  color: '#334155',
  fontWeight: '500',
},

dropdownRowTextActive: {
  color: PRIMARY_BLUE,
  fontWeight: '700',
},






  summaryBar: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe3ec',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    marginBottom: 16,
  },

  summaryCard: {
    flex: 1,
    alignItems: 'center',
  },

  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },

  summaryLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },

  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#e2e8f0',
  },

  erpCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#dbe3ec',
    marginBottom: 16,
    overflow: 'hidden',
  },

  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
    backgroundColor: '#f8fafc',
  },

  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },

  description: {
    paddingHorizontal: 16,
    paddingTop: 14,
    color: '#64748b',
    lineHeight: 20,
  },

  scanBtn: {
    margin: 16,
    backgroundColor: PRIMARY_BLUE,
    height: 46,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },

  stopBtn: {
    backgroundColor: '#b91c1c',
  },

  scanBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14,
  },

  tableContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    overflow: 'hidden',
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },

  tableHead: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },

  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },

  altRow: {
    backgroundColor: '#f8fafc',
  },

  tagText: {
    flex: 1,
    fontSize: 12,
    color: '#0f172a',
    fontWeight: '600',
  },

  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
    backgroundColor: '#ffffff',
  },

  emptyText: {
    marginTop: 8,
    color: '#94a3b8',
    fontWeight: '600',
  },

  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eef2f7',
    minHeight: 68,
    paddingHorizontal: 16,
  },

  label: {
    width: 120,
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },

  input: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#dbe3ec',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 42,
    color: '#0f172a',
    fontSize: 13,
  },

  statusContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  statusBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
  },

  activeStatus: {
    backgroundColor: '#dbeafe',
    borderColor: PRIMARY_BLUE,
  },

  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },

  activeStatusText: {
  color: PRIMARY_BLUE,
  },

  submitBtn: {
    backgroundColor: PRIMARY_BLUE,
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },

  submitText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },

});
