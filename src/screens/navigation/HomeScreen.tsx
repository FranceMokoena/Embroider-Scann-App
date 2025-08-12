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
  ScrollView,
  RefreshControl,
  Dimensions,
  StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const { width } = Dimensions.get('window');

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
  const [loadingMore, setLoadingMore] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(5);
  const [user, setUser] = useState({
    username: 'Loading...',
    department: 'Loading...',
    avatar: '👨‍🔧'
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<any>({
    sessions: [],
    totalScans: 0,
    totalReparable: 0,
    totalBeyondRepair: 0
  });
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const token = route.params?.token;
  const API_BASE_URL = 'https://embroider-scann-app.onrender.com';
const [statusModalTitle, setStatusModalTitle] = useState('');
const [statusModalMessage, setStatusModalMessage] = useState('');
const [reportsView, setReportsView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
const [reportsData, setReportsData] = useState<any>(null);
const [loadingReports, setLoadingReports] = useState(false);






















  // Fetch user profile data
  const fetchUserProfile = async () => {
    try {
      console.log('🔄 Fetching user profile...');
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const userData = await response.json();
        console.log('✅ User profile fetched:', userData);
        setUser({
          username: userData.username,
          department: userData.department,
          avatar: '👨‍🔧' // You can add avatar logic later
        });
      } else {
        console.error('❌ Failed to fetch user profile:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching user profile:', error);
    }
  };

  // Fetch scan history
  const fetchScanHistory = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching scan history...');
      const response = await fetch(`${API_BASE_URL}/api/scan/history`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const historyData = await response.json();
        console.log('✅ Scan history fetched:', historyData);
        setScanHistory(historyData);
        
        // Update the UI stats with real data
        setScreensScanned(historyData.totalScans || 0);
        setReparable(historyData.totalReparable || 0);
        setBeyondRepair(historyData.totalBeyondRepair || 0);
      } else {
        console.error('❌ Failed to fetch scan history:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching scan history:', error);
    } finally {
      setLoading(false);
    }
  };






// FUNCTION TO FETCH DATA OR SCAN FOR DAILY, WEEKLY AND MONTHLY REPORTS
const fetchReportsData = async (period: 'daily' | 'weekly' | 'monthly') => {
  try {
    setLoadingReports(true);
    console.log(`🔄 Processing ${period} reports from scan history...`);

    // First ensure we have the latest scan history
    await fetchScanHistory();

    if (!scanHistory.sessions || scanHistory.sessions.length === 0) {
      setReportsData(null);
      setReportsView(period);
      return;
    }

    // Process the data based on the selected period
    const now = new Date();
    let filteredScans: any[] = [];

    // Flatten all scans from all sessions
    const allScans = scanHistory.sessions
      .flatMap(session =>
        session.scans.map(scan => ({
          ...scan,
          date: new Date(scan.timestamp)
        }))
      )
      .filter(scan => scan.date instanceof Date && !isNaN(scan.date.getTime())) // Ensure valid dates
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Sort newest first

    // Filter based on period
    switch (period) {
      case 'daily':
        filteredScans = allScans.filter(scan => isSameDay(scan.date, now));
        break;
      case 'weekly':
        filteredScans = allScans.filter(scan => isSameWeek(scan.date, now));
        break;
      case 'monthly':
        filteredScans = allScans.filter(scan => isSameMonth(scan.date, now));
        break;
    }

    // Calculate statistics
    const totalScans = filteredScans.length;
    const reparable = filteredScans.filter(scan => scan.status === 'Reparable').length;
    const beyondRepair = filteredScans.filter(scan => scan.status === 'Beyond Repair').length;

    // Prepare report data
    const data = {
      totalScans,
      reparable,
      beyondRepair,
      scanChange: 0, // Placeholder for comparison logic
      reparableChange: 0,
      beyondRepairChange: 0,
      avgTimePerScan: 0, // Placeholder for timing data
      scans: filteredScans
    };

    console.log(`✅ ${period} reports processed:`, data);
    setReportsData(data);
    setReportsView(period);
  } catch (error) {
    console.error(`❌ Error processing ${period} reports:`, error);
    Alert.alert('Error', 'Failed to process reports data');
  } finally {
    setLoadingReports(false);
  }
};

// Helper date functions
const isSameDay = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const isSameWeek = (date1: Date, date2: Date) => {
  const oneDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.abs((date1.getTime() - date2.getTime()) / oneDay);
  return diffDays < 7 && date1.getMonth() === date2.getMonth();
};

const isSameMonth = (date1: Date, date2: Date) => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth()
  );
};

































  // Load more scans
  const loadMoreScans = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setDisplayLimit(prev => prev + 5);
      setLoadingMore(false);
    }, 500);
  };

  // Start a new session
  const startSession = async () => {
    try {
      console.log('🔄 Starting new session...');
      const response = await fetch(`${API_BASE_URL}/api/sessions/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const sessionData = await response.json();
        console.log('✅ Session started:', sessionData);
        setCurrentSessionId(sessionData.sessionId);
        return sessionData.sessionId;
      } else {
        console.error('❌ Failed to start session:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Error starting session:', error);
      return null;
    }
  };

  // Stop current session
  const stopSession = async () => {
    if (!currentSessionId) return;
    
    try {
      console.log('🔄 Stopping session...');
      const response = await fetch(`${API_BASE_URL}/api/sessions/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: currentSessionId
        }),
      });

      if (response.ok) {
        const sessionData = await response.json();
        console.log('✅ Session stopped:', sessionData);
        setCurrentSessionId(null);
        // Refresh scan history after stopping session
        fetchScanHistory();
        return sessionData;
      } else {
        console.error('❌ Failed to stop session:', response.status);
        return null;
      }
    } catch (error) {
      console.error('❌ Error stopping session:', error);
      return null;
    }
  };

  // Save scan to backend with proper structure
  const saveScanToBackend = async (barcode: string, status: string) => {
    if (!currentSessionId) {
      console.error('❌ No active session to save scan');
      return false;
    }

    try {
      console.log('🔄 Saving scan to backend:', { barcode, status, sessionId: currentSessionId });
      const response = await fetch(`${API_BASE_URL}/api/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          barcode,
          status,
          sessionId: currentSessionId,
        }),
      });
      
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save scan');
      }

      console.log('✅ Scan saved to backend:', result);
      return true;
    } catch (err) {
      console.error('❌ Error saving scan:', err);
      return false;
    }
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

  const formatDateTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return `Today at ${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else if (diffInHours < 48) {
      return `Yesterday at ${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      }) + ` at ${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      })}`;
    }
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

  // Report Generation Functions
  const generateReportHTML = () => {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });

    let sessionsHTML = '';
    if (scanHistory.sessions && scanHistory.sessions.length > 0) {
      sessionsHTML = scanHistory.sessions.map(session => {
        const sessionDate = new Date(session.startTime).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
        const sessionTime = new Date(session.startTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        
        let scansHTML = '';
        if (session.scans && session.scans.length > 0) {
          scansHTML = session.scans.map(scan => `
            <tr>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${scan.barcode}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${scan.status}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${new Date(scan.timestamp).toLocaleDateString('en-US')}</td>
              <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${new Date(scan.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
            </tr>
          `).join('');
        }

        return `
          <div style="margin-bottom: 20px;">
            <h3 style="color: #333; border-bottom: 2px solid #6366f1; padding-bottom: 5px;">Session: ${sessionDate} at ${sessionTime}</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead>
                <tr style="background-color: #f8f9fa;">
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Barcode</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Status</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Date</th>
                  <th style="border: 1px solid #ddd; padding: 8px; text-align: center;">Time</th>
                </tr>
              </thead>
              <tbody>
                ${scansHTML}
              </tbody>
            </table>
          </div>
        `;
      }).join('');
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Scan Report - ${user.username}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #6366f1; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #6366f1; margin-bottom: 10px; }
          .subtitle { color: #666; font-size: 16px; }
          .summary { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 15px; }
          .summary-item { text-align: center; }
          .summary-number { font-size: 24px; font-weight: bold; color: #6366f1; }
          .summary-label { color: #666; margin-top: 5px; }
          .sessions-section { margin-top: 30px; }
          .no-data { text-align: center; color: #999; font-style: italic; padding: 40px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
          th { background-color: #f8f9fa; font-weight: bold; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Technicial Report</div>
          <div class="subtitle">Embroidery-Tech Professional Screen Management System</div>
        </div>
        
        <div class="summary">
          <h2 style="color: #333; margin-bottom: 15px;">Report Summary</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-number">${user.username}</div>
              <div class="summary-label">Technician</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${user.department}</div>
              <div class="summary-label">Department</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${scanHistory.totalScans || 0}</div>
              <div class="summary-label">Total Scans</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${scanHistory.totalReparable || 0}</div>
              <div class="summary-label">Reparable</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${scanHistory.totalBeyondRepair || 0}</div>
              <div class="summary-label">Beyond Repair</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${currentDate}</div>
              <div class="summary-label">Report Date</div>
            </div>
          </div>
        </div>
        
        <div class="sessions-section">
          <h2 style="color: #333; margin-bottom: 20px;">Detailed Scan History</h2>
          ${sessionsHTML || '<div class="no-data">No scan data available</div>'}
        </div>
        
        <div class="footer">
          <p>Report generated on ${currentDate} at ${currentTime}</p>
          <p>Embroidery-Tech Professional Screen Management System</p>
        </div>
      </body>
      </html>
    `;
  };

  const generatePDFReport = async () => {
    try {
      setIsGeneratingReport(true);
      
      const htmlContent = generateReportHTML();
      const options = {
        html: htmlContent,
        base64: false
      };

      const file = await Print.printToFileAsync(options);
      
      if (file.uri) {
        console.log('✅ PDF generated successfully:', file.uri);
        return file.uri;
      } else {
        throw new Error('Failed to generate PDF');
      }
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF report. Please try again.');
      return null;
    } finally {
      setIsGeneratingReport(false);
    }
  };



  const sendReportViaEmail = async (pdfPath: string, email: string) => {
    try {
      setIsSendingEmail(true);
      
      // For Expo, we'll use the Sharing API to open email apps
      await Sharing.shareAsync(pdfPath, {
        mimeType: 'application/pdf',
        dialogTitle: `TechScan Report - ${user.username} - ${new Date().toLocaleDateString()}`,
        UTI: 'com.adobe.pdf'
      });
      
     setReportModalVisible(true);  // Show modal instead of alert
      
    } catch (error) {
      console.error('❌ Error sharing report:', error);
      Alert.alert('Error', 'Failed to share report. Please try again.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleGenerateReport = async () => {
    // Email validation is now optional since we're sharing the report
    if (adminEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    const pdfPath = await generatePDFReport();
    if (pdfPath) {
      await sendReportViaEmail(pdfPath, adminEmail.trim());
    }
  };

  // Action Handlers
  const handleStartTask = async () => {
    const sessionId = await startSession();
    if (sessionId) {
      const now = new Date();
      setSessionActive(true);
      setScreensScanned(0);
      setReparable(0);
      setBeyondRepair(0);
      setStartTime(now);
      setEndTime(null);
      setScanning(true);
      setElapsedSeconds(0);
      setElapsedMilliseconds(0);
      
      console.log('✅ Task session started successfully');
    } else {
      Alert.alert('Error', 'Failed to start task session. Please try again.');
    }
  };

  const handleScanScreen = () => {
    if (!currentSessionId) {
      Alert.alert('Error', 'Please start a task session first');
      return;
    }
    //THIS IS FOR HANDLING THE SCREEN STATUS!!!!!!!!!!!!!!!!!!!!!!!!!
    navigation.navigate('CameraScanner', {
      onScan: (scannedData: string) => {
        setScannedBarcode(scannedData);
        setStatusModalVisible(true);
      }
    });
  };

  const handleManualBarcode = () => {
    if (!currentSessionId) {
      Alert.alert('Error', 'Please start a task session first');
      return;
    }
    
    if (manualBarcode.trim()) {
      setScannedBarcode(manualBarcode.trim());
      setManualInputVisible(false);
      setManualBarcode('');
      setStatusModalVisible(true);
    } else {
      Alert.alert('Error', 'Please enter a barcode');
    }
  };



// --- state (you already have these) ---
const [savingStatus, setSavingStatus] = useState<null | 'Reparable' | 'Beyond Repair'>(null);
const [savedStatus, setSavedStatus] = useState<null | 'Reparable' | 'Beyond Repair'>(null);

// --- updated handler ---
const handleStatusSelect = async (status: 'Reparable' | 'Beyond Repair') => {
  if (!scannedBarcode) return;

  setSavingStatus(status); // show spinner
  setSavedStatus(null);

  try {
    const success = await saveScanToBackend(scannedBarcode, status);

    if (!success) throw new Error('Save failed');

    // update counters
    setScreensScanned(prev => prev + 1);
    if (status === 'Reparable') setReparable(prev => prev + 1);
    else setBeyondRepair(prev => prev + 1);

    await fetchScanHistory();

    // show tick
    setSavingStatus(null);
    setSavedStatus(status);

    // after short delay: close modal, reset state, open camera
    setTimeout(() => {
      setStatusModalVisible(false);
      setSavedStatus(null);
      setSavingStatus(null);
      setScannedBarcode(null);

      // navigate straight to camera for next scan
      navigation.navigate('CameraScanner', {
        onScan: (scannedData: string) => {
          setScannedBarcode(scannedData);
          setStatusModalVisible(true);
        }
      });
    }, 900);
  } catch (err) {
    setSavingStatus(null);
    setSavedStatus(null);
    Toast.show({
      type: 'error',
      text1: 'Save Failed',
      text2: 'Failed to save scan. Please try again.'
    });
  }
};



  const handleStopTask = async () => {
    const sessionData = await stopSession();
    if (sessionData) {
      const endTime = new Date();
      setSessionActive(false);
      setEndTime(endTime);
      setScanning(false);
      setStatusModalVisible(false);
      setManualInputVisible(false);
      
      Alert.alert('Session Ended', 
        `Total screens: ${screensScanned}\nReparable: ${reparable}\nBeyond Repair: ${beyondRepair}\nDuration: ${formatElapsedTime(elapsedMilliseconds)}`
      );
    } else {
      Alert.alert('Error', 'Failed to stop session. Please try again.');
    }
  };

  const handleLogout = () => {
   
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }], 
    });
  };

  // Fetch user profile and scan history on component mount
  useEffect(() => {
    if (token) {
      fetchUserProfile();
      fetchScanHistory();
    }
  }, [token]);

  // Refresh scan history when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (token) {
        fetchScanHistory();
      }
    }, [token])
  );

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
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={fetchScanHistory}
            colors={['#6366f1']}
            tintColor="#6366f1"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Professional Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Ionicons name="scan-circle" size={32} color="#6366f1" />
              <Text style={styles.logoText}>Embroidery-Tech</Text>
            </View>
            <Text style={styles.subtitle}>The Professional Screen Management</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Enhanced User Profile Card */}
        <View style={styles.userCard}>
          <View style={styles.userHeader}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatar}>{user.avatar}</Text>
              <View style={styles.statusIndicator} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user.username}</Text>
              <Text style={styles.userRole}>Technician</Text>
              <View style={styles.userMeta}>
                <View style={styles.userMetaItem}>
                  <Ionicons name="business-outline" size={16} color="#64748b" />
                  <Text style={styles.userMetaText}>{user.department}</Text>
                </View>
                <View style={styles.userMetaItem}>
                  <Ionicons name="shield-checkmark-outline" size={16} color="blue" />
                  <Text style={styles.userMetaText}>Verified</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Modern Stats Dashboard */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.primaryStat]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="scan-outline" size={28} color="#6366f1" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{screensScanned}</Text>
              <Text style={styles.statLabel}>Total Scans</Text>
              <Text style={styles.statTrend}>+12% this week</Text>
            </View>
          </View>
          
          <View style={[styles.statCard, styles.successStat]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="checkmark-circle-outline" size={28} color="#10b981" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{reparable}</Text>
              <Text style={styles.statLabel}>Reparable</Text>
              <Text style={styles.statTrend}>+8% this week</Text>
            </View>
          </View>
          
          <View style={[styles.statCard, styles.dangerStat]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="close-circle-outline" size={28} color="#ef4444" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{beyondRepair}</Text>
              <Text style={styles.statLabel}>Beyond Repair</Text>
              <Text style={styles.statTrend}>-3% this week</Text>
            </View>
          </View>
          
          <View style={[styles.statCard, styles.infoStat]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="time-outline" size={28} color="#06b6d4" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statNumber}>{formatElapsedTime(elapsedMilliseconds)}</Text>
              <Text style={styles.statLabel}>Session Time</Text>
              <Text style={styles.statTrend}>Active</Text>
            </View>
          </View>
        </View>
{/* Professional Action Buttons */}
        {!sessionActive ? (
          <TouchableOpacity 
            style={styles.primaryActionButton}
            onPress={handleStartTask}
          >
            <View style={styles.buttonContent}>
              <Ionicons name="play" size={24} color="#fff" />
              <Text style={styles.buttonText}>Start New Session</Text>
            </View>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.scannerSection}>
              <Text style={styles.sectionTitle}>Scanning Operations</Text>
              <Text style={styles.sectionSubtitle}>Choose your preferred scanning method</Text>
              
              <View style={styles.scannerButtons}>
                <TouchableOpacity 
                  style={[styles.scannerButton, styles.cameraButton]}
                  onPress={handleScanScreen}
                >
                  <View style={styles.scannerButtonIcon}>
                    <Ionicons name="camera-outline" size={28} color="#fff" />
                  </View>
                  <Text style={styles.scannerButtonText}>Camera Scan</Text>
                  <Text style={styles.scannerButtonSubtext}>Use device camera</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.scannerButton, styles.manualButton]}
                  onPress={() => setManualInputVisible(true)}
                >
                  <View style={styles.scannerButtonIcon}>
                    <Ionicons name="keypad-outline" size={28} color="#fff" />
                  </View>
                  <Text style={styles.scannerButtonText}>Manual Entry</Text>
                  <Text style={styles.scannerButtonSubtext}>Type barcode manually</Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.stopSessionButton}
              onPress={handleStopTask}
            >
              <View style={styles.buttonContent}>
                <Ionicons name="stop" size={24} color="#fff" />
                <Text style={styles.buttonText}>End Session</Text>
              </View>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            </TouchableOpacity>
          </>
        )}













































