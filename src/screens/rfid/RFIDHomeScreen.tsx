import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import {
  RFIDMappingStatus,
  RFIDStreamEntry,
  useRFIDStreamController,
} from '../../rfid/RFIDStreamController';
import { apiRequest } from '../../config/api';
import { PRIMARY_BLUE } from '../../theme/erpTheme';

const scanLogKeysBySession = new Map<string, Set<string>>();

type RfidLookupResponse = {
  success?: boolean;
  epcRaw?: string;
  status?: RFIDMappingStatus;
  tag?: {
    id?: string;
    epcRaw?: string;
    epcKey?: string;
    status?: string;
  } | null;
  mapping?: {
    id?: string;
    status?: string;
    assignedAt?: string;
  } | null;
  asset?: {
    id?: string;
    assetName?: string;
    name?: string;
    serialNumber?: string | null;
    assetNumber?: string | null;
    location?: string | null;
    status?: string | null;
  } | null;
  error?: string;
};

type TechnicianProfile = {
  username: string;
  department: string;
  role: string;
};

type AssetStatusSummary = {
  total: number;
  Healthy: number;
  Repairable: number;
  'Beyond Repair': number;
};

const statusColor = (status: RFIDMappingStatus) => {
  if (status === 'assigned') return '#047857';
  if (status === 'unassigned') return '#b45309';
  return '#475569';
};

const statusBackground = (status: RFIDMappingStatus) => {
  if (status === 'assigned') return '#dcfce7';
  if (status === 'unassigned') return '#fef3c7';
  return '#e2e8f0';
};

const parseJsonResponse = async (response: Response) => {
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }

  return {};
};

