import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  Modal, 
  Pressable, 
  TextInput, 
  SafeAreaView,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen({ navigation, route }: any) {
  // State management
  const [sessionActive, setSessionActive] = useState(false);
  const [screensScanned, setScreensScanned] = useState(0);
  const [reparable, setReparable] = useState(0);
  const [beyondRepair, setBeyondRepair] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualInputVisible, setManualInputVisible] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [operations, setOperations] = useState<any[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const [elapsedMilliseconds, setElapsedMilliseconds] = useState(0);
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = route.params?.token;
  // User data and API configuration
  const user = route.params?.user || {
    name: 'Unknown',
    surname: 'User',
    department: 'Unknown Department',
    task: 'Unknown Task',
    avatar: '👨‍🔧'
  };
  const API_BASE_URL = 'https://scanning-backend-server-p3re.vercel.app';
  // Fetch operations when screen is focused
 const saveScanToBackend = async (scanData: any, operationType = 'SCAN') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token,
      },
      body: JSON.stringify({
        scannedData: scanData,
        operationType,
        timestamp: new Date().toISOString(),
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'Failed to save scan');
    }

    console.log('✅ Scan saved to backend');
  } catch (err) {
    console.error('❌ Error saving scan:', err);
  }
};
  // Helper Functions
  const generateRandomBarcode = () => {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const formatElapsedTime = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const millis = Math.floor((milliseconds % 1000) / 10); // two-digit milliseconds

  return (
    (days > 0 ? `${days}d ` : '') +
    (hours < 10 ? `0${hours}` : hours) + ':' +
    (minutes < 10 ? `0${minutes}` : minutes) + ':' +
    (seconds < 10 ? `0${seconds}` : seconds) + '.' +
    (millis < 10 ? `0${millis}` : millis)
  );
};

  // Operation Type Helpers
  const getOperationIcon = (type: string) => {
    switch(type) {
      case 'SESSION_START': return 'play-circle';
      case 'SCAN': return 'scan';
      case 'STATUS_UPDATE': return 'checkmark-circle';
      case 'SESSION_END': return 'stop-circle';
      default: return 'document-text';
    }
  };

  const getOperationColor = (type: string) => {
    switch(type) {
      case 'SESSION_START': return '#28a745';
      case 'SCAN': return '#007AFF';
      case 'STATUS_UPDATE': return '#17a2b8';
      case 'SESSION_END': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const formatOperationType = (type: string) => {
    return type.split('_').map(word => 
      word.charAt(0) + word.slice(1).toLowerCase()
    ).join(' ');
  };

  // Action Handlers
  const handleStartTask = () => {
    const now = new Date();
    setSessionActive(true);
    setScreensScanned(0);
    setReparable(0);
    setBeyondRepair(0);
    setStartTime(now);
    setEndTime(null);
    setScanning(true);
    setElapsedSeconds(0);
    
    saveScanToBackend({ startTime: now.toISOString() }, 'SESSION_START');
    
  };

  const handleScanScreen = () => {
  navigation.navigate('CameraScanner', {
    onScan: (scannedData: string) => {
      setScannedBarcode(scannedData);

      const scanTimestamp = new Date().toISOString();
      const scanOp = {
        operationType: 'SCAN',
        createdAt: scanTimestamp,
        details: { barcode: scannedData, timestamp: scanTimestamp },
      };

      setOperations(prev => [scanOp, ...prev]);

    saveScanToBackend(scanOp.details, 'SCAN');

      setStatusModalVisible(true);
    }
  });
};

  const handleManualBarcode = () => {
    if (manualBarcode.trim()) {
     saveScanToBackend({
  barcode: manualBarcode.trim(),
  timestamp: new Date().toISOString()
}, 'SCAN');

      setManualInputVisible(false);
      setManualBarcode('');
      setStatusModalVisible(true);
    } else {
      Alert.alert('Error', 'Please enter a barcode');
    }
  };
  const handleStatusSelect = (status: 'Reparable' | 'Beyond Repair') => {
    const newScreensScanned = screensScanned + 1;
    setScreensScanned(newScreensScanned);
    
    if (status === 'Reparable') {
      setReparable(reparable + 1);
    } else {
      setBeyondRepair(beyondRepair + 1);
    }
    
    saveScanToBackend({
  barcode: scannedBarcode,
  status,
  timestamp: new Date().toISOString()
}, 'STATUS_UPDATE');

    
    setStatusModalVisible(false);
    Alert.alert('Screen Scanned', `Barcode: ${scannedBarcode}\nStatus: ${status}\n\nReady for next scan.`);
  };
  const handleStopTask = () => {
    const endTime = new Date();
    setSessionActive(false);
    setEndTime(endTime);
    setScanning(false);
    setStatusModalVisible(false);
    setManualInputVisible(false);
    
   saveScanToBackend({
  endTime: endTime.toISOString(),
  screensScanned,
  reparable,
  beyondRepair,
  durationSeconds: elapsedSeconds
}, 'SESSION_END');

    Alert.alert('Session Ended', 
      `Total screens: ${screensScanned}\nReparable: ${reparable}\nBeyond Repair: ${beyondRepair}\nDuration: ${formatElapsedTime(elapsedMilliseconds)}`
    );
  };
  const handleLogout = () => {
    Alert.alert('Logout', 'You have been logged out.');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }], 
    });
  };
  // Timer Effect
  useEffect(() => {
  if (sessionActive) {
    intervalRef.current = setInterval(() => {
      setElapsedMilliseconds(prev => prev + 10); // update every 10ms
    }, 10);
  } else if (intervalRef.current) {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  }

  return () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };
}, [sessionActive]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header Section */}
        <View style={styles.header}>
          <Text style={styles.title}>Technician Dashboard</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        {/* User Profile Section */}
        <View style={styles.userBox}>
          <Text style={styles.avatar}>{user.avatar}</Text>
          <Text style={styles.userName}>{user.name} {user.surname}</Text>
          <View style={styles.userDetailRow}>
            <Ionicons name="business-outline" size={16} color="#555" />
            <Text style={styles.userDetailText}>{user.department}</Text>
          </View>
          <View style={styles.userDetailRow}>
            <Ionicons name="construct-outline" size={16} color="#555" />
            <Text style={styles.userDetailText}>{user.task}</Text>
          </View>
        </View>

        {/* Stats Dashboard */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#e3f2fd' }]}>
            <Ionicons name="scan-outline" size={24} color="#1976d2" />
            <Text style={styles.statNumber}>{screensScanned}</Text>
            <Text style={styles.statLabel}>Total Scans</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#e8f5e9' }]}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#388e3c" />
            <Text style={styles.statNumber}>{reparable}</Text>
            <Text style={styles.statLabel}>Reparable</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#ffebee' }]}>
            <Ionicons name="close-circle-outline" size={24} color="#d32f2f" />
            <Text style={styles.statNumber}>{beyondRepair}</Text>
            <Text style={styles.statLabel}>Beyond Repair</Text>
          </View>
          
          <View style={[styles.statCard, { backgroundColor: '#e0f7fa' }]}>
            <Ionicons name="time-outline" size={24} color="#0097a7" />
            <Text style={styles.statNumber}>{formatElapsedTime(elapsedMilliseconds)}</Text>

            <Text style={styles.statLabel}>Time Taken</Text>
          </View>
        </View>

        {/* Session Status Card */}
        <View style={[
          styles.sessionCard, 
          sessionActive ? styles.sessionActive : styles.sessionInactive
        ]}>
          <View style={styles.sessionHeader}>
            <Ionicons 
              name={sessionActive ? "play-circle" : "pause-circle"} 
              size={24} 
              color={sessionActive ? "#388e3c" : "#757575"} 
            />
            <Text style={styles.sessionStatus}>
              {sessionActive ? 'Session Active' : 'Session Inactive'}
            </Text>
          </View>
          
          {sessionActive && (
            <View style={styles.timerContainer}>
              <Ionicons name="time-outline" size={16} color="#0097a7" />
               <Text style={styles.statNumber}>{formatElapsedTime(elapsedMilliseconds)}</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {!sessionActive ? (
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleStartTask}
          >
            <Ionicons name="play" size={20} color="#fff" />
            <Text style={styles.buttonText}>Start New Session</Text>
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.scannerContainer}>
              <Text style={styles.sectionTitle}>Scanning Options</Text>
              
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#388e3c' }]}
                onPress={handleScanScreen}
              >
                <Ionicons name="camera-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Scan with Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#fb8c00' }]}
                onPress={() => setManualInputVisible(true)}
              >
                <Ionicons name="keypad-outline" size={20} color="#fff" />
                <Text style={styles.buttonText}>Manual Entry</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: '#d32f2f' }]}
              onPress={handleStopTask}
            >
              <Ionicons name="stop" size={20} color="#fff" />
              <Text style={styles.buttonText}>End Session</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Operations History Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          
          {operations.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="time-outline" size={32} color="#bdbdbd" />
              <Text style={styles.emptyStateText}>No operations recorded</Text>
            </View>
          ) : (
            <View style={styles.operationsList}>
              {operations.map((op, index) => (
                <View key={index} style={styles.operationItem}>
                  <View style={[
                    styles.operationIconContainer,
                    { backgroundColor: `${getOperationColor(op.operationType)}20` }
                  ]}>
                    <Ionicons 
                      name={getOperationIcon(op.operationType)} 
                      size={18} 
                      color={getOperationColor(op.operationType)} 
                    />
                  </View>
                  
                  <View style={styles.operationDetails}>
                    <Text style={styles.operationType}>
                      {formatOperationType(op.operationType)}
                    </Text>
                    <Text style={styles.operationTime}>
                      {new Date(op.createdAt).toLocaleString()}
                    </Text>
                    
                    {op.details.barcode && (
                      <Text style={styles.operationMeta}>
                        <Text style={{ fontWeight: '600' }}>Barcode:</Text> {op.details.barcode}
                      </Text>
                    )}
                    
                    {op.details.status && (
                      <Text style={[
                        styles.operationMeta,
                        op.details.status === 'Reparable' ? 
                          { color: '#388e3c' } : { color: '#d32f2f' }
                      ]}>
                        {op.details.status}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      {/* Manual Barcode Input Modal */}
      <Modal
        visible={manualInputVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setManualInputVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Barcode Manually</Text>
            
            <TextInput
              style={styles.inputField}
              placeholder="Scan or enter barcode"
              placeholderTextColor="#999"
              value={manualBarcode}
              onChangeText={setManualBarcode}
              autoFocus
              keyboardType="numeric"
              autoCapitalize="characters"
              returnKeyType="done"
            />
            <View style={styles.modalButtonRow}>
              <Pressable 
                style={[styles.modalButton, { backgroundColor: '#e0e0e0' }]} 
                onPress={() => setManualInputVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: '#424242' }]}>Cancel</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.modalButton, { backgroundColor: '#1976d2' }]} 
                onPress={handleManualBarcode}
              >
                <Text style={styles.modalButtonText}>Submit</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      {/* Status Selection Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Screen Assessment</Text>
            <Text style={styles.modalSubtitle}>Barcode: {scannedBarcode}</Text>
            
            <Text style={styles.modalPrompt}>
              Please select the appropriate status for this screen:
            </Text>
            
            <View style={styles.statusButtonContainer}>
              <Pressable 
                style={[styles.statusButton, { backgroundColor: '#388e3c' }]}
                onPress={() => handleStatusSelect('Reparable')}
              >
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
                <Text style={styles.statusButtonText}>Reparable</Text>
              </Pressable>
              
              <Pressable 
                style={[styles.statusButton, { backgroundColor: '#d32f2f' }]}
                onPress={() => handleStatusSelect('Beyond Repair')}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
                <Text style={styles.statusButtonText}>Write-Off</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
// Updated Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingVertical:40,
  },
  scrollContainer: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#212121',
  },
  userBox: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    alignItems: 'center',
  },
  avatar: {
    fontSize: 48,
    marginBottom: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  userDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userDetailText: {
    fontSize: 14,
    color: '#424242',
    marginLeft: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginVertical: 8,
    color: '#212121',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#616161',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sessionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sessionActive: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#388e3c',
  },
  sessionInactive: {
    backgroundColor: '#f5f5f5',
    borderLeftWidth: 4,
    borderLeftColor: '#bdbdbd',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionStatus: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  timerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0097a7',
    marginLeft: 8,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1976d2',
    borderRadius: 8,
    paddingVertical: 14,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    paddingVertical: 12,
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 8,
  },
  scannerContainer: {
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9e9e9e',
    marginTop: 8,
  },
  operationsList: {
    marginBottom: 20,
  },
  operationItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  operationIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  operationDetails: {
    flex: 1,
  },
  operationType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2,
  },
  operationTime: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  operationMeta: {
    fontSize: 12,
    color: '#616161',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 16,
  },
  modalPrompt: {
    fontSize: 14,
    color: '#424242',
    marginBottom: 24,
    lineHeight: 20,
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 24,
    backgroundColor: '#fafafa',
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
  statusButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 8,
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginLeft: 8,
  },
});