{/*MODAL FOR SELECTING A SCREEN STATUS*/}



        {/* Enhanced Session Status */}
        <View style={[
          styles.sessionCard, 
          sessionActive ? styles.sessionActive : styles.sessionInactive
        ]}>
          <View style={styles.sessionHeader}>
            <View style={styles.sessionIconContainer}>
              <Ionicons 
                name={sessionActive ? "play-circle" : "pause-circle"} 
                size={28} 
                color={sessionActive ? "#10b981" : "#64748b"} 
              />
            </View>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionStatus}>
                {sessionActive ? 'Session Active' : 'Session Inactive'}
              </Text>
              <Text style={styles.sessionSubtitle}>
                {sessionActive ? 'Scanning in progress...' : 'Ready to start new session'}
              </Text>
            </View>
            <View style={styles.sessionTimer}>
              {sessionActive && (
                <Text style={styles.timerText}>{formatElapsedTime(elapsedMilliseconds)}</Text>
              )}
            </View>
          </View>
        </View>

        

        {/* Report Generation Button */}
        <View style={styles.reportSection}>
          <TouchableOpacity 
            style={styles.reportButton}
            onPress={() => setReportModalVisible(true)}
          >
            <View style={styles.reportButtonIcon}>
              <Ionicons name="document-text-outline" size={28} color="#fff" />
            </View>
            <View style={styles.reportButtonContent}>
              <Text style={styles.reportButtonText}>Generate Report</Text>
              <Text style={styles.reportButtonSubtext}>Create PDF report and share  </Text>
            </View>
             <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>