export default function RFIDHomeScreen({ navigation }: any) {
  const { controller, snapshot } = useRFIDStreamController();
  const [lookupByEpc, setLookupByEpc] = useState<Record<string, RfidLookupResponse>>({});
  const [selectedEntry, setSelectedEntry] = useState<RFIDStreamEntry | null>(null);
  const [assetId, setAssetId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isProfileVisible, setIsProfileVisible] = useState(false);
  const [isDrawerVisible, setIsDrawerVisible] = useState(false);
  const [technician, setTechnician] = useState<TechnicianProfile>({
    username: 'Technician',
    department: 'RFID Operations',
    role: 'Technician',
  });
  const [assetSummary, setAssetSummary] = useState<AssetStatusSummary>({
    total: 0,
    Healthy: 0,
    Repairable: 0,
    'Beyond Repair': 0,
  });
  const requestedLookupKeysRef = useRef<Set<string>>(new Set());
  const snapshotRef = useRef(snapshot);
  const drawerTranslateX = useRef(new Animated.Value(320)).current;

  const isScanning =
    snapshot.lifecycle === 'starting' || snapshot.lifecycle === 'scanning';
  const canStop =
    snapshot.lifecycle === 'starting' ||
    snapshot.lifecycle === 'scanning' ||
    snapshot.lifecycle === 'paused';

  const summaryCards = useMemo(() => [
    { label: 'Healthy', value: assetSummary.Healthy, color: '#047857', bg: '#ecfdf5' },
    { label: 'Repairable', value: assetSummary.Repairable, color: '#b45309', bg: '#fffbeb' },
    { label: 'Beyond Repair', value: assetSummary['Beyond Repair'], color: '#b91c1c', bg: '#fef2f2' },
  ], [assetSummary]);

  const initials = useMemo(() => {
    return technician.username
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0).toUpperCase())
      .join('') || 'T';
  }, [technician.username]);

  const actionCards = useMemo(() => [
  {
    title: 'Asset Registry',
    subtitle: 'Register institutional assets',
    icon: 'business-outline',
    iconType: 'Ionicons',
    route: 'RfidAddAsset',
    
    iconBg: '#e2e8f0',
  },

  {
    title: 'Bulk Registration',
    subtitle: 'Mass asset onboarding',
    icon: 'layers-outline',
    iconType: 'Ionicons',
    route: 'RfidAssignTag',
    
    iconBg: '#e2e8f0',
  },

  {
    title: 'Room Audit',
    subtitle: 'Verify physical inventory',
    icon: 'shield-checkmark-outline',
    iconType: 'Ionicons',
    route: 'RfidVerifyAsset',
    
    iconBg: '#e2e8f0',
  },

  {
    title: 'Locate Asset',
    subtitle: 'Locate tagged inventory',
    icon: 'locate-outline',
    iconType: 'Ionicons',
    route: 'RfidLocateAsset',
    
    iconBg: '#e2e8f0',
  },

  {
    title: 'Search Asset',
    subtitle: 'Search registry records',
    icon: 'search-outline',
    iconType: 'Ionicons',
    route: 'SearchAssetScreen',
    
    iconBg: '#e2e8f0',
    wide: true,
  },

  {
    title: 'View All Assets',
    subtitle: 'View institutional assets',
    icon: 'server-outline',
    iconType: 'Ionicons',
    route: 'AllAssetsScreen',
    
    iconBg: '#e2e8f0',
    wide: true,
  },
], []);




  useEffect(() => {
    snapshotRef.current = snapshot;
  }, [snapshot]);

  useEffect(() => {
    const loadTechnicianProfile = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (!storedUser) {
          return;
        }

        const parsedUser = JSON.parse(storedUser);
        setTechnician({
          username: parsedUser.username || parsedUser.name || 'Technician',
          department: parsedUser.department || 'RFID Operations',
          role: parsedUser.role || 'Technician',
        });
      } catch (error) {
        console.log('RFID profile load failed', error);
      }
    };

    void loadTechnicianProfile();
  }, []);

  const loadAssetSummary = useCallback(async () => {
    try {
      const result = await apiRequest<{ summary: AssetStatusSummary }>('/api/assets/summary');
      if (!result?.summary) {
        throw new Error('Unable to load asset summary');
      }
      setAssetSummary(result.summary);
    } catch (error) {
      console.log('Asset summary load failed', error);
    }
  }, []);

  useEffect(() => {
    void loadAssetSummary();
  }, [loadAssetSummary]);

  useEffect(() => {
    Animated.timing(drawerTranslateX, {
      toValue: isDrawerVisible ? 0 : 320,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [drawerTranslateX, isDrawerVisible]);

  const ownerId = useMemo(() => 'RFIDHomeScreen', []);

  useFocusEffect(
    useCallback(() => {
      void loadAssetSummary();

      return () => {
        const sessionId = snapshotRef.current.activeSessionId;

        if (sessionId) {
          scanLogKeysBySession.delete(sessionId);
        }

        requestedLookupKeysRef.current.clear();

        if (controller.isOwner(ownerId)) {
          void controller.stopScan(ownerId);
        }
      };
    }, [controller, loadAssetSummary, ownerId]),
  );

  useEffect(() => {
    snapshot.entries.forEach(entry => {
      if (requestedLookupKeysRef.current.has(entry.epcKey)) {
        return;
      }

      requestedLookupKeysRef.current.add(entry.epcKey);
      void lookupEpc(entry);
    });
  }, [snapshot.entries]);

  useEffect(() => {
    const sessionId = snapshot.activeSessionId;

    return () => {
      if (sessionId) {
        scanLogKeysBySession.delete(sessionId);
      }
    };
  }, [snapshot.activeSessionId]);

  const lookupEpc = async (entry: RFIDStreamEntry) => {
    try {
      const result = await apiRequest<RfidLookupResponse>(
        `/api/rfid/lookup/${encodeURIComponent(entry.epcRaw)}`,
      );

      const mappingStatus = result.status || 'unknown';
      controller.setMappingStatus(entry.epcRaw, mappingStatus);
      setLookupByEpc(previous => ({
        ...previous,
        [entry.epcKey]: result,
      }));
      setLookupError(null);

      const scanSessionId = snapshot.activeSessionId || 'rfid-home-idle';
      const loggedScanKeys =
        scanLogKeysBySession.get(scanSessionId) || new Set<string>();

      if (!loggedScanKeys.has(entry.epcKey)) {
        loggedScanKeys.add(entry.epcKey);
        scanLogKeysBySession.set(scanSessionId, loggedScanKeys);
        void writeScanLog(entry, mappingStatus);
      }
    } catch (error) {
      setLookupError(error instanceof Error ? error.message : 'RFID lookup failed.');
      controller.setMappingStatus(entry.epcRaw, 'unknown');
    }
  };

  const writeScanLog = async (
    entry: RFIDStreamEntry,
    mappingStatus: RFIDMappingStatus,
  ) => {
    try {
      await apiRequest('/api/rfid/scan-log', {
        method: 'POST',
        body: {
          epcRaw: entry.epcRaw,
          source: 'deviceApi',
          screen: 'RFIDHomeScreen',
          mappingStatus,
          duplicateSuppressed: entry.duplicateSuppressedCount > 0,
        },
      });
    } catch (error) {
      console.log('RFID scan log write failed', error);
    }
  };

  const handleStartScan = async () => {
    try {
      if (snapshot.lifecycle === 'idle') {
        controller.clear();
        requestedLookupKeysRef.current.clear();
        setLookupByEpc({});
        setLookupError(null);
      }

      await controller.startScan(ownerId);
    } catch (error) {
      Alert.alert(
        'RFID Start Failed',
        error instanceof Error ? error.message : 'Unable to start RFID scanning.',
      );
    }
  };

  const handleStopScan = async () => {
    const stoppedSessionId = snapshot.activeSessionId;

    try {
      await controller.stopScan(ownerId);
      if (stoppedSessionId) {
        scanLogKeysBySession.delete(stoppedSessionId);
      }
    } catch (error) {
      Alert.alert(
        'RFID Stop Failed',
        error instanceof Error ? error.message : 'Unable to stop RFID scanning.',
      );
    }
  };

  const handleAssign = async () => {
    if (!selectedEntry) {
      return;
    }

    if (!assetId.trim()) {
      Alert.alert('Missing Asset', 'Enter the asset ID to assign this RFID tag.');
      return;
    }

    setIsAssigning(true);

    try {
      await apiRequest('/api/rfid/assign', {
        method: 'POST',
        body: {
          epcRaw: selectedEntry.epcRaw,
          assetId: assetId.trim(),
          reason: 'rfid_home_assignment',
        },
      });

      requestedLookupKeysRef.current.delete(selectedEntry.epcKey);
      await lookupEpc(selectedEntry);
      controller.setMappingStatus(selectedEntry.epcRaw, 'assigned');
      setAssetId('');
      setSelectedEntry(null);
    } catch (error) {
      Alert.alert(
        'Assignment Failed',
        error instanceof Error ? error.message : 'Unable to assign RFID tag.',
      );
    } finally {
      setIsAssigning(false);
    }
  };

  const handleActionCardPress = (card: typeof actionCards[number]) => {
    if ('placeholder' in card && card.placeholder) {
      navigation.navigate('RfidSearchAsset');
      return;
    }

    if ('route' in card && card.route) {
      navigation.navigate(card.route);
    }
  };

  const handleDrawerItemPress = (label: string) => {
    setIsDrawerVisible(false);

    if (label === 'Overview') {
      return;
    }

    if (label === 'Production') {
      return navigation.navigate('HealthyAssetsScreen');
    }

    if (label === 'To Repair') {
      return navigation.navigate('RepairableAssetsScreen');
    }

    if (label === 'Written Off') {
      return navigation.navigate('BeyondRepairAssetsScreen');
    }

    if (label === 'Locate Asset' || label === 'Location') {
      return navigation.navigate('RfidLocateAsset');
    }

    if (label === 'Search Asset') {
      return navigation.navigate('SearchAssetScreen');
    }

    if (label === 'View All Assets') {
      return navigation.navigate('AllAssetsScreen');
    }

    if (label === 'All Sections' || label === 'Sections') {
      return navigation.navigate('SectionsScreen');
    }

    if (label === 'Assets Rotation') {
      return navigation.navigate('AssetsRotationScreen');
    }

    if (label === 'My Profile') {
      setIsProfileVisible(true);
      return;
    }

    Alert.alert('RFID Dashboard', `${label} is a navigation placeholder.`);
  };


























  const renderActionCard = (card: typeof actionCards[number]) => (
    <Pressable
      key={card.title}
      style={({ pressed }) => [
        styles.actionCard,
        card.wide && styles.actionCardWide,
        pressed && styles.pressedCard,
      ]}
      android_ripple={{ color: '#dbeafe' }}
      onPress={() => handleActionCardPress(card)}
    >
      <View
  style={[
    styles.actionIconWrap,
    { backgroundColor: card.iconBg },
  ]}
>
  <Ionicons
    name={card.icon as any}
    size={30}
    
  />
</View>
      <View style={styles.actionCardText}>
        <Text style={styles.actionTitle}>{card.title}</Text>
        <Text style={styles.actionSubtitle}>{card.subtitle}</Text>
      </View>
      
    </Pressable>
  );

  const renderEntry = (entry: RFIDStreamEntry) => {
    const lookup = lookupByEpc[entry.epcKey];
    const asset = lookup?.asset;
    const displayName = asset?.assetName || asset?.name || 'No mapped asset';

    return (
      <TouchableOpacity
        key={entry.epcKey}
        style={styles.tagRow}
        onPress={() => setSelectedEntry(entry)}
        activeOpacity={0.85}
      >
        <View style={styles.tagIconWrap}>
          <Ionicons name="radio-outline" size={18} color="#0f766e" />
        </View>

        <View style={styles.tagBody}>
          <Text style={styles.epcValue} numberOfLines={1}>{entry.epcRaw}</Text>
          <Text style={styles.assetText} numberOfLines={1}>
            {displayName}
          </Text>
          <Text style={styles.metaText}>
            Reads {entry.readCount} | Last {new Date(entry.lastSeenAt).toLocaleTimeString()}
          </Text>
        </View>

        <View
          style={[
            styles.statusPill,
            { backgroundColor: statusBackground(entry.mappingStatus) },
          ]}
        >
          <Text
            style={[
              styles.statusPillText,
              { color: statusColor(entry.mappingStatus) },
            ]}
          >
            {entry.mappingStatus}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#ffffff" />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.avatarButton}
          onPress={() => setIsProfileVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </TouchableOpacity>

        <View style={styles.topBarTitleWrap}>
          <Text style={styles.screenTitle}>Amrod digital asset</Text>
          <Text style={styles.screenSubtitle}>Management System</Text>
        </View>

        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setIsDrawerVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="menu-outline" size={28} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
       

        <View style={styles.summaryGrid}>
          {summaryCards.map(card => (
            <TouchableOpacity
              key={card.label}
              style={[styles.summaryCard, { backgroundColor: card.bg, borderColor: card.color }]}
              onPress={() => {
                // Navigate to dedicated ERP screens per card status
                if (card.label === 'Healthy') return navigation.navigate('HealthyAssetsScreen');
                if (card.label === 'Repairable') return navigation.navigate('RepairableAssetsScreen');
                if (card.label === 'Beyond Repair') return navigation.navigate('BeyondRepairAssetsScreen');
                return navigation.navigate('RfidSearchAsset');
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.summaryValue, { color: card.color }]}>{card.value}</Text>
              <Text style={styles.summaryLabel}>{card.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actionSection}>
         
          <View style={styles.actionGrid}>
            {actionCards.map(renderActionCard)}
          </View>
        </View>

        
      </ScrollView>

      <Modal
        visible={isProfileVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsProfileVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsProfileVisible(false)}>
          <Pressable style={styles.profileCard} onPress={() => {}}>
            <View style={styles.profileHeader}>
              <View style={styles.profileAvatar}>
                <Text style={styles.profileAvatarText}>{initials}</Text>
              </View>
              <View style={styles.profileHeaderCopy}>
                <Text style={styles.profileName}>{technician.username}</Text>
                <Text style={styles.profileRole}>{technician.role}</Text>
              </View>
            </View>
          
            <View style={styles.profileDetailRow}>
              <Ionicons name="business-outline" size={18} color={PRIMARY_BLUE} />
              <Text style={styles.profileDetailText}>{technician.department}</Text>
            </View>
            <View style={styles.profileDetailRow}>
              <Ionicons name="shield-checkmark-outline" size={18} color={PRIMARY_BLUE} />
              <Text style={styles.profileDetailText}>{technician.role}</Text>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={isDrawerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDrawerVisible(false)}
      >
        <Pressable style={styles.drawerBackdrop} onPress={() => setIsDrawerVisible(false)}>
          <Animated.View
            style={[
              styles.drawerPanel,
              { transform: [{ translateX: drawerTranslateX }] },
            ]}
          >
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>RFID Menu</Text>
              <TouchableOpacity
                style={styles.drawerCloseButton}
                onPress={() => setIsDrawerVisible(false)}
                activeOpacity={0.85}
              >
                <Ionicons name="close-outline" size={24} color="#0f172a" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.drawerScroll}
              contentContainerStyle={styles.drawerScrollContent}
              showsVerticalScrollIndicator={false}
            >
            {[
              // ERP sidebar navigation items for dedicated asset status screens
              { label: 'All Sections', icon: 'business-outline' },
              { label: 'Assets Rotation', icon: 'rotate-outline' },
              { label: 'Production', icon: 'archive-outline' },
              { label: 'To Repair', icon: 'construct-outline' },
              { label: 'Written Off', icon: 'close-circle-outline' },
              { label: 'Locate Asset', icon: 'locate-outline' },
              { label: 'Search Asset', icon: 'search-outline' },
              { label: 'View All Assets', icon: 'server-outline' },
              { label: 'My Profile', icon: 'person-circle-outline' },
            ].map(item => (
              <TouchableOpacity
                key={item.label}
                style={styles.drawerItem}
                onPress={() => {
                  if (item.label === 'My Profile') {
                    setIsDrawerVisible(false);
                    setIsProfileVisible(true);
                    return;
                  }
                  handleDrawerItemPress(item.label);
                }}
                activeOpacity={0.85}
              >
                <View style={styles.drawerItemRow}>
                  <Ionicons name={item.icon as any} size={18} color={PRIMARY_BLUE} />
                  <Text style={[styles.drawerItemText, { marginLeft: 10 }]}>{item.label}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#64748b" />
              </TouchableOpacity>
            ))}
            </ScrollView>
          </Animated.View>
        </Pressable>
      </Modal>

      <Modal
        visible={Boolean(selectedEntry)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEntry(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSelectedEntry(null)}>
          <Pressable style={styles.assignmentCard} onPress={() => {}}>
            <Text style={styles.assignmentTitle}>Assign RFID Tag</Text>
            <Text style={styles.assignmentEpc} numberOfLines={2}>
              {selectedEntry?.epcRaw}
            </Text>

            <Text style={styles.inputLabel}>Asset ID</Text>
            <TextInput
              style={styles.assetInput}
              value={assetId}
              onChangeText={setAssetId}
              placeholder="Enter target asset ID"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <View style={styles.assignmentActions}>
              <TouchableOpacity
                style={styles.secondaryAction}
                onPress={() => setSelectedEntry(null)}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryActionText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryAction, isAssigning && styles.disabledButton]}
                onPress={handleAssign}
                disabled={isAssigning}
                activeOpacity={0.85}
              >
                {isAssigning ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.primaryActionText}>Assign</Text>
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
    backgroundColor: '#eef2f7',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#34bcec',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 18,
    marginTop:25,
  },
  avatarButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  topBarTitleWrap: {
    flex: 1,
    marginLeft: 14,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#bfdbfe',
    marginTop: 2,
  },
  menuButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
  },
  heroPanel: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
    elevation: 5,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    color: '#93c5fd',
    textTransform: 'uppercase',
  },
  heroTitle: {
    maxWidth: 230,
    marginTop: 6,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroDescription: {
    maxWidth: 250,
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    color: '#dbeafe',
  },
  summaryGrid: {
    flexDirection: 'row',
    marginBottom: 16,
    marginHorizontal: -4,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowColor: '#0f172a',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  actionSection: {
    marginBottom: 16,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginTop: 10,
  },
  actionCard: {
    width: '48%',
    minHeight: 126,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginHorizontal: '1%',
    transform: [{ scale: 1 }],
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  actionCardWide: {
    width: '100%',
    minHeight: 86,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressedCard: {
    opacity: 0.82,
    transform: [{ scale: 0.99 }],
  },
  actionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionCardText: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  actionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: '#64748b',
  },
  livePanel: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dbe3ee',
    shadowColor: '#0f172a',
    shadowOpacity: 0.09,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1d4ed8',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  lifecyclePill: {
    marginTop: 2,
    borderRadius: 14,
    backgroundColor: '#334155',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lifecyclePillActive: {
    backgroundColor: '#dcfce7',
  },
  lifecycleDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#94a3b8',
    marginRight: 7,
  },
  lifecycleDotActive: {
    backgroundColor: '#16a34a',
  },
  lifecycleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#cbd5e1',
    textTransform: 'uppercase',
  },
  lifecycleTextActive: {
    color: '#166534',
  },
  scanButtonRow: {
    flexDirection: 'row',
  },
  scanControlButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#1d4ed8',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  stopControlButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#b91c1c',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.45,
  },
  lastEpcCard: {
    minHeight: 82,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  lastEpcIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lastEpcCopy: {
    flex: 1,
  },
  lastEpcLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  lastEpcText: {
    marginTop: 4,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  errorText: {
    marginTop: 10,
    fontSize: 12,
    color: '#b91c1c',
  },
  streamToolbar: {
    marginTop: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streamCount: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  clearButton: {
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  clearButtonText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  emptyState: {
    alignItems: 'center',
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 24,
  },
  emptyStateTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  emptyStateText: {
    marginTop: 4,
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  tagRow: {
    minHeight: 78,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 10,
  },
  tagIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#ccfbf1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  tagBody: {
    flex: 1,
    marginRight: 10,
  },
  epcValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  assetText: {
    marginTop: 3,
    fontSize: 13,
    color: '#334155',
  },
  metaText: {
    marginTop: 3,
    fontSize: 11,
    color: '#64748b',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  profileAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#1d4ed8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  profileAvatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  profileHeaderCopy: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  profileRole: {
    marginTop: 3,
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  profileDetailRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  profileDetailText: {
    marginLeft: 10,
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    alignItems: 'flex-end',
  },
  drawerPanel: {
    width: 300,
    maxWidth: '84%',
    height: '100%',
    backgroundColor: '#ffffff',
    paddingTop: 44,
    paddingHorizontal: 18,
    paddingBottom: 16,
    shadowColor: '#0f172a',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: -6, height: 0 },
    elevation: 8,
  },
  drawerScroll: {
    flex: 1,
  },
  drawerScrollContent: {
    paddingBottom: 24,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  drawerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
  },
  drawerCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drawerItem: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  drawerItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  drawerItemText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
  },
  assignmentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
  },
  assignmentTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
  },
  assignmentEpc: {
    marginTop: 8,
    marginBottom: 16,
    fontSize: 13,
    lineHeight: 19,
    color: '#334155',
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  assetInput: {
    height: 50,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#0f172a',
  },
  assignmentActions: {
    flexDirection: 'row',
    marginTop: 18,
  },
  secondaryAction: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  primaryAction: {
    flex: 1,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#0f766e',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  secondaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  primaryActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