{/*THESE ARE ALL MODALS!!!!!!!!!!!!!!*/}

        {/* MODAL FOR SENDING REPORT  */}
        <Modal
  visible={reportModalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setReportModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.reportModalContent}>
      <Text style={styles.reportModalEmoji}>📤</Text>
      <Text style={styles.reportModalTitle}>Report Shared</Text>
      <Text style={styles.reportModalMessage}>
        The report has been shared successfully. Please check your sharing options to send it to the admin.
      </Text>
      <TouchableOpacity
        style={styles.modalButton}
        onPress={() => setReportModalVisible(false)}
      >
        <Text style={styles.modalButtonText}>OK</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>



































{/* Reports Analysis Section */}
<View style={styles.reportsSection}>
  <Text style={styles.sectionTitle}>Reports Analysis</Text>
  <Text style={styles.sectionSubtitle}>View analyzed scan statistics</Text>
  
  <View style={styles.reportsToggle}>
    <TouchableOpacity 
      style={[
        styles.reportToggleButton, 
        reportsView === 'daily' && styles.activeToggleButton
      ]}
      onPress={() => fetchReportsData('daily')}
    >
      <Text style={[
        styles.reportToggleText,
        reportsView === 'daily' && styles.activeToggleText
      ]}>Daily</Text>
    </TouchableOpacity>
    
    <TouchableOpacity 
      style={[
        styles.reportToggleButton, 
        reportsView === 'weekly' && styles.activeToggleButton
      ]}
      onPress={() => fetchReportsData('weekly')}
    >
      <Text style={[
        styles.reportToggleText,
        reportsView === 'weekly' && styles.activeToggleText
      ]}>Weekly</Text>
    </TouchableOpacity>
    
    <TouchableOpacity 
      style={[
        styles.reportToggleButton, 
        reportsView === 'monthly' && styles.activeToggleButton
      ]}
      onPress={() => fetchReportsData('monthly')}
    >
      <Text style={[
        styles.reportToggleText,
        reportsView === 'monthly' && styles.activeToggleText
      ]}>Monthly</Text>
    </TouchableOpacity>
  </View>
  
  {loadingReports ? (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#6366f1" />
    </View>
  ) : reportsData ? (
    <View>
      <View style={styles.reportsStatsContainer}>
        <View style={styles.reportStatCard}>
          <Text style={styles.reportStatNumber}>{reportsData.totalScans || 0}</Text>
          <Text style={styles.reportStatLabel}>Total Scans</Text>
        </View>
        
        <View style={styles.reportStatCard}>
          <Text style={styles.reportStatNumber}>{reportsData.reparable || 0}</Text>
          <Text style={styles.reportStatLabel}>Reparable</Text>
        </View>
        
        <View style={styles.reportStatCard}>
          <Text style={styles.reportStatNumber}>{reportsData.beyondRepair || 0}</Text>
          <Text style={styles.reportStatLabel}>Beyond Repair</Text>
        </View>
      </View>
      
      {/* Show filtered scans */}
      <Text style={styles.scanListTitle}>
        {reportsView.charAt(0).toUpperCase() + reportsView.slice(1)} Scans
      </Text>
      
      {reportsData.scans.length > 0 ? (
        <View style={styles.scanListContainer}>
          {reportsData.scans.map((scan, index) => (
            <View key={index} style={styles.scanListItem}>
              <View style={[
                styles.scanStatusIndicator,
                { backgroundColor: scan.status === 'Reparable' ? '#dcfce7' : '#fee2e2' }
              ]}>
                <Ionicons 
                  name={scan.status === 'Reparable' ? 'checkmark-circle' : 'close-circle'} 
                  size={20} 
                  color={scan.status === 'Reparable' ? '#16a34a' : '#dc2626'} 
                />
              </View>
              
              <View style={styles.scanDetails}>
                <Text style={styles.scanBarcode}>{scan.barcode}</Text>
                <Text style={styles.scanTime}>
                  {scan.date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
              
              <View style={[
                styles.scanStatusBadge,
                { backgroundColor: scan.status === 'Reparable' ? '#dcfce7' : '#fee2e2' }
              ]}>
                <Text style={[
                  styles.scanStatusText,
                  { color: scan.status === 'Reparable' ? '#16a34a' : '#dc2626' }
                ]}>
                  {scan.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyScans}>
          <Ionicons name="document-text-outline" size={32} color="#cbd5e1" />
          <Text style={styles.emptyScansText}>No scans found for this period</Text>
        </View>
      )}
    </View>
  ) : (
    <View style={styles.emptyReports}>
      <Ionicons name="stats-chart-outline" size={48} color="#cbd5e1" />
      <Text style={styles.emptyReportsText}>Select a period to view reports</Text>
    </View>
  )}
</View>
















        {/* Enhanced Scan History Section */}
        <View style={styles.historySection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="time-outline" size={24} color="#6366f1" />
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#6366f1" />
            </TouchableOpacity>
          </View>
          
          {scanHistory.sessions.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="time-outline" size={48} color="#cbd5e1" />
              </View>
              <Text style={styles.emptyStateTitle}>No Activity Yet</Text>
              <Text style={styles.emptyStateText}>Start scanning to see your activity history</Text>
            </View>
          ) : (
            <>
              <View style={styles.scanHistoryList}>
                {scanHistory.sessions.slice(0, displayLimit).flatMap(session => 
                  session.scans.map((scan, index) => (
                    <View key={`${session.id}-${index}`} style={styles.scanHistoryItem}>
                      <View style={[
                        styles.scanStatusIndicator,
                        { backgroundColor: scan.status === 'Reparable' ? '#dcfce7' : '#fee2e2' }
                      ]}>
                        <Ionicons 
                          name={scan.status === 'Reparable' ? 'checkmark-circle' : 'close-circle'} 
                          size={20} 
                          color={scan.status === 'Reparable' ? '#16a34a' : '#dc2626'} 
                        />
                      </View>
                      
                      <View style={styles.scanDetails}>
                        <View style={styles.scanHeader}>
                          <Text style={styles.scanBarcode}>
                            {scan.barcode}
                          </Text>
                          <View style={[
                            styles.scanStatusBadge,
                            { backgroundColor: scan.status === 'Reparable' ? '#dcfce7' : '#fee2e2' }
                          ]}>
                            <Text style={[
                              styles.scanStatusText,
                              { color: scan.status === 'Reparable' ? '#16a34a' : '#dc2626' }
                            ]}>
                              {scan.status}
                            </Text>
                          </View>
                        </View>
                        
                        <Text style={styles.scanTime}>
                          {formatDateTime(scan.timestamp)}
                        </Text>
                        
                        <View style={styles.scanMeta}>
                          <View style={styles.scanMetaItem}>
                            <Ionicons name="qr-code-outline" size={14} color="#64748b" />
                            <Text style={styles.scanMetaText}>Screen ID</Text>
                          </View>
                          <View style={styles.scanMetaItem}>
                            <Ionicons name="person-outline" size={14} color="#64748b" />
                            <Text style={styles.scanMetaText}>Technician</Text>
                          </View>
                        </View>
                      </View>
                      
                      <TouchableOpacity style={styles.scanActionButton}>
                        <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </View>
              
              {/* Load More Button */}
              {scanHistory.sessions.length > displayLimit && (
                <TouchableOpacity 
                  style={styles.loadMoreButton}
                  onPress={loadMoreScans}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color="#6366f1" />
                  ) : (
                    <>
                      <Ionicons name="chevron-down" size={20} color="#6366f1" />
                      <Text style={styles.loadMoreText}>Load More</Text>
                    </>
                  )}
                </TouchableOpacity>


              
























              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Enhanced Manual Barcode Input Modal */}
      <Modal
        visible={manualInputVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setManualInputVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="keypad-outline" size={32} color="#6366f1" />
              <Text style={styles.modalTitle}>Manual Barcode Entry</Text>
              <Text style={styles.modalSubtitle}>Enter the barcode manually or scan it</Text>
            </View>
            
            <TextInput
              style={styles.inputField}
              placeholder="Enter barcode number"
              placeholderTextColor="#94a3b8"
              value={manualBarcode}
              onChangeText={setManualBarcode}
              autoFocus
              keyboardType="numeric"
              autoCapitalize="characters"
              returnKeyType="done"
            />
            
            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setManualInputVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]} 
                onPress={handleManualBarcode}
              >
                <Text style={styles.submitButtonText}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


<Modal
  visible={statusModalVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setStatusModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalCard}>
      {/* Header */}
      <View style={styles.headerContainer}>
        <Ionicons name="analytics-outline" size={36} color="#4f46e5" />
        <Text style={styles.headerTitle}>Screen Assessment</Text>
        <Text style={styles.headerBarcode}>📦 {scannedBarcode}</Text>
      </View>

      {/* Instructions */}
      <Text style={styles.instructions}>
        Please select the correct condition for this screen.
      </Text>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        
        {/* Reparable */}
        <TouchableOpacity
          style={[styles.actionButton, styles.reparable]}
          onPress={() => handleStatusSelect('Reparable')}
          disabled={!!savingStatus}
          activeOpacity={0.85}
        >
          <View style={styles.iconWrapper}>
            {savingStatus === 'Reparable' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : savedStatus === 'Reparable' ? (
              <Ionicons name="checkmark-circle" size={26} color="#fff" />
            ) : (
              <Ionicons name="checkmark-circle-outline" size={26} color="#fff" />
            )}
          </View>
          <Text style={styles.buttonText}>Reparable</Text>
          <Text style={styles.buttonSubtext}>Can be fixed</Text>
        </TouchableOpacity>

        {/* Beyond Repair */}
        <TouchableOpacity
          style={[styles.actionButton, styles.beyondRepair]}
          onPress={() => handleStatusSelect('Beyond Repair')}
          disabled={!!savingStatus}
          activeOpacity={0.85}
        >
          <View style={styles.iconWrapper}>
            {savingStatus === 'Beyond Repair' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : savedStatus === 'Beyond Repair' ? (
              <Ionicons name="checkmark-circle" size={26} color="#fff" />
            ) : (
              <Ionicons name="close-circle-outline" size={26} color="#fff" />
            )}
          </View>
          <Text style={styles.buttonText}>Beyond Repair</Text>
          <Text style={styles.buttonSubtext}>Needs replacement</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>



      {/* Report Generation Modal */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="document-text-outline" size={32} color="#6366f1" />
              <Text style={styles.modalTitle}>Generate Report</Text>
              <Text style={styles.modalSubtitle}>Create and share a PDF report of all your scans</Text>
            </View>
            
            <Text style={styles.modalDescription}>
              This will generate a comprehensive PDF report containing all your scan data, including barcodes, status, dates, and times. The report will be shared and you can then send it to the admin email address.
            </Text>
            
            <TextInput
              style={styles.inputField}
              placeholder="Enter admin email address"
              placeholderTextColor="#94a3b8"
              value={adminEmail}
              onChangeText={setAdminEmail}
              autoFocus
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="done"
            />
            
            <View style={styles.modalButtonRow}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.cancelButton]} 
                onPress={() => setReportModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalButton, styles.submitButton]} 
                onPress={handleGenerateReport}
                disabled={isGeneratingReport || isSendingEmail}
              >
                {isGeneratingReport || isSendingEmail ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Generate & Share</Text>
                )}
              </TouchableOpacity>
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










modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  padding: 20,
},
modalCard: {
  backgroundColor: '#fff',
  borderRadius: 20,
  width: '100%',
  maxWidth: 380,
  padding: 20,
  shadowColor: '#000',
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 5,
},
headerContainer: {
  alignItems: 'center',
  marginBottom: 16,
},
headerTitle: {
  fontSize: 20,
  fontWeight: '600',
  marginTop: 6,
  color: '#111827',
},
headerBarcode: {
  fontSize: 14,
  color: '#6b7280',
  marginTop: 4,
},
instructions: {
  textAlign: 'center',
  fontSize: 15,
  color: '#374151',
  marginBottom: 20,
},
buttonRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
},
actionButton: {
  flex: 1,
  borderRadius: 14,
  paddingVertical: 14,
  marginHorizontal: 5,
  alignItems: 'center',
},
iconWrapper: {
  marginBottom: 6,
},
reparable: {
  backgroundColor: '#10b981', // green
},
beyondRepair: {
  backgroundColor: '#ef4444', // red
},
buttonText: {
  fontSize: 16,
  fontWeight: '600',
  color: '#fff',
},
buttonSubtext: {
  fontSize: 12,
  color: '#f0fdfa',
},




//DAILY,WEEKLY REPORTS

reportsSection: {
  marginBottom: 20,
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 16,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 6,
  elevation: 3,
},
reportsToggle: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginVertical: 12,
  backgroundColor: '#f1f5f9',
  borderRadius: 8,
  padding: 4,
},
reportToggleButton: {
  flex: 1,
  paddingVertical: 10,
  borderRadius: 6,
  alignItems: 'center',
},
activeToggleButton: {
  backgroundColor: '#6366f1',
},
reportToggleText: {
  fontSize: 14,
  fontWeight: '500',
  color: '#64748b',
},
activeToggleText: {
  color: '#fff',
},
reportsStatsContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  justifyContent: 'space-between',
  marginTop: 12,
},
reportStatCard: {
  width: '48%',
  backgroundColor: '#f8fafc',
  borderRadius: 8,
  padding: 16,
  marginBottom: 12,
  alignItems: 'center',
},
reportStatNumber: {
  fontSize: 24,
  fontWeight: 'bold',
  color: '#1e293b',
  marginBottom: 4,
},
reportStatLabel: {
  fontSize: 14,
  color: '#64748b',
  marginBottom: 4,
},
reportStatChange: {
  fontSize: 12,
  fontWeight: '500',
  color: '#10b981', // positive by default
},
loadingContainer: {
  padding: 40,
  alignItems: 'center',
  justifyContent: 'center',
},
emptyReports: {
  padding: 40,
  alignItems: 'center',
  justifyContent: 'center',
},
emptyReportsText: {
  marginTop: 12,
  color: '#94a3b8',
  fontSize: 14,
},
scanListTitle: {
  fontSize: 16,
  fontWeight: '600',
  color: '#1e293b',
  marginTop: 16,
  marginBottom: 8,
},
scanListContainer: {
  backgroundColor: '#fff',
  borderRadius: 8,
  padding: 8,
  marginTop: 8,
},
scanListItem: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 8,
  borderBottomWidth: 1,
  borderBottomColor: '#f1f5f9',
},
scanStatusIndicator: {
  width: 32,
  height: 32,
  borderRadius: 16,
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: 12,
},
scanDetails: {
  flex: 1,
},
scanBarcode: {
  fontSize: 15,
  fontWeight: '500',
  color: '#1e293b',
},
scanTime: {
  fontSize: 13,
  color: '#64748b',
  marginTop: 2,
},
scanStatusBadge: {
  paddingHorizontal: 10,
  paddingVertical: 4,
  borderRadius: 12,
},
scanStatusText: {
  fontSize: 12,
  fontWeight: '500',
},
emptyScans: {
  padding: 20,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f8fafc',
  borderRadius: 8,
  marginTop: 8,
},
emptyScansText: {
  marginTop: 8,
  color: '#94a3b8',
  fontSize: 14,
},












//ENDS HERE











  modalBackdrop: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},
modalContent: {
  backgroundColor: '#fff',
  marginHorizontal: 24,
  borderRadius: 24,
  padding: 28,
  alignItems: 'center',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 12,
  elevation: 12,
  maxWidth: '90%',
},
modalTitle: {
  fontSize: 22,
  fontWeight: '700',
  color: '#1e293b',
  marginBottom: 16,
  textAlign: 'center',
},
modalMessage: {
  fontSize: 16,
  color: '#64748b',
  marginBottom: 28,
  textAlign: 'center',
  lineHeight: 22,
 
},
modalButton: {
  backgroundColor: '#6366f1',
  paddingVertical: 12,
  paddingHorizontal: 32,
  borderRadius: 16,
  shadowColor: '#6366f1',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.3,
  shadowRadius: 16,
  elevation: 8,
  minWidth: 100,
},
modalButtonText: {
  color: '#fff',
  fontSize: 18,
  fontWeight: '700',
  textAlign: 'center',
},

reportModalContent: {
  width: '80%',
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 24,
  elevation: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
  alignItems: 'center',
},
reportModalEmoji: {
  fontSize: 48,
  marginBottom: 12,
},
reportModalTitle: {
  fontSize: 22,
  fontWeight: '700',
  color: '#1e293b',
  marginBottom: 12,
  textAlign: 'center',
},
reportModalMessage: {
  fontSize: 16,
  color: '#475569',
  marginBottom: 24,
  lineHeight: 22,
  textAlign: 'center',
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
  headerLeft: {
    flex: 1,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
    marginLeft: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#616161',
  },
  logoutButton: {
    padding: 8,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatar: {
    fontSize: 36,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50', // Green for active
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 13,
    color: '#616161',
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  userMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 4,
  },
  userMetaText: {
    fontSize: 13,
    color: '#424242',
    marginLeft: 1,
    fontWeight: '700',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  primaryStat: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#3949ab',
  },
  successStat: {
    backgroundColor: '#e8f5e9',
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  dangerStat: {
    backgroundColor: '#ffebee',
    borderLeftWidth: 4,
    borderLeftColor: '#ef5350',
  },
  infoStat: {
    backgroundColor: '#e0f7fa',
    borderLeftWidth: 4,
    borderLeftColor: '#00bcd4',
  },
  statIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statContent: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#616161',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statTrend: {
    fontSize: 12,
    color: '#4caf50', // Green for positive trend
    fontWeight: '600',
  },
  sessionCard: {
    borderRadius: 16,
    padding: 20,
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
    borderLeftColor: '#4caf50',
  },
  sessionInactive: {
    backgroundColor: '#f5f5f5',
    borderLeftWidth: 4,
    borderLeftColor: '#bdbdbd',
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionStatus: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  sessionSubtitle: {
    fontSize: 13,
    color: '#616161',
  },
  sessionTimer: {
    alignItems: 'flex-end',
  },
  timerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff', // Blue for active timer
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 20,
  },//88888888888888888888888888888888888888888888888888888888888888888888888888888888888
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    color:'#6366f1',
  },
 
  scannerSection: {
    marginBottom: 16,
  },
  scannerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  scannerButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    borderRadius: 12,
    marginHorizontal: 5,
    backgroundColor: '#e0e0e0',
  },
  cameraButton: {
    backgroundColor: '#1976d2',
  },
  manualButton: {
    backgroundColor: '#42a5f5',
  },
  scannerButtonIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  scannerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
  },
  scannerButtonSubtext: {
    fontSize: 12,
    color: '#b0bec5',
  },
  stopSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#dc3545',
    borderRadius: 12,
    paddingVertical: 20,
  },
  historySection: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginLeft: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#616161',
    marginTop: 4,
    marginBottom: 10,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
    marginRight: 5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#fafafa',
    borderRadius: 16,
    marginBottom: 20,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#9e9e9e',
    marginTop: 4,
  },
  scanHistoryList: {
    marginBottom: 20,
  },
  scanHistoryItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  scanStatusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  scanDetails: {
    flex: 1,
  },
  scanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  scanBarcode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginRight: 10,
  },
  scanStatusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  scanStatusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scanTime: {
    fontSize: 13,
    color: '#757575',
    marginBottom: 4,
  },
  scanMeta: {
    flexDirection: 'row',
    marginTop: 4,
  },
  scanMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  scanMetaText: {
    fontSize: 12,
    color: '#616161',
    marginLeft: 5,
  },
  scanActionButton: {
    padding: 8,
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 10,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#6366f1',
    fontWeight: '500',
    marginLeft: 5,
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
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 450,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
    marginTop: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#616161',
    marginTop: 4,
  },
  modalPrompt: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputField: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
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
    paddingVertical: 14,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  cancelButton: {
    backgroundColor: '#e0e0e0',
  },
  submitButton: {
    backgroundColor: '#1976d2',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#424242',
  },
  submitButtonText: {
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
    borderRadius: 12,
    paddingVertical: 14,
    marginHorizontal: 8,
  },
  reparableButton: {
    backgroundColor: '#dcfce7',
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  beyondRepairButton: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fee2e2',
  },
  statusButtonIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  statusButtonContent: {
    alignItems: 'center',
  },
  statusButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  statusButtonSubtext: {
    fontSize: 12,
    color: '#616161',
  },
  reportSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 20,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reportButtonIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
  },
  reportButtonContent: {
    flex: 1,
  },
  reportButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  reportButtonSubtext: {
    fontSize: 12,
    color: '#b0bec5',
  },
});