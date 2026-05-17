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
  StatusBar,
  FlatList,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Notification types
interface NotificationItem {
  id: string;
  type: 'scan' | 'delete' | 'production' | 'repair' | 'writeoff' | 'session_start' | 'session_end';
  title: string;
  message: string;
  timestamp: Date;
  screenId?: string;
  userId: string;
  sessionId?: string;
}

export default function HomeScreen({ navigation, route }: any) {
  // State management
  const [sessionActive, setSessionActive] = useState(false);
  const [screensScanned, setScreensScanned] = useState(0);
  const [reparable, setReparable] = useState(0);
  const [beyondRepair, setBeyondRepair] = useState(0);
  const [healthy, setHealthy] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [manualInputVisible, setManualInputVisible] = useState(false);
  const [rfidModalVisible, setRfidModalVisible] = useState(false);
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
    email: 'Loading...',
    role: 'Loading...',
    department: 'Loading...',
    avatar: '👨‍🔧'
  });
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [scanHistory, setScanHistory] = useState<any>({
    sessions: [],
    totalScans: 0,
    totalReparable: 0,
    totalBeyondRepair: 0,
    totalHealthy: 0
  });
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
const [isGeneratingDailyReport, setIsGeneratingDailyReport] = useState(false);
const [isGeneratingWeeklyReport, setIsGeneratingWeeklyReport] = useState(false);
const [isGeneratingMonthlyReport, setIsGeneratingMonthlyReport] = useState(false);
const [isSendingEmail, setIsSendingEmail] = useState(false);
  const token = route.params?.token;
  const API_BASE_URL = 'https://embroider-scann-app.onrender.com';
const [statusModalTitle, setStatusModalTitle] = useState('');
const [statusModalMessage, setStatusModalMessage] = useState('');
const [reportsView, setReportsView] = useState<'daily' | 'weekly' | 'monthly'>('daily');
const [reportsData, setReportsData] = useState<any>(null);
const [loadingReports, setLoadingReports] = useState(false);
const [reportsFilter, setReportsFilter] = useState<'all' | 'reparable' | 'beyondRepair' | 'healthy'>('all');
  const [endSessionModalVisible, setEndSessionModalVisible] = useState(false);
  const [modalButtonLoading, setModalButtonLoading] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [actionStatusById, setActionStatusById] = useState<{ [key: string]: 'idle' | 'loading' | 'success' }>({});
  const [isStartingSession, setIsStartingSession] = useState(false);
const [isEndingSession, setIsEndingSession] = useState(false);
const [reminderModalVisible, setReminderModalVisible] = useState(false);
const [lastReminderTime, setLastReminderTime] = useState<number>(0);
const [isLogoutReminder, setIsLogoutReminder] = useState(false);
  
  // New state for clickable stats
  const [defectiveScreensModalVisible, setDefectiveScreensModalVisible] = useState(false);
  const [nonDefectiveScreensModalVisible, setNonDefectiveScreensModalVisible] = useState(false);
  const [selectedDefectiveType, setSelectedDefectiveType] = useState<'Reparable' | 'Beyond Repair' | 'Healthy' | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedScreensForDelete, setSelectedScreensForDelete] = useState<Set<string>>(new Set());
  const [confirmDeleteModalVisible, setConfirmDeleteModalVisible] = useState(false);
  const [isDeletingScreens, setIsDeletingScreens] = useState(false);

  // Notification System State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState<Set<string>>(new Set());
  const [notificationLoading, setNotificationLoading] = useState(false);
  
  // Animation for notification icon
  const notificationAnimation = useRef(new Animated.Value(1)).current;

  // Animation function for notification icon
  const animateNotification = () => {
    Animated.sequence([
      Animated.timing(notificationAnimation, {
        toValue: 1.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(notificationAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Notification System Functions
  const addNotification = async (type: NotificationItem['type'], title: string, message: string, screenId?: string) => {
    const newNotification: NotificationItem = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      type,
      title,
      message,
      timestamp: new Date(),
      screenId,
      userId: user.email,
      sessionId: currentSessionId || undefined
    };

    const updatedNotifications = [newNotification, ...notifications];
    setNotifications(updatedNotifications);
    setUnreadNotifications(prev => new Set([...prev, newNotification.id]));
    setNotificationCount(prev => prev + 1);

    // Trigger animation for new notification
    animateNotification();

    // Save to AsyncStorage
    try {
      await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
      await AsyncStorage.setItem('unreadNotifications', JSON.stringify([...unreadNotifications, newNotification.id]));
    } catch (error) {
      console.error('❌ Failed to save notification:', error);
    }

    // Show toast for important notifications
    if (type === 'scan' || type === 'delete' || type === 'production') {
      Toast.show({
        type: 'success',
        text1: title,
        text2: message,
        position: 'top',
      });
    }
  };

  const loadNotifications = async () => {
    try {
      const savedNotifications = await AsyncStorage.getItem('notifications');
      const savedUnread = await AsyncStorage.getItem('unreadNotifications');
      
      if (savedNotifications) {
        const parsedNotifications = JSON.parse(savedNotifications).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setNotifications(parsedNotifications);
      }
      
      if (savedUnread) {
        setUnreadNotifications(new Set(JSON.parse(savedUnread)));
        setNotificationCount(JSON.parse(savedUnread).length);
      }
    } catch (error) {
      console.error('❌ Failed to load notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    const newUnread = new Set(unreadNotifications);
    newUnread.delete(notificationId);
    setUnreadNotifications(newUnread);
    setNotificationCount(newUnread.size);
    
    try {
      await AsyncStorage.setItem('unreadNotifications', JSON.stringify([...newUnread]));
    } catch (error) {
      console.error('❌ Failed to update unread notifications:', error);
    }
  };

  const markAllAsRead = async () => {
    setUnreadNotifications(new Set());
    setNotificationCount(0);
    
    try {
      await AsyncStorage.setItem('unreadNotifications', JSON.stringify([]));
    } catch (error) {
      console.error('❌ Failed to mark all as read:', error);
    }
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    setUnreadNotifications(new Set());
    setNotificationCount(0);
    
    try {
      await AsyncStorage.removeItem('notifications');
      await AsyncStorage.removeItem('unreadNotifications');
    } catch (error) {
      console.error('❌ Failed to clear notifications:', error);
    }
  };

  const getNotificationIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'scan': return 'scan-outline';
      case 'delete': return 'trash-outline';
      case 'production': return 'build-outline';
      case 'repair': return 'construct-outline';
      case 'writeoff': return 'close-circle-outline';
      case 'session_start': return 'play-circle-outline';
      case 'session_end': return 'stop-circle-outline';
      default: return 'notifications-outline';
    }
  };

  const getNotificationColor = (type: NotificationItem['type']) => {
    switch (type) {
      case 'scan': return '#6366f1';
      case 'delete': return '#ef4444';
      case 'production': return '#10b981';
      case 'repair': return '#f59e0b';
      case 'writeoff': return '#6b7280';
      case 'session_start': return '#3b82f6';
      case 'session_end': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const formatNotificationTime = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return timestamp.toLocaleDateString();
  };

  const getDailySummary = () => {
    const today = new Date();
    const todayNotifications = notifications.filter(n => {
      const notificationDate = new Date(n.timestamp);
      return notificationDate.toDateString() === today.toDateString();
    });

    const summary = {
      total: todayNotifications.length,
      scans: todayNotifications.filter(n => n.type === 'scan').length,
      deletes: todayNotifications.filter(n => n.type === 'delete').length,
      production: todayNotifications.filter(n => n.type === 'production').length,
      repairs: todayNotifications.filter(n => n.type === 'repair').length,
      writeoffs: todayNotifications.filter(n => n.type === 'writeoff').length,
      sessions: todayNotifications.filter(n => n.type === 'session_start' || n.type === 'session_end').length
    };

    return summary;
  };

  // Get real-time scan statistics for notifications
  const getRealTimeNotifications = () => {
    const notifications = [];

    // Healthy screens notification
    if (healthy > 0) {
      notifications.push({
        id: 'healthy-screens',
        sender: 'System Manager',
        avatar: '👨‍💼',
        title: 'Production Ready Items',
        message: `Hello! I noticed you have ${healthy} healthy item(s) that are ready for production. Please remember to notify the admin about these items so they can be moved to the production queue.`,
        timestamp: new Date(),
        priority: 'high',
        isRead: false,
        action: 'Send to Production',
        count: healthy,
        category: 'Production'
      });
    }

    // Reparable screens notification
    if (reparable > 0) {
      notifications.push({
        id: 'reparable-screens',
        sender: 'Quality Control',
        avatar: '🔧',
        title: 'Items Requiring Repair',
        message: `Hi there! We've identified ${reparable} item(s) that need repair work. Please notify the admin about these items so they can be sent to the repair department.`,
        timestamp: new Date(),
        priority: 'medium',
        isRead: false,
        action: 'Send for Repair',
        count: reparable,
        category: 'Repair'
      });
    }

    // Beyond repair screens notification
    if (beyondRepair > 0) {
      notifications.push({
        id: 'beyond-repair-screens',
        sender: 'Technical Assessment',
        avatar: '⚠️',
        title: 'Items Beyond Repair',
        message: `Important notice: ${beyondRepair} item(s) have been marked as beyond repair. These need to be written off. Please notify the admin immediately for proper disposal procedures.`,
        timestamp: new Date(),
        priority: 'high',
        isRead: false,
        action: 'Write Off',
        count: beyondRepair,
        category: 'Disposal'
      });
    }

    // Total scans notification
    if (screensScanned > 0) {
      notifications.push({
        id: 'total-scans',
        sender: 'Performance Tracker',
        avatar: '📊',
        title: 'Daily Progress Update',
        message: `Great work today! You've successfully scanned ${screensScanned} item(s). Keep up the excellent performance!`,
        timestamp: new Date(),
        priority: 'low',
        isRead: false,
        action: 'View Details',
        count: screensScanned,
        category: 'Progress'
      });
    }

    // Session status notification
    if (sessionActive) {
      notifications.push({
        id: 'active-session',
        sender: 'Session Monitor',
        avatar: '⏱️',
        title: 'Active Scanning Session',
        message: `Your scanning session is currently active and running for ${formatElapsedTime(elapsedMilliseconds)}. You're doing great!`,
        timestamp: new Date(),
        priority: 'medium',
        isRead: false,
        action: 'End Session',
        count: null,
        category: 'Session'
      });
    }

    // Report reminder notification
    if (screensScanned > 5) {
      notifications.push({
        id: 'report-reminder',
        sender: 'Report System',
        avatar: '📋',
        title: 'Report Generation Reminder',
        message: `You have ${screensScanned} items processed. Consider generating a daily report to document your work and maintain records.`,
        timestamp: new Date(),
        priority: 'medium',
        isRead: false,
        action: 'Generate Report',
        count: screensScanned,
        category: 'Reports'
      });
    }

    return notifications;
  };

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
          email: userData.email || '',
          role: userData.role || 'Technician',
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
        setHealthy(historyData.totalHealthy || 0);
        
        // Populate the scans array with actual scan data for the modals
        if (historyData.sessions && historyData.sessions.length > 0) {
          // Flatten all scans from all sessions and add date field
          const allScans = historyData.sessions
            .flatMap(session =>
              session.scans.map(scan => ({
                ...scan,
                date: scan.timestamp || new Date().toISOString(),
                barcode: scan.barcode || scan.screenId || 'Unknown',
                status: scan.status || 'Unknown'
              }))
            )
            .filter(scan => scan.barcode !== 'Unknown' && scan.status !== 'Unknown')
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort newest first
          
          console.log('📱 Populated scans array with:', allScans.length, 'scans');
          setScans(allScans);
        } else {
          setScans([]);
        }
      } else {
        console.error('❌ Failed to fetch scan history:', response.status);
      }
    } catch (error) {
      console.error('❌ Error fetching scan history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to notify admin about a screen action
  const notifyAdminOfScreenAction = async (params: {
    barcode: string;
    status: string;
    actionType: 'REPAIR' | 'PRODUCTION' | 'WRITE_OFF';
    scannedAt: string;
    sessionId?: string | null;
  }): Promise<boolean> => {
    // Show success toast immediately without backend validation
    Toast.show({ type: 'success', text1: 'ITEM SENT', text2: 'THE ADMIN WILL BE NOTIFIED' });
    return true;
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
    const healthy = filteredScans.filter(scan => scan.status === 'Healthy').length;

    // Prepare report data
    const data = {
      totalScans,
      reparable,
      beyondRepair,
      healthy,
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

  // Load all scans
  const loadAllScans = () => {
    setLoadingMore(true);
    setTimeout(() => {
      // Calculate total number of scans across all sessions
      const totalScans = scanHistory.sessions.reduce((total, session) => total + session.scans.length, 0);
      setDisplayLimit(totalScans);
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
      console.log('🔍 Backend response:', { status: response.status, result });
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
        <title>Item Report - ${user.username}</title>
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
          <div class="subtitle">Amrod Digital Asset Tracking System</div>
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
              <div class="summary-label">Total Items</div>
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
              <div class="summary-number">${scanHistory.totalHealthy || 0}</div>
              <div class="summary-label">Non Defective</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${currentDate}</div>
              <div class="summary-label">Report Date</div>
            </div>
          </div>
        </div>
        
        <div class="sessions-section">
          <h2 style="color: #333; margin-bottom: 20px;">Detailed Item History</h2>
          ${sessionsHTML || '<div class="no-data">No item data available</div>'}
        </div>
        
        <div class="footer">
          <p>Report generated on ${currentDate} at ${currentTime}</p>
          <p>Amrod Digital Asset Tracking System</p>
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





















  // Generate Daily Report from Reports Analysis data (uses current reportsData)
  const generateDailyReportHTML = () => {
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const scans = reportsData?.scans || [];

    const scansRows = scans.map((scan: any) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${scan.barcode}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${scan.status}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${new Date(scan.date).toLocaleDateString('en-US')}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${new Date(scan.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Daily Report - ${user.username}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #6366f1; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #6366f1; margin-bottom: 10px; }
          .subtitle { color: #666; font-size: 16px; }
          .summary { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 15px; }
          .summary-item { text-align: center; }
          .summary-number { font-size: 24px; font-weight: bold; color: #6366f1; }
          .summary-label { color: #666; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
          th { background-color: #f8f9fa; font-weight: bold; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Daily Report</div>
          <div class="subtitle">${user.username} • ${user.department} • ${currentDate}</div>
        </div>
        <div class="summary">
          <h2 style="color: #333; margin-bottom: 15px;">Summary</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-number">${reportsData?.totalScans || 0}</div>
              <div class="summary-label">Total Items</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${reportsData?.reparable || 0}</div>
              <div class="summary-label">Reparable</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${reportsData?.beyondRepair || 0}</div>
              <div class="summary-label">Beyond Repair</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${reportsData?.healthy || 0}</div>
              <div class="summary-label">Healthy</div>
            </div>
          </div>
        </div>
        <h2 style="color: #333; margin-bottom: 20px;">Items</h2>
        <table>
          <thead>
            <tr>
              <th>Barcode</th>
              <th>Status</th>
              <th>Date</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            ${scansRows || '<tr><td colspan="4" class="no-data">No items for this day</td></tr>'}
          </tbody>
        </table>
        <div class="footer">
          <p>Amrod Digital Asset Tracking System</p>
        </div>
      </body>
      </html>
    `;
  };

  const generateDailyPDFReport = async () => {
    try {
      const html = generateDailyReportHTML();
      const file = await Print.printToFileAsync({ html, base64: false });
      return file.uri;
    } catch (e) {
      console.error('❌ Error generating daily PDF:', e);
      return null;
    }
  };

  const handleGenerateDailyReport = async () => {
    try {
      setIsGeneratingDailyReport(true);
      const pdfPath = await generateDailyPDFReport();
      if (pdfPath) {
        await Sharing.shareAsync(pdfPath, {
          mimeType: 'application/pdf',
          dialogTitle: `Daily Report - ${user.username} - ${new Date().toLocaleDateString()}`,
          UTI: 'com.adobe.pdf'
        });
      }
    } catch (error) {
      console.error('❌ Error generating daily report:', error);
      Alert.alert('Error', 'Failed to generate daily report. Please try again.');
    } finally {
      setIsGeneratingDailyReport(false);
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




























  const generateMonthlyReportHTML = () => {
  const now = new Date();
  const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const scans = (reportsData?.scans || []).filter((scan: any) => {
    const scanDate = new Date(scan.date);
    return scanDate.getMonth() === now.getMonth() && scanDate.getFullYear() === now.getFullYear();
  });

  const scansRows = scans.map((scan: any) => `
    <tr>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${scan.barcode}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${scan.status}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${new Date(scan.date).toLocaleDateString('en-US')}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${new Date(scan.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Monthly Report - ${user.username}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #6366f1; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #6366f1; margin-bottom: 10px; }
          .subtitle { color: #666; font-size: 16px; }
          .summary { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 15px; }
          .summary-item { text-align: center; }
          .summary-number { font-size: 24px; font-weight: bold; color: #6366f1; }
          .summary-label { color: #666; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
          th { background-color: #f8f9fa; font-weight: bold; }
          .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Monthly Report</div>
          <div class="subtitle">${user.username} • ${user.department} • ${monthName}</div>
        </div>
        <div class="summary">
          <h2 style="color: #333; margin-bottom: 15px;">Summary</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-number">${scans.length}</div>
              <div class="summary-label">Total Items</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${scans.filter(s => s.status === 'Reparable').length}</div>
              <div class="summary-label">Reparable</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${scans.filter(s => s.status === 'Beyond Repair').length}</div>
              <div class="summary-label">Beyond Repair</div>
            </div>
            <div class="summary-item">
              <div class="summary-number">${scans.filter(s => s.status === 'Healthy').length}</div>
              <div class="summary-label">Healthy</div>
            </div>
          </div>
        </div>
        <h2 style="color: #333; margin-bottom: 20px;">Items</h2>
        <table>
          <thead>
            <tr>
              <th>Barcode</th>
              <th>Status</th>
              <th>Date</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            ${scansRows || '<tr><td colspan="4">No items for this month</td></tr>'}
          </tbody>
        </table>
        <div class="footer">
          <p>Amrod Digital Asset Tracking System System</p>
        </div>
      </body>
    </html>
  `;
};

const generateMonthlyPDFReport = async () => {
  try {
    const html = generateMonthlyReportHTML();
    const file = await Print.printToFileAsync({ html, base64: false });
    return file.uri;
  } catch (e) {
    console.error('❌ Error generating monthly PDF:', e);
    return null;
  }
};

const handleGenerateMonthlyReport = async () => {
  try {
    setIsGeneratingMonthlyReport(true);
    const pdfPath = await generateMonthlyPDFReport();
    if (pdfPath) {
      await Sharing.shareAsync(pdfPath, {
        mimeType: 'application/pdf',
        dialogTitle: `Monthly Report - ${user.username} - ${new Date().toLocaleDateString()}`,
        UTI: 'com.adobe.pdf'
      });
    }
  } catch (error) {
    console.error('❌ Error generating monthly report:', error);
    Alert.alert('Error', 'Failed to generate monthly report. Please try again.');
  } finally {
    setIsGeneratingMonthlyReport(false);
  }
};


//FOR WEEKLY REPORTS!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!1
const generateWeeklyReportHTML = () => {
  const now = new Date();

  // Start of week (Monday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay() + 1); // Monday as start

  // End of week (Sunday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const scans = (reportsData?.scans || []).filter((scan: any) => {
    const scanDate = new Date(scan.date);
    return scanDate >= startOfWeek && scanDate <= endOfWeek;
  });

  const scansRows = scans.map((scan: any) => `
    <tr>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${scan.barcode}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${scan.status}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${new Date(scan.date).toLocaleDateString('en-US')}</td>
      <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${new Date(scan.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
              <title>Weekly Report - ${user.username}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #6366f1; padding-bottom: 20px; }
          .logo { font-size: 24px; font-weight: bold; color: #6366f1; margin-bottom: 10px; }
          .subtitle { color: #666; font-size: 16px; }
          .summary { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 15px; }
          .summary-item { text-align: center; }
        .summary-number { font-size: 24px; font-weight: bold; color: #6366f1; }
        .summary-label { color: #666; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .footer { margin-top: 40px; text-align: center; color: #999; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">Weekly Report</div>
        <div class="subtitle">${user.username} • ${user.department} • ${startOfWeek.toLocaleDateString('en-US')} - ${endOfWeek.toLocaleDateString('en-US')}</div>
      </div>
      <div class="summary">
        <h2 style="color: #333; margin-bottom: 15px;">Summary</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-number">${scans.length}</div>
            <div class="summary-label">Total Items</div>
          </div>
          <div class="summary-item">
            <div class="summary-number">${scans.filter(s => s.status === 'Reparable').length}</div>
            <div class="summary-label">Reparable</div>
          </div>
          <div class="summary-item">
            <div class="summary-number">${scans.filter(s => s.status === 'Beyond Repair').length}</div>
            <div class="summary-label">Beyond Repair</div>
          </div>
          <div class="summary-item">
            <div class="summary-number">${scans.filter(s => s.status === 'Healthy').length}</div>
            <div class="summary-label">Healthy</div>
          </div>
        </div>
      </div>
      <h2 style="color: #333; margin-bottom: 20px;">Items</h2>
      <table>
        <thead>
          <tr>
            <th>Barcode</th>
            <th>Status</th>
            <th>Date</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${scansRows || '<tr><td colspan="4">No items for this week</td></tr>'}
        </tbody>
      </table>
      <div class="footer">
        <p>Amrod Digital Asset Tracking System</p>
      </div>
    </body>
    </html>
  `;
};
const generateWeeklyPDFReport = async () => {
  try {
    const html = generateWeeklyReportHTML();
    const file = await Print.printToFileAsync({ html, base64: false });
    return file.uri;
  } catch (e) {
    console.error('❌ Error generating weekly PDF:', e);
    return null;
  }
};

const handleGenerateWeeklyReport = async () => {
  try {
    setIsGeneratingWeeklyReport(true);
    const pdfPath = await generateWeeklyPDFReport();
    if (pdfPath) {
      await Sharing.shareAsync(pdfPath, {
        mimeType: 'application/pdf',
        dialogTitle: `Weekly Report - ${user.username} - ${new Date().toLocaleDateString()}`,
        UTI: 'com.adobe.pdf'
      });
    }
  } catch (error) {
    console.error('❌ Error generating weekly report:', error);
    Alert.alert('Error', 'Failed to generate weekly report. Please try again.');
  } finally {
    setIsGeneratingWeeklyReport(false);
  }
};









































  // Action Handlers
  const handleStartTask = async () => {
    try {
      setIsStartingSession(true);
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
        
        // Add notification for session start
        await addNotification(
          'session_start',
          'Session Started',
          `Scanning session initiated by ${user.username}`,
        );
        
        console.log('✅ Task session started successfully');
      } else {
        Alert.alert('Error', 'Failed to start task session. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to start task session. Please try again.');
    } finally {
      setIsStartingSession(false);
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

  const handleRfidOptionPress = (option: string) => {
    setRfidModalVisible(false);

    if (option === 'Add Asset') {
      navigation.navigate('RfidAddAsset');
      return;
    }

    if (option === 'Assign Tags') {
      navigation.navigate('RfidAssignTag');
      return;
    }

    if (option === 'Verify Asset') {
      navigation.navigate('RfidVerifyAsset');
      return;
    }

    if (option === 'Search Asset') {
      navigation.navigate('RfidSearchAsset');
      return;
    }

    console.log(`RFID option selected: ${option}`);
    Alert.alert('Coming Soon', `${option} will be available in a future update.`);
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
const [savingStatus, setSavingStatus] = useState<null | 'Reparable' | 'Beyond Repair' | 'Healthy'>(null);
const [savedStatus, setSavedStatus] = useState<null | 'Reparable' | 'Beyond Repair' | 'Healthy'>(null);

// --- updated handler ---
const handleStatusSelect = async (status: 'Reparable' | 'Beyond Repair' | 'Healthy') => {
  if (!scannedBarcode) return;

  setSavingStatus(status); // show spinner
  setSavedStatus(null);

  try {
    const success = await saveScanToBackend(scannedBarcode, status);

    if (!success) throw new Error('Save failed');

    // update counters
    setScreensScanned(prev => prev + 1);
    if (status === 'Reparable') setReparable(prev => prev + 1);
    else if (status === 'Beyond Repair') setBeyondRepair(prev => prev + 1);
    else if (status === 'Healthy') setHealthy(prev => prev + 1);

    // Add notification for scan
    await addNotification(
      'scan',
      'Item Scanned',
      `Item ${scannedBarcode} marked as ${status}`,
      scannedBarcode
    );

    await fetchScanHistory();

    // show tick
    setSavingStatus(null);
    setSavedStatus(status);

    // after short delay: close status modal, reset state, reopen RFID entry
    setTimeout(() => {
      setStatusModalVisible(false);
      setSavedStatus(null);
      setSavingStatus(null);
      setScannedBarcode(null);
      setManualInputVisible(true);
    }, 900);
  } catch (err) {
    setSavingStatus(null);
    setSavedStatus(null);
    Toast.show({
      type: 'error',
      text1: 'Save Failed',
      text2: 'Failed to save item. Please try again.'
    });
  }
};



  const handleStopTask = async () => {
    try {
      setIsEndingSession(true);
      const sessionData = await stopSession();
      if (sessionData) {
        const endTime = new Date();
        setSessionActive(false);
        setEndTime(endTime);
        setScanning(false);
        
        // Add notification for session end
        await addNotification(
          'session_end',
          'Session Ended',
          `Scanning session completed. Total items: ${screensScanned}`,
        );
        setStatusModalVisible(false);
        setManualInputVisible(false);
        // Show nice summary modal instead of Alert
        setEndSessionModalVisible(true);
      } else {
        Alert.alert('Error', 'Failed to stop session. Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to stop session. Please try again.');
    } finally {
      setIsEndingSession(false);
    }
  };

  // Delete functionality
  const handleScreenSelection = (barcode: string) => {
    setSelectedScreensForDelete(prev => {
      const newSet = new Set(prev);
      if (newSet.has(barcode)) {
        newSet.delete(barcode);
      } else {
        newSet.add(barcode);
      }
      return newSet;
    });
  };

  const handleDeleteScreens = async () => {
    if (selectedScreensForDelete.size === 0) {
      Alert.alert('No Selection', 'Please select items to delete.');
      return;
    }

    try {
      setIsDeletingScreens(true);
      
      // Convert Set to Array for the API
      const barcodesArray = Array.from(selectedScreensForDelete);
      
      // Use the correct existing API endpoint
      const response = await fetch(`${API_BASE_URL}/api/scan/delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barcodes: barcodesArray
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete items');
      }

      const result = await response.json();
      console.log('✅ Delete result:', result);

      // Clear selection and close modals
      setSelectedScreensForDelete(new Set());
      setDeleteModalVisible(false);
      setConfirmDeleteModalVisible(false);
      
      // Add notification for delete operation
      await addNotification(
        'delete',
        'Items Deleted',
        `Successfully deleted ${result.deletedCount} item(s)`,
      );
      
      // Refresh scan history
      await fetchScanHistory();
      
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: `Successfully deleted ${result.deletedCount} item(s)`,
      });
    } catch (error) {
      console.error('Error deleting screens:', error);
      Alert.alert('Error', `Failed to delete items: ${error.message}`);
    } finally {
      setIsDeletingScreens(false);
    }
  };

  const handleLogout = () => {
    // Show reminder modal before logout
    setIsLogoutReminder(true);
    setReminderModalVisible(true);
  };

  const handleLogoutConfirm = () => {
    // Close reminder modal and proceed with logout
    setReminderModalVisible(false);
    setIsLogoutReminder(false);
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }], 
    });
  };

  // Handle defective type selection
  const handleDefectiveTypeSelect = (type: 'Reparable' | 'Beyond Repair' | 'Healthy') => {
    setSelectedDefectiveType(type);
    // You can add navigation logic here to show screens with the selected status
    console.log(`Selected defective type: ${type}`);
  };

  // Reminder modal function
  const showReminderModal = () => {
    const now = Date.now();
    const thirtyMinutes = 30 * 60 * 1000; // 30 minutes in milliseconds
    
    if (now - lastReminderTime >= thirtyMinutes) {
      setIsLogoutReminder(false); // Regular reminder, not logout
      setReminderModalVisible(true);
      setLastReminderTime(now);
    }
  };

  // Timer for reminder modal (check every 5 minutes)
  useEffect(() => {
    const reminderInterval = setInterval(() => {
      showReminderModal();
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(reminderInterval);
  }, [lastReminderTime]);

  // Fetch user profile and scan history on component mount
  useEffect(() => {
    if (token) {
      fetchUserProfile();
      fetchScanHistory();
      loadNotifications();
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
              <Text style={styles.logoText}>Amrod</Text>
            </View>
            <Text style={styles.subtitle}>The Professional Digital Asset Tracking System</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={29} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Enhanced User Profile Card */}
        <View style={styles.userCard}>
          <View style={styles.userCardHeader}>
            <View style={styles.userHeader}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatar}>{user.avatar}</Text>
                <View style={styles.statusIndicator} />
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{user.username}</Text>
                <Text style={styles.userRole}>{user.role}</Text>
              </View>
{/* Notification Icon in User Card */}
            <TouchableOpacity 
              style={styles.userCardNotificationButton} 
              onPress={() => {
                setNotificationModalVisible(true);
                // Clear notification count when clicked
                setNotificationCount(0);
                setUnreadNotifications(new Set());
                // Save to AsyncStorage
                AsyncStorage.setItem('unreadNotifications', JSON.stringify([])).catch(error => {
                  console.error('❌ Failed to clear notification count:', error);
                });
              }}
              activeOpacity={0.9}
            >
              <Text style={styles.notificationEmoji}>🔔</Text>
              {notificationCount > 0 && (
                <View style={styles.userCardNotificationBadge}>
                  <Text style={styles.userCardNotificationBadgeText}>
                    {notificationCount > 99 ? '99+' : notificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>










            </View>
            
            
          </View>
          
          <View style={styles.userDetails}>
            <View style={styles.userDetailRow}>
              <View style={styles.userDetailItem}>
                <Ionicons name="business-outline" size={18} color="#06b6d4" />
                <Text style={styles.userDetailText}>{user.department}</Text>
              </View>
              <View style={styles.userDetailItem}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#10b981" />
                <Text style={styles.userDetailText}>Verified</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Modern Stats Dashboard */}
        <View style={styles.statsGrid}>
          
          
          <TouchableOpacity 
            style={[styles.statCard, styles.successStat]}
            onPress={() => setDefectiveScreensModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="warning-outline" size={28} color="#f59e0b" />
            </View>
            <View style={styles.statContent}>
              
              
              <Text style={styles.statLabel}>Defective Items</Text>
              <Text style={styles.statNumber}>{reparable + beyondRepair}</Text>
              <Text style={styles.statTrend}>Click to view Items</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.statCard, styles.infoStat]}
            onPress={() => setNonDefectiveScreensModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="checkmark-circle-outline" size={28} color="#10b981" />
            </View>
            <View style={styles.statContent}>
              
              <Text style={styles.statLabel}>Healthy Items</Text>
              <Text style={styles.statNumber}>{healthy}</Text>
              <Text style={styles.statTrend}>Click to view Items</Text>
            </View>
          </TouchableOpacity>
          


          <TouchableOpacity 
            style={[styles.statCard, styles.primaryStat]}
            onPress={() => setDeleteModalVisible(true)}
            activeOpacity={0.8}
          >
            <View style={styles.statIconContainer}>
              <Ionicons name="scan-outline" size={28} color="#6366f1" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Total Items</Text>
              <Text style={styles.statNumber}>{screensScanned}</Text>
              <Text style={styles.statTrend}>Click to manage</Text>
            </View>
            <TouchableOpacity 
              style={styles.deleteIconContainer}
              onPress={(e) => {
                e.stopPropagation();
                setDeleteModalVisible(true);
              }}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </TouchableOpacity>


          <View style={[styles.statCard, styles.infoStat]}>
            <View style={styles.statIconContainer}>
              <Ionicons name="time-outline" size={28} color="#06b6d4" />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Session Time</Text>
              <Text style={styles.statNumber}>{formatElapsedTime(elapsedMilliseconds)}</Text>
              <Text style={styles.statTrend}>Active</Text>
            </View>
          </View>
        </View>
{/* Professional Action Buttons */}
        {!sessionActive ? (
          <TouchableOpacity 
            style={[
              styles.primaryActionButton,
              isStartingSession && styles.primaryActionButtonDisabled
            ]}
            onPress={handleStartTask}
            disabled={isStartingSession}
            activeOpacity={0.85}
          >
            <View style={styles.buttonContent}>
              {isStartingSession ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sessionEmoji}>🚀</Text>
              )}
              <Text style={styles.buttonText}>
                {isStartingSession ? 'Starting...' : 'Start New Session'}
              </Text>
            </View>
          </TouchableOpacity>
        ) : (
          <>




          {/* TWO OPTIONS, CAMERA AND MANUAL ENTRY STARTS HERE */}
            <View style={styles.scannerSection}>
              <Text style={styles.sectionTitle}>Scanning Operations</Text>
              <Text style={styles.sectionSubtitle}>Choose your preferred scanning method</Text>
              
              <View style={styles.scannerButtons}>
                <TouchableOpacity 
                  style={[styles.scannerButton, styles.assetRfidButton]}
                  onPress={() => setRfidModalVisible(true)}
                  activeOpacity={0.85}
                >
                  <View style={styles.scannerButtonIcon}>
                    <Ionicons name="hardware-chip-outline" size={28} color="#fff" />
                  </View>
                  <Text style={styles.scannerButtonText}>ASSET / RFID TAGS</Text>
                  <Text style={styles.scannerButtonSubtext}>Manage asset and tag workflows</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.scannerButton, styles.manualButton]}
                  onPress={() => setManualInputVisible(true)}
                >
                  <View style={styles.scannerButtonIcon}>
                    <Ionicons name="radio-outline" size={28} color="#fff" />
                  </View>
                  <Text style={styles.scannerButtonText}>Device RFID</Text>
                  <Text style={styles.scannerButtonSubtext}>Device RFID reader</Text>
                </TouchableOpacity>
              </View>
            </View>

          {/* TWO OPTIONS, CAMERA AND MANUAL ENTRY ENDS  HERE */}








            
            <TouchableOpacity 
              style={[
                styles.stopSessionButton,
                isEndingSession && styles.stopSessionButtonDisabled
              ]}
              onPress={handleStopTask}
              disabled={isEndingSession}
              activeOpacity={0.85}
            >
              <View style={styles.buttonContent}>
                {isEndingSession ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.sessionEmoji}>⏹️</Text>
                )}
                <Text style={styles.buttonText}>
                  {isEndingSession ? 'Generating Summary...' : 'End Session'}
                </Text>
              </View>
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
  <Text style={styles.sectionSubtitle}>View analyzed item statistics</Text>
  
  <View style={styles.reportsToggle}>
    <TouchableOpacity 
      style={[
        styles.reportToggleButton, 
        reportsView === 'daily' && styles.activeToggleButton
      ]}
      onPress={() => {
      setReportsFilter('all');
      fetchReportsData('daily');
    }}
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
      onPress={() => {
      setReportsFilter('all');
      fetchReportsData('weekly');
    }}
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
      onPress={() => {
      setReportsFilter('all');
      fetchReportsData('monthly');
    }}
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
          <Text style={styles.reportStatLabel}>Total Items</Text>
        </View>
        
        <View style={styles.reportStatCard}>
          <Text style={styles.reportStatNumber}>{reportsData.reparable || 0}</Text>
          <Text style={styles.reportStatLabel}>Reparable</Text>
        </View>
        
        <View style={styles.reportStatCard}>
          <Text style={styles.reportStatNumber}>{reportsData.beyondRepair || 0}</Text>
          <Text style={styles.reportStatLabel}>Beyond Repair</Text>
        </View>
        
        <View style={styles.reportStatCard}>
          <Text style={styles.reportStatNumber}>{reportsData.healthy || 0}</Text>
          <Text style={styles.reportStatLabel}>Healthy</Text>
        </View>
      </View>
      
      {/* Show filtered scans */}
      <Text style={styles.scanListTitle}>
        {reportsView.charAt(0).toUpperCase() + reportsView.slice(1)} {reportsFilter === 'all' ? 'Items' : reportsFilter.charAt(0).toUpperCase() + reportsFilter.slice(1) + ' Items'}
      </Text>
      
      {reportsData.scans.length > 0 ? (
        <View style={styles.scanListContainer}>
          {reportsData.scans
            .filter(scan => {
              switch (reportsFilter) {
                case 'reparable':
                  return scan.status === 'Reparable';
                case 'beyondRepair':
                  return scan.status === 'Beyond Repair';
                case 'healthy':
                  return scan.status === 'Healthy';
                default:
                  return true; // Show all for 'all' filter
              }
            })
            .map((scan, index) => (
            <View key={index} style={styles.scanListItem}>
              <View style={[
                styles.scanStatusIndicator,
                { 
                  backgroundColor: scan.status === 'Reparable' ? '#dcfce7' : 
                                 scan.status === 'Healthy' ? '#dbeafe' : '#fee2e2' 
                }
              ]}>
                <Ionicons 
                  name={scan.status === 'Reparable' ? 'checkmark-circle' : 
                        scan.status === 'Healthy' ? 'shield-checkmark' : 'close-circle'} 
                  size={20} 
                  color={scan.status === 'Reparable' ? '#16a34a' : 
                         scan.status === 'Healthy' ? '#2563eb' : '#dc2626'} 
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
                { 
                  backgroundColor: scan.status === 'Reparable' ? '#dcfce7' : 
                                 scan.status === 'Healthy' ? '#dbeafe' : '#fee2e2' 
                }
              ]}>
                <Text style={[
                  styles.scanStatusText,
                  { 
                    color: scan.status === 'Reparable' ? '#16a34a' : 
                           scan.status === 'Healthy' ? '#2563eb' : '#dc2626' 
                  }
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
          <Text style={styles.emptyScansText}>
            {reportsFilter === 'all' 
              ? `No items found for this ${reportsView} period` 
              : `No ${reportsFilter} items found for this ${reportsView} period`
            }
          </Text>
        </View>
      )}

      {/* Daily report action (only show on Daily tab) */}
      {reportsView === 'daily' && (
        <View style={styles.dailyReportAction}>
          <TouchableOpacity
            style={[
              styles.dailyReportButton,
              isGeneratingDailyReport && styles.dailyReportButtonDisabled
            ]}
            onPress={handleGenerateDailyReport}
            activeOpacity={0.85}
            disabled={isGeneratingDailyReport}
          >
            <View style={[
              styles.dailyReportIconWrap,
              isGeneratingDailyReport && styles.dailyReportIconWrapDisabled
            ]}>
              {isGeneratingDailyReport ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="download-outline" size={20} color="#fff" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[
                styles.dailyReportTitle,
                isGeneratingDailyReport && styles.dailyReportTitleDisabled
              ]}>
                {isGeneratingDailyReport ? 'Generating...' : 'Generate Daily Report'}
              </Text>
              <Text style={[
                styles.dailyReportSubtitle,
                isGeneratingDailyReport && styles.dailyReportSubtitleDisabled
              ]}>
                {isGeneratingDailyReport ? 'Please wait...' : 'Create PDF for today and share'}
              </Text>
            </View>
            {!isGeneratingDailyReport && (
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      )}


      {reportsView === 'weekly' && (
  <View style={styles.dailyReportAction}>
    <TouchableOpacity
      style={[
        styles.dailyReportButton,
        isGeneratingWeeklyReport && styles.dailyReportButtonDisabled
      ]}
      onPress={handleGenerateWeeklyReport}
      activeOpacity={0.85}
      disabled={isGeneratingWeeklyReport}
    >
      <View style={[
        styles.dailyReportIconWrap,
        isGeneratingWeeklyReport && styles.dailyReportIconWrapDisabled
      ]}>
        {isGeneratingWeeklyReport ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="download-outline" size={20} color="#fff" />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[
          styles.dailyReportTitle,
          isGeneratingWeeklyReport && styles.dailyReportTitleDisabled
        ]}>
          {isGeneratingWeeklyReport ? 'Generating...' : 'Generate Weekly Report'}
        </Text>
        <Text style={[
          styles.dailyReportSubtitle,
          isGeneratingWeeklyReport && styles.dailyReportSubtitleDisabled
        ]}>
          {isGeneratingWeeklyReport ? 'Please wait...' : 'Create PDF for this week and share'}
        </Text>
      </View>
      {!isGeneratingWeeklyReport && (
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      )}
    </TouchableOpacity>
  </View>
)}
 
    {reportsView === 'monthly' && (
  <View style={styles.dailyReportAction}>
    <TouchableOpacity
      style={[
        styles.dailyReportButton,
        isGeneratingMonthlyReport && styles.dailyReportButtonDisabled
      ]}
      onPress={handleGenerateMonthlyReport}
      activeOpacity={0.85}
      disabled={isGeneratingMonthlyReport}
    >
      <View style={[
        styles.dailyReportIconWrap,
        isGeneratingMonthlyReport && styles.dailyReportIconWrapDisabled
      ]}>
        {isGeneratingMonthlyReport ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="download-outline" size={20} color="#fff" />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[
          styles.dailyReportTitle,
          isGeneratingMonthlyReport && styles.dailyReportTitleDisabled
        ]}>
          {isGeneratingMonthlyReport ? 'Generating...' : 'Generate Monthly Report'}
        </Text>
        <Text style={[
          styles.dailyReportSubtitle,
          isGeneratingMonthlyReport && styles.dailyReportSubtitleDisabled
        ]}>
          {isGeneratingMonthlyReport ? 'Please wait...' : 'Create PDF for this month and share'}
        </Text>
      </View>
      {!isGeneratingMonthlyReport && (
        <Ionicons name="arrow-forward" size={18} color="#fff" />
      )}
    </TouchableOpacity>
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
            <TouchableOpacity 
              style={styles.viewAllButton}
              onPress={loadAllScans}
              disabled={loadingMore}
            >
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
                        { 
                          backgroundColor: scan.status === 'Reparable' ? '#dcfce7' : 
                                         scan.status === 'Healthy' ? '#dbeafe' : '#fee2e2' 
                        }
                      ]}>
                        <Ionicons 
                          name={scan.status === 'Reparable' ? 'checkmark-circle' : 
                                scan.status === 'Healthy' ? 'shield-checkmark' : 'close-circle'} 
                          size={20} 
                          color={scan.status === 'Reparable' ? '#16a34a' : 
                                 scan.status === 'Healthy' ? '#2563eb' : '#dc2626'} 
                        />
                      </View>
                      
                      <View style={styles.scanDetails}>
                        <View style={styles.scanHeader}>
                          <Text style={styles.scanBarcode}>
                            {scan.barcode}
                          </Text>
                          <View style={[
                            styles.scanStatusBadge,
                            { 
                              backgroundColor: scan.status === 'Reparable' ? '#dcfce7' : 
                                             scan.status === 'Healthy' ? '#dbeafe' : '#fee2e2' 
                            }
                          ]}>
                            <Text style={[
                              styles.scanStatusText,
                              { 
                                color: scan.status === 'Reparable' ? '#16a34a' : 
                                       scan.status === 'Healthy' ? '#2563eb' : '#dc2626' 
                              }
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
                            <Text style={styles.scanMetaText}>Item ID</Text>
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

      <Modal
        visible={rfidModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRfidModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRfidModalVisible(false)}>
          <Pressable style={styles.rfidModalCard} onPress={() => {}}>
            <View style={styles.rfidModalHeader}>
              <View style={styles.rfidModalTitleRow}>
                <View style={styles.rfidModalIconWrap}>
                  <Ionicons name="hardware-chip-outline" size={28} color="#0f766e" />
                </View>
                <View style={styles.rfidModalTextBlock}>
                  <Text style={styles.rfidModalTitle}>RFID Asset Management</Text>
                  <Text style={styles.rfidModalDescription}>
                    Choose a workflow to manage assets and RFID tags.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.rfidModalCloseButton}
                onPress={() => setRfidModalVisible(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="close" size={20} color="#475569" />
              </TouchableOpacity>
            </View>

            <View style={styles.rfidOptionsList}>
              <TouchableOpacity
                style={styles.rfidOptionCard}
                onPress={() => handleRfidOptionPress('Add Asset')}
                activeOpacity={0.85}
              >
                <View style={[styles.rfidOptionIconWrap, styles.rfidOptionIconEmerald]}>
                  <Ionicons name="cube-outline" size={22} color="#047857" />
                </View>
                <View style={styles.rfidOptionTextWrap}>
                  <Text style={styles.rfidOptionTitle}>Add Asset</Text>
                  <Text style={styles.rfidOptionSubtitle}>Create a new asset record for future tagging.</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rfidOptionCard}
                onPress={() => handleRfidOptionPress('Assign Tags')}
                activeOpacity={0.85}
              >
                <View style={[styles.rfidOptionIconWrap, styles.rfidOptionIconTeal]}>
                  <Ionicons name="pricetag-outline" size={22} color="#0f766e" />
                </View>
                <View style={styles.rfidOptionTextWrap}>
                  <Text style={styles.rfidOptionTitle}>Assign Tags</Text>
                  <Text style={styles.rfidOptionSubtitle}>Link RFID tags to existing assets.</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rfidOptionCard}
                onPress={() => handleRfidOptionPress('Verify Asset')}
                activeOpacity={0.85}
              >
                <View style={[styles.rfidOptionIconWrap, styles.rfidOptionIconBlue]}>
                  <Ionicons name="shield-checkmark-outline" size={22} color="#1d4ed8" />
                </View>
                <View style={styles.rfidOptionTextWrap}>
                  <Text style={styles.rfidOptionTitle}>Verify Asset</Text>
                  <Text style={styles.rfidOptionSubtitle}>Confirm the correct tag is associated with an asset.</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rfidOptionCard}
                onPress={() => handleRfidOptionPress('Search Asset')}
                activeOpacity={0.85}
              >
                <View style={[styles.rfidOptionIconWrap, styles.rfidOptionIconAmber]}>
                  <Ionicons name="search-outline" size={22} color="#b45309" />
                </View>
                <View style={styles.rfidOptionTextWrap}>
                  <Text style={styles.rfidOptionTitle}>Search Asset</Text>
                  <Text style={styles.rfidOptionSubtitle}>Find an asset or tag from the RFID workspace.</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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
              <Text style={styles.modalTitle}>Device RFID Entry</Text>
              <Text style={styles.modalSubtitle}>Barcode will appear below here</Text>
            </View>
            
            <TextInput
              style={styles.inputField}
              placeholder="Receiving..."
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
        <Text style={styles.headerTitle}>Item Assessment</Text>
        <Text style={styles.headerBarcode}>📦 {scannedBarcode}</Text>
      </View>

      {/* Instructions */}
      <Text style={styles.instructions}>
        Please select the correct condition for this item.
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

        {/* Healthy */}
        <TouchableOpacity
          style={[styles.actionButton, styles.healthy]}
          onPress={() => handleStatusSelect('Healthy')}
          disabled={!!savingStatus}
          activeOpacity={0.85}
        >
          <View style={styles.iconWrapper}>
            {savingStatus === 'Healthy' ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : savedStatus === 'Healthy' ? (
              <Ionicons name="checkmark-circle" size={26} color="#fff" />
            ) : (
              <Ionicons name="shield-checkmark-outline" size={26} color="#fff" />
            )}
          </View>
          <Text style={styles.buttonText}>Healthy</Text>
          <Text style={styles.buttonSubtext}>No issues found</Text>
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
              <Text style={styles.modalSubtitle}>Create and share a PDF report of all your items</Text>
            </View>
            
            <Text style={styles.modalDescription}>
              This will generate a comprehensive PDF report containing all your item data, including barcodes, status, dates, and times. The report will be shared and you can then send it to the admin email address.
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

      {/* End Session Summary Modal */}
      <Modal
        visible={endSessionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setEndSessionModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sessionEndModal}>
            <View style={{ alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="checkmark-done-circle" size={40} color="#10b981" />
              <Text style={styles.modalTitle}>Session Ended</Text>
              <Text style={styles.modalSubtitle}>Here is your session summary</Text>
            </View>
            <View style={styles.sessionSummaryRow}>
              <Text style={styles.sessionSummaryLabel}>Total items</Text>
              <Text style={styles.sessionSummaryValue}>{screensScanned}</Text>
            </View>
            <View style={styles.sessionSummaryRow}>
              <Text style={styles.sessionSummaryLabel}>Reparable</Text>
              <Text style={styles.sessionSummaryValue}>{reparable}</Text>
            </View>
            <View style={styles.sessionSummaryRow}>
              <Text style={styles.sessionSummaryLabel}>Beyond Repair</Text>
              <Text style={styles.sessionSummaryValue}>{beyondRepair}</Text>
            </View>
            <View style={styles.sessionSummaryRow}>
              <Text style={styles.sessionSummaryLabel}>Non Defective</Text>
              <Text style={styles.sessionSummaryValue}>{healthy}</Text>
            </View>
            <View style={styles.sessionSummaryRow}>
              <Text style={styles.sessionSummaryLabel}>Duration</Text>
              <Text style={styles.sessionSummaryValue}>{formatElapsedTime(elapsedMilliseconds)}</Text>
            </View>

            <TouchableOpacity
              style={[styles.modalButton, styles.submitButton, { minHeight: 40, justifyContent: 'center' }]}
              onPress={async () => {
                setModalButtonLoading(true);
                // Add a small delay to show loading state
                await new Promise(resolve => setTimeout(resolve, 1000));
                setModalButtonLoading(false);
                setEndSessionModalVisible(false);
              }}
              disabled={modalButtonLoading}
            >
              {modalButtonLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.submitButtonText, { fontSize: 12, fontWeight: 'bold' }]}>Done</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
              </Modal>




























        {/* Defective Screens Modal */}
        <Modal
          visible={defectiveScreensModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDefectiveScreensModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Defective Items</Text>
                <TouchableOpacity 
                  onPress={() => setDefectiveScreensModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.defectiveOptions}>
                <TouchableOpacity 
                  style={styles.defectiveOption}
                  onPress={() => {
                    handleDefectiveTypeSelect('Reparable');
                    setDefectiveScreensModalVisible(false);
                  }}
                >
                  <View style={styles.optionIcon}>
                    <Ionicons name="construct-outline" size={24} color="#10b981" />
                  </View>
                  <Text style={styles.optionTitle}>Reparable</Text>
                  <Text style={styles.optionCount}>{reparable} items</Text>
                  <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.defectiveOption}
                  onPress={() => {
                    handleDefectiveTypeSelect('Beyond Repair');
                    setDefectiveScreensModalVisible(false);
                  }}
                >
                  <View style={styles.optionIcon}>
                    <Ionicons name="close-circle-outline" size={24} color="#ef4444" />
                  </View>
                  <Text style={styles.optionTitle}>Beyond Repair </Text>
                  <Text style={styles.optionCount}>{beyondRepair} items</Text>
                  <Ionicons name="chevron-forward" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Non-Defective Screens Modal */}
        <Modal
          visible={nonDefectiveScreensModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setNonDefectiveScreensModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.healthyModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Non-Defective Items</Text>
                <TouchableOpacity 
                  onPress={() => setNonDefectiveScreensModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                style={styles.healthyScreensList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.healthyScreensListContent}
              >
                <Text style={styles.healthyScreensTitle}>Healthy Items ({healthy})</Text>
                {scans.filter(scan => scan.status === 'Healthy').map((scan, index) => (
                  <View key={index} style={styles.healthyScreenItem}>
                    <View style={styles.screenInfo}>
                      <Text style={styles.screenBarcode}>{scan.barcode}</Text>
                      <Text style={styles.screenDate}>{new Date(scan.date).toLocaleDateString()}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.productionButton}
                      disabled={actionStatusById[`${scan.barcode}-PRODUCTION`] === 'loading'}
                      onPress={async () => {
                        const key = `${scan.barcode}-PRODUCTION`;
                        setActionStatusById(prev => ({ ...prev, [key]: 'loading' }));
                        const ok = await notifyAdminOfScreenAction({
                          barcode: scan.barcode,
                          status: scan.status,
                          actionType: 'PRODUCTION',
                          scannedAt: scan.date,
                          sessionId: currentSessionId, // Add the current session ID
                        });
                        if (ok) {
                          setActionStatusById(prev => ({ ...prev, [key]: 'success' }));
                          setTimeout(() => setActionStatusById(prev => ({ ...prev, [key]: 'idle' })), 1500);
                        } else {
                          setActionStatusById(prev => ({ ...prev, [key]: 'idle' }));
                        }
                      }}
                    >
                      {actionStatusById[`${scan.barcode}-PRODUCTION`] === 'loading' ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : actionStatusById[`${scan.barcode}-PRODUCTION`] === 'success' ? (
                        <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                      ) : (
                        <Ionicons name="rocket-outline" size={20} color="#10b981" />
                      )}
                      <Text style={styles.productionButtonText}>Send to Production</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {scans.filter(scan => scan.status === 'Healthy').length === 0 && (
                  <Text style={styles.noHealthyScreens}>No healthy items found</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Repairable Screens Modal */}
        <Modal
          visible={selectedDefectiveType === 'Reparable'}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedDefectiveType(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.repairableModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Repairable Items</Text>
                <TouchableOpacity 
                  onPress={() => setSelectedDefectiveType(null)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                style={styles.repairableScreensList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.repairableScreensListContent}
              >
                <Text style={styles.repairableScreensTitle}>Repairable Items ({reparable})</Text>
                {scans.filter(scan => scan.status === 'Reparable').map((scan, index) => (
                  <View key={index} style={styles.repairableScreenItem}>
                    <View style={styles.screenInfo}>
                      <Text style={styles.screenBarcode}>{scan.barcode}</Text>
                      <Text style={styles.screenDate}>{new Date(scan.date).toLocaleDateString()}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.repairButton}
                      disabled={actionStatusById[`${scan.barcode}-REPAIR`] === 'loading'}
                      onPress={async () => {
                        const key = `${scan.barcode}-REPAIR`;
                        setActionStatusById(prev => ({ ...prev, [key]: 'loading' }));
                        const ok = await notifyAdminOfScreenAction({
                          barcode: scan.barcode,
                          status: scan.status,
                          actionType: 'REPAIR',
                          scannedAt: scan.date,
                          sessionId: currentSessionId, // Add the current session ID
                        });
                        if (ok) {
                          setActionStatusById(prev => ({ ...prev, [key]: 'success' }));
                          setTimeout(() => setActionStatusById(prev => ({ ...prev, [key]: 'idle' })), 1500);
                        } else {
                          setActionStatusById(prev => ({ ...prev, [key]: 'idle' }));
                        }
                      }}
                    >
                      {actionStatusById[`${scan.barcode}-REPAIR`] === 'loading' ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : actionStatusById[`${scan.barcode}-REPAIR`] === 'success' ? (
                        <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                      ) : (
                        <Ionicons name="construct-outline" size={20} color="#06b6d4" />
                      )}
                      <Text style={styles.repairButtonText}>Send for Repair</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {scans.filter(scan => scan.status === 'Reparable').length === 0 && (
                  <Text style={styles.noRepairableScreens}>No repairable items found</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Beyond Repair Screens Modal */}
        <Modal
          visible={selectedDefectiveType === 'Beyond Repair'}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedDefectiveType(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.beyondRepairModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Beyond Repair Items</Text>
                <TouchableOpacity 
                  onPress={() => setSelectedDefectiveType(null)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                style={styles.beyondRepairScreensList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.beyondRepairScreensListContent}
              >
                <Text style={styles.beyondRepairScreensTitle}>Beyond Repair Items ({beyondRepair})</Text>
                {scans.filter(scan => scan.status === 'Beyond Repair').map((scan, index) => (
                  <View key={index} style={styles.beyondRepairScreenItem}>
                    <View style={styles.screenInfo}>
                      <Text style={styles.screenBarcode}>{scan.barcode}</Text>
                      <Text style={styles.screenDate}>{new Date(scan.date).toLocaleDateString()}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.writeOffButton}
                      disabled={actionStatusById[`${scan.barcode}-WRITE_OFF`] === 'loading'}
                      onPress={async () => {
                        const key = `${scan.barcode}-WRITE_OFF`;
                        setActionStatusById(prev => ({ ...prev, [key]: 'loading' }));
                        const ok = await notifyAdminOfScreenAction({
                          barcode: scan.barcode,
                          status: scan.status,
                          actionType: 'WRITE_OFF',
                          scannedAt: scan.date,
                          sessionId: currentSessionId, // Add the current session ID
                        });
                        if (ok) {
                          setActionStatusById(prev => ({ ...prev, [key]: 'success' }));
                          setTimeout(() => setActionStatusById(prev => ({ ...prev, [key]: 'idle' })), 1500);
                        } else {
                          setActionStatusById(prev => ({ ...prev, [key]: 'idle' }));
                        }
                      }}
                    >
                      {actionStatusById[`${scan.barcode}-WRITE_OFF`] === 'loading' ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : actionStatusById[`${scan.barcode}-WRITE_OFF`] === 'success' ? (
                        <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
                      ) : (
                        <Ionicons name="close-circle-outline" size={20} color="#06b6d4" />
                      )}
                      <Text style={styles.writeOffButtonText}>Write-Off</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {scans.filter(scan => scan.status === 'Beyond Repair').length === 0 && (
                  <Text style={styles.noBeyondRepairScreens}>No beyond repair items found</Text>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Delete Screens Modal */}
        <Modal
          visible={deleteModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.deleteModalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Manage Items</Text>
                <TouchableOpacity 
                  onPress={() => setDeleteModalVisible(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
              
              <ScrollView 
                style={styles.deleteScreensList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.deleteScreensListContent}
              >
                <Text style={styles.deleteScreensTitle}>All Items ({scans.length})</Text>
                <Text style={styles.deleteScreensSubtitle}>Select items to delete</Text>
                
                {scans.map((scan, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.deleteScreenItem,
                      selectedScreensForDelete.has(scan.barcode) && styles.selectedDeleteScreenItem
                    ]}
                    onPress={() => handleScreenSelection(scan.barcode)}
                  >
                    <View style={styles.deleteScreenInfo}>
                      <Text style={styles.deleteScreenBarcode}>{scan.barcode}</Text>
                      <Text style={styles.deleteScreenDate}>{new Date(scan.date).toLocaleDateString()}</Text>
                      <View style={[
                        styles.deleteScreenStatus,
                        scan.status === 'Reparable' && styles.reprableStatus,
                        scan.status === 'Beyond Repair' && styles.beyondRepairStatus,
                        scan.status === 'Healthy' && styles.healthyStatus
                      ]}>
                        <Text style={styles.deleteScreenStatusText}>{scan.status}</Text>
                      </View>
                    </View>
                    <View style={styles.deleteScreenCheckbox}>
                      {selectedScreensForDelete.has(scan.barcode) ? (
                        <Ionicons name="checkmark-circle" size={24} color="#6366f1" />
                      ) : (
                        <Ionicons name="ellipse-outline" size={24} color="#cbd5e1" />
                      )}
                    </View>
                  </TouchableOpacity>
                ))}
                
                {scans.length === 0 && (
                  <Text style={styles.noScreensToDelete}>No items found</Text>
                )}
              </ScrollView>
              
              <View style={styles.deleteModalFooter}>
                <TouchableOpacity
                  style={styles.cancelDeleteButton}
                  onPress={() => {
                    setSelectedScreensForDelete(new Set());
                    setDeleteModalVisible(false);
                  }}
                >
                  <Text style={styles.cancelDeleteButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.deleteSelectedButton,
                    selectedScreensForDelete.size === 0 && styles.deleteSelectedButtonDisabled
                  ]}
                  onPress={() => {
                    if (selectedScreensForDelete.size > 0) {
                      setConfirmDeleteModalVisible(true);
                    }
                  }}
                  disabled={selectedScreensForDelete.size === 0}
                >
                  <Text style={styles.deleteSelectedButtonText}>
                    Delete Selected ({selectedScreensForDelete.size})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Confirm Delete Modal */}
        <Modal
          visible={confirmDeleteModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setConfirmDeleteModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmDeleteModalContent}>
              <View style={styles.confirmDeleteIconContainer}>
                <Ionicons name="warning" size={48} color="#ef4444" />
              </View>
              <Text style={styles.confirmDeleteTitle}>Confirm Deletion</Text>
              <Text style={styles.confirmDeleteMessage}>
                Are you sure you want to delete {selectedScreensForDelete.size} selected item(s)? This action cannot be undone.
              </Text>
              
              <View style={styles.confirmDeleteButtons}>
                <TouchableOpacity
                  style={styles.cancelConfirmButton}
                  onPress={() => setConfirmDeleteModalVisible(false)}
                >
                  <Text style={styles.cancelConfirmButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.confirmDeleteButton}
                  onPress={handleDeleteScreens}
                  disabled={isDeletingScreens}
                >
                  {isDeletingScreens ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.confirmDeleteButtonText}>Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Notification Modal */}
        <Modal
          visible={notificationModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setNotificationModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.notificationModalContent}>
              <View style={styles.notificationModalHeader}>
                <View style={styles.notificationHeaderLeft}>
                  <Ionicons name="notifications" size={24} color="#6366f1" />
                  <TouchableOpacity
                    style={styles.markAsReadButton}
                    onPress={() => {
                      // Clear notification count when tick is clicked
                      setNotificationCount(0);
                      setUnreadNotifications(new Set());
                      // Save to AsyncStorage
                      AsyncStorage.setItem('unreadNotifications', JSON.stringify([])).catch(error => {
                        console.error('❌ Failed to clear notification count:', error);
                      });
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.markAsReadIcon}>✅</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.notificationHeaderRight}>
                  <TouchableOpacity 
                    style={styles.notificationCloseButton}
                    onPress={() => setNotificationModalVisible(false)}
                  >
                    <Ionicons name="close" size={24} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Real-time Statistics Summary */}
              <View style={styles.dailySummaryContainer}>
                <Text style={styles.dailySummaryTitle}>📊 Current Session Statistics</Text>
                <View style={styles.dailySummaryGrid}>
                  <View style={styles.dailySummaryItem}>
                    <Text style={styles.dailySummaryNumber}>{screensScanned}</Text>
                    <Text style={styles.dailySummaryLabel}>Total Items</Text>
                  </View>
                  <View style={styles.dailySummaryItem}>
                    <Text style={styles.dailySummaryNumber}>{healthy}</Text>
                    <Text style={styles.dailySummaryLabel}>Healthy</Text>
                  </View>
                  <View style={styles.dailySummaryItem}>
                    <Text style={styles.dailySummaryNumber}>{reparable}</Text>
                    <Text style={styles.dailySummaryLabel}>Reparable</Text>
                  </View>
                  <View style={styles.dailySummaryItem}>
                    <Text style={styles.dailySummaryNumber}>{beyondRepair}</Text>
                    <Text style={styles.dailySummaryLabel}>Beyond Repair</Text>
                  </View>
                </View>
              </View>

              {/* Real-time Notifications List */}
              <View style={styles.notificationsListContainer}>
                <Text style={styles.notificationsListTitle}>📢 Action Required Notifications</Text>
                {getRealTimeNotifications().length === 0 ? (
                  <View style={styles.emptyNotificationsContainer}>
                    <Ionicons name="checkmark-circle" size={48} color="#10b981" />
                    <Text style={styles.emptyNotificationsText}>All caught up!</Text>
                    <Text style={styles.emptyNotificationsSubtext}>No pending actions required</Text>
                  </View>
                ) : (
                  <FlatList
                    data={getRealTimeNotifications()}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        style={[
                          styles.notificationItem,
                          item.priority === 'high' && styles.highPriorityNotificationItem,
                          item.priority === 'medium' && styles.mediumPriorityNotificationItem
                        ]}
                        onPress={() => {
                          // Handle different notification actions
                          switch(item.id) {
                            case 'healthy-screens':
                              setNotificationModalVisible(false);
                              setNonDefectiveScreensModalVisible(true);
                              break;
                            case 'reparable-screens':
                              setNotificationModalVisible(false);
                              setSelectedDefectiveType('Reparable');
                              setDefectiveScreensModalVisible(true);
                              break;
                            case 'beyond-repair-screens':
                              setNotificationModalVisible(false);
                              setSelectedDefectiveType('Beyond Repair');
                              setDefectiveScreensModalVisible(true);
                              break;
                            case 'active-session':
                              setNotificationModalVisible(false);
                              // Could trigger session end
                              break;
                            case 'report-reminder':
                              setNotificationModalVisible(false);
                              setReportModalVisible(true);
                              break;
                            default:
                              // Just close modal for other notifications
                              setNotificationModalVisible(false);
                          }
                        }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.notificationIconContainer}>
                          <Ionicons 
                            name={getNotificationIcon(item.type)} 
                            size={24} 
                            color={getNotificationColor(item.type)} 
                          />
                        </View>
                        <View style={styles.notificationContent}>
                          <Text style={styles.notificationTitle}>{item.title}</Text>
                          <Text style={styles.notificationMessage}>{item.message}</Text>
                          <View style={styles.notificationActionContainer}>
                            <Text style={styles.notificationActionText}>{item.action}</Text>
                            {item.count && (
                              <View style={styles.notificationCountBadge}>
                                <Text style={styles.notificationCountText}>{item.count}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={styles.notificationArrow}>
                          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                        </View>
                      </TouchableOpacity>
                    )}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.notificationsListContent}
                  />
                )}
              </View>

              {/* OK Button */}
              <TouchableOpacity
                style={styles.notificationOkButton}
                onPress={() => setNotificationModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.notificationOkButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Professional Reminder Modal */}
        <Modal
          visible={reminderModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setReminderModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.reminderModalContent}>
              {/* Reminder Header */}
              <View style={styles.reminderHeader}>
                <View style={styles.reminderIconContainer}>
                  <Ionicons name="notifications-circle" size={48} color="#3b82f6" />
                </View>
                <Text style={styles.reminderTitle}>
                  {isLogoutReminder ? '🚪 LOGOUT REMINDER' : '📋 PROFESSIONAL REMINDER'}
                </Text>
                <Text style={styles.reminderSubtitle}>
                  {isLogoutReminder ? 'Final Workflow Check Before Logout' : 'Amrod Workflow Management'}
                </Text>
              </View>

              {/* Reminder Content */}
              <ScrollView 
                style={styles.reminderScrollView}
                showsVerticalScrollIndicator={true}
                contentContainerStyle={styles.reminderScrollContent}
                bounces={true}
              >
                <Text style={styles.reminderMessage}>
                  Dear Technician,
                </Text>
                
                <Text style={styles.reminderMessage}>
                  This is a <Text style={styles.highlightText}>friendly professional reminder</Text> to ensure optimal workflow management and data integrity:
                </Text>

                <View style={styles.reminderSection}>
                  <Text style={styles.reminderSectionTitle}>📢 ADMIN NOTIFICATION REQUIREMENTS:</Text>
                  <View style={styles.reminderItem}>
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    <Text style={styles.reminderText}>Notify Admin about <Text style={styles.highlightText}>Items Ready for Production</Text></Text>
                  </View>
                  <View style={styles.reminderItem}>
                    <Ionicons name="construct" size={20} color="#f59e0b" />
                    <Text style={styles.reminderText}>Notify Admin about <Text style={styles.highlightText}>Items Needing Repair</Text></Text>
                  </View>
                  <View style={styles.reminderItem}>
                    <Ionicons name="close-circle" size={20} color="#ef4444" />
                    <Text style={styles.reminderText}>Notify Admin about <Text style={styles.highlightText}>Items to be Written Off</Text></Text>
                  </View>
                </View>

                <View style={styles.reminderSection}>
                  <Text style={styles.reminderSectionTitle}>📊 REPORT GENERATION ESSENTIALS:</Text>
                  <View style={styles.reminderItem}>
                    <Ionicons name="calendar" size={20} color="#3b82f6" />
                    <Text style={styles.reminderText}>Generate <Text style={styles.highlightText}>Daily Reports</Text> for daily work summary</Text>
                  </View>
                  <View style={styles.reminderItem}>
                    <Ionicons name="calendar-outline" size={20} color="#8b5cf6" />
                    <Text style={styles.reminderText}>Generate <Text style={styles.highlightText}>Weekly Reports</Text> for comprehensive analysis</Text>
                  </View>
                </View>

                <View style={styles.reminderSection}>
                  <Text style={styles.reminderSectionTitle}>⚠️ DATABASE MAINTENANCE ALERT:</Text>
                  <View style={styles.reminderItem}>
                    <Ionicons name="warning" size={20} color="#f59e0b" />
                    <Text style={styles.reminderText}>Admin and Monitors <Text style={styles.highlightText}>clean the database every 7 days</Text></Text>
                  </View>
                  <View style={styles.reminderItem}>
                    <Ionicons name="shield-checkmark" size={20} color="#10b981" />
                    <Text style={styles.reminderText}>This prevents database <Text style={styles.highlightText}>congestion and exhaustion</Text></Text>
                  </View>
                </View>

                <View style={styles.reminderSection}>
                  <Text style={styles.reminderSectionTitle}>💾 DATA PROTECTION RECOMMENDATIONS:</Text>
                  <View style={styles.reminderItem}>
                    <Ionicons name="download" size={20} color="#06b6d4" />
                    <Text style={styles.reminderText}><Text style={styles.highlightText}>Generate and download</Text> your reports regularly</Text>
                  </View>
                  <View style={styles.reminderItem}>
                    <Ionicons name="save" size={20} color="#8b5cf6" />
                    <Text style={styles.reminderText}><Text style={styles.highlightText}>Store reports securely</Text> to avoid work loss</Text>
                  </View>
                  <View style={styles.reminderItem}>
                    <Ionicons name="document-text" size={20} color="#10b981" />
                    <Text style={styles.reminderText}>This ensures <Text style={styles.highlightText}>proof of your work</Text> and prevents confusion</Text>
                  </View>
                </View>

                <Text style={styles.reminderMessage}>
                  <Text style={styles.highlightText}>Thank you for your attention to these important workflow requirements.</Text> Your diligence ensures smooth operations and data integrity.
                </Text>

                <Text style={styles.reminderMessage}>
                  {isLogoutReminder 
                    ? 'Please ensure you have completed all necessary tasks before logging out. Thank you for your attention to these important workflow requirements.'
                    : 'This reminder will appear every 30 minutes to keep you informed and compliant with our professional standards.'
                  }
                </Text>
              </ScrollView>

              {/* Acknowledge Button */}
              <TouchableOpacity 
                style={styles.reminderAcknowledgeButton}
                onPress={isLogoutReminder ? handleLogoutConfirm : () => setReminderModalVisible(false)}
                activeOpacity={0.8}
              >
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.reminderAcknowledgeButtonText}>
                  {isLogoutReminder ? 'I UNDERSTAND & LOGOUT' : 'I UNDERSTAND & ACKNOWLEDGE'}
                </Text>
              </TouchableOpacity>
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
    paddingVertical:16,
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
healthy: {
  backgroundColor: '#3b82f6', // blue
},
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  sessionEmoji: {
    fontSize: 24,
    marginRight: 8,
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
filterButtonsContainer: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginVertical: 12,
  backgroundColor: '#f8fafc',
  borderRadius: 8,
  padding: 4,
},
filterButton: {
  flex: 1,
  paddingVertical: 8,
  borderRadius: 6,
  alignItems: 'center',
  marginHorizontal: 2,
},
activeFilterButton: {
  backgroundColor: '#6366f1',
},
filterButtonText: {
  fontSize: 12,
  fontWeight: '500',
  color: '#64748b',
},
activeFilterButtonText: {
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
//text for summary scann!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
modalButton: {
  backgroundColor: '#6366f1',
  paddingVertical: 5,
  paddingHorizontal: 32,
  borderRadius: 1,
  shadowColor: '#6366f1',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.3,
  shadowRadius: 16,
  elevation: 8,
  minWidth: 50,
},
modalButtonText: {
  color: '#fff',
  fontSize: 12,
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
    fontStyle: 'italic',
    color: '#616161',
  },
  logoutButton: {
    padding: 10,
    marginBottom: 10,
    
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 23,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 3,
    borderColor: '#06b6d4',
  },
  avatar: {
    fontSize: 42,
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10b981',
    borderWidth: 3,
    borderColor: '#fff',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  userRole: {
    fontSize: 12,
    color: '#475569',
    marginBottom: 8,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  userMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 1,
    marginBottom: 4,
  },
  userMetaText: {
    fontSize: 13,
    color: '#424242',
    marginLeft: 1,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  userDetails: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  userDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 130,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userDetailText: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 10,
    fontWeight: '600',
  },
  userCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  userCardBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  userCardBadgeText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '600',
    marginLeft: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    padding: 18,
    marginBottom: 8,
    
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
    
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#616161',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    
    color: '#212121',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statTrend: {
    fontSize: 12,
    color: '#4caf50', // Green for positive trend
    fontWeight: '600',
    alignItems: 'center',
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
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 20,
  },
  primaryActionButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#a5b4fc',
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 20,
    opacity: 0.7,
  },//88888888888888888888888888888888888888888888888888888888888888888888888888888888888
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    position: 'relative',
  },
  cameraButton: {
    backgroundColor: '#1976d2',
  },
  assetRfidButton: {
    backgroundColor: '#0f766e',
  },
  cameraButtonDisabled: {
    backgroundColor: 'rgba(107, 114, 128, 0.45)',
    borderWidth: 1,
    borderColor: 'rgba(107, 114, 128, 0.35)',
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
  scannerButtonIconDisabled: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  scannerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
  },
  scannerButtonTextDisabled: {
    color: 'rgba(255,255,255,0.8)',
  },
  scannerButtonSubtext: {
    fontSize: 12,
    color: '#b0bec5',
  },
  scannerButtonSubtextDisabled: {
    color: 'rgba(229,231,235,0.9)',
  },
  rfidModalCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    width: '100%',
    maxWidth: 420,
    padding: 22,
    shadowColor: '#0f172a',
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  rfidModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  rfidModalTitleRow: {
    flexDirection: 'row',
    flex: 1,
    paddingRight: 12,
  },
  rfidModalIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#ccfbf1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rfidModalTextBlock: {
    flex: 1,
  },
  rfidModalTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#0f172a',
  },
  rfidModalDescription: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    lineHeight: 19,
  },
  rfidModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rfidOptionsList: {
    gap: 12,
  },
  rfidOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rfidOptionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  rfidOptionIconEmerald: {
    backgroundColor: '#dcfce7',
  },
  rfidOptionIconTeal: {
    backgroundColor: '#ccfbf1',
  },
  rfidOptionIconBlue: {
    backgroundColor: '#dbeafe',
  },
  rfidOptionIconAmber: {
    backgroundColor: '#fef3c7',
  },
  rfidOptionTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  rfidOptionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  rfidOptionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  disabledBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(75, 85, 99, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  disabledBadgeText: {
    color: '#f9fafb',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  stopSessionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#dc3545',
    borderRadius: 12,
    paddingVertical: 20,
  },
  stopSessionButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fca5a5',
    borderRadius: 12,
    paddingVertical: 20,
    opacity: 0.7,
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
 
  scanHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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
 
 
  modalHeader: {
    alignItems: 'center',
    marginBottom: 15,
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
  // Daily report button styles (reuse report look, but compact)
  dailyReportAction: {
    marginTop: 12,
  },
  dailyReportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  dailyReportButtonDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#a5b4fc',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    opacity: 0.7,
  },
  dailyReportIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dailyReportIconWrapDisabled: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  dailyReportTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  dailyReportSubtitle: {
    fontSize: 12,
    color: '#E0E7FF',
  },
  dailyReportTitleDisabled: {
    fontSize: 15,
    fontWeight: '600',
    color: '#c7d2fe',
  },
  dailyReportSubtitleDisabled: {
    fontSize: 12,
    color: '#c7d2fe',
  },
  sessionEndModal: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '90%',
    maxWidth: 420,
  },
  sessionSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  sessionSummaryLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  sessionSummaryValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  
  // New styles for clickable stats modals
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
 
  defectiveOptions: {
    marginTop: 20,
  },
  defectiveOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  optionCount: {
    fontSize: 14,
    color: '#64748b',
    marginRight: 8,
  },
  healthyScreensList: {
    marginTop: 20,
  },
  healthyScreensTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  healthyScreenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  screenInfo: {
    flex: 1,
  },
  screenBarcode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  screenDate: {
    fontSize: 14,
    color: '#64748b',
  },
  productionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  productionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  noHealthyScreens: {
    textAlign: 'center',
    fontSize: 16,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 20,
  },
  
  // Additional styles for repairable and beyond repair screens
  repairableScreensList: {
    marginTop: 20,
  },
  repairableScreensTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  repairableScreenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  repairButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  repairButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  noRepairableScreens: {
    textAlign: 'center',
    fontSize: 16,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 20,
  },
  beyondRepairScreensList: {
    marginTop: 20,
  },
  beyondRepairScreensTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 16,
  },
  beyondRepairScreenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  beyondRepairBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  beyondRepairBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  writeOffButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  writeOffButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  noBeyondRepairScreens: {
    textAlign: 'center',
    fontSize: 16,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 20,
  },
  
  // New modal content styles for better scrolling and sizing
  repairableModalContent: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  beyondRepairModalContent: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  repairableScreensListContent: {
    paddingBottom: 20,
  },
  beyondRepairScreensListContent: {
    paddingBottom: 20,
  },
  healthyModalContent: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  healthyScreensListContent: {
    paddingBottom: 20,
  },
  
  // Delete modal styles
  deleteIconContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
  deleteModalContent: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  deleteScreensList: {
    maxHeight: 400,
  },
  deleteScreensListContent: {
    paddingBottom: 20,
  },
  deleteScreensTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  deleteScreensSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  deleteScreenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedDeleteScreenItem: {
    backgroundColor: '#eff6ff',
    borderColor: '#6366f1',
  },
  deleteScreenInfo: {
    flex: 1,
  },
  deleteScreenBarcode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  deleteScreenDate: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  deleteScreenStatus: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  reprableStatus: {
    backgroundColor: '#fef3c7',
  },
  beyondRepairStatus: {
    backgroundColor: '#fee2e2',
  },
  healthyStatus: {
    backgroundColor: '#dbeafe',
  },
  deleteScreenStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deleteScreenCheckbox: {
    marginLeft: 12,
  },
  deleteModalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelDeleteButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelDeleteButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  deleteSelectedButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
  },
  deleteSelectedButtonDisabled: {
    backgroundColor: '#fca5a5',
    opacity: 0.6,
  },
  deleteSelectedButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  noScreensToDelete: {
    textAlign: 'center',
    fontSize: 16,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 20,
  },
  confirmDeleteModalContent: {
    backgroundColor: '#fff',
    marginHorizontal: 40,
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  confirmDeleteIconContainer: {
    marginBottom: 16,
  },
  confirmDeleteTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  confirmDeleteMessage: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  confirmDeleteButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelConfirmButton: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
  },
  cancelConfirmButtonText: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Notification System Styles
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  notificationModalContent: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 24,
    maxHeight: '90%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  notificationModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  notificationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notificationModalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
  },
  markAsReadButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  markAsReadIcon: {
    fontSize: 18,
    fontWeight: '600',
  },
  notificationHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notificationActionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  notificationCloseButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  dailySummaryContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  dailySummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  dailySummaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dailySummaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  dailySummaryNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6366f1',
    marginBottom: 4,
  },
  dailySummaryLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  notificationsListContainer: {
    flex: 1,
    marginBottom: 20,
  },
  notificationsListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  emptyNotificationsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyNotificationsText: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 12,
    fontWeight: '500',
  },
  emptyNotificationsSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  notificationsListContent: {
    paddingBottom: 20,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  unreadNotificationItem: {
    backgroundColor: '#eff6ff',
    borderColor: '#6366f1',
  },
  notificationIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  notificationMessage: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 6,
    lineHeight: 18,
  },
  notificationTime: {
    fontSize: 12,
    color: '#94a3b8',
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6366f1',
    marginLeft: 8,
    marginTop: 4,
  },
  notificationOkButton: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  notificationOkButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // User Card Notification Styles
  userCardNotificationButton: {
    position: 'relative',
    padding: 8,
    marginLeft: 10,
  },
  notificationEmoji: {
    fontSize: 29,
    color: '#64748b',
    
    marginRight: 0,
  },
  userCardNotificationBadge: {
    position: 'absolute',
    top: 8,
    right: 20,
    backgroundColor: '#ef4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  userCardNotificationBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  // Reminder Modal Styles
  reminderModalContent: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    padding: 20,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  reminderHeader: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 20,
  },
  reminderIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  reminderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 5,
  },
  reminderSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  reminderScrollView: {
    flex: 1,
    marginBottom: 20,
  },
  reminderScrollContent: {
    paddingBottom: 10,
    alignItems: 'center',
  },
  reminderMessage: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  reminderSection: {
    marginVertical: 15,
    width: '100%',
  },
  reminderSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 10,
    textAlign: 'center',
  },
  reminderItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 10,
  },
  reminderText: {
    fontSize: 15,
    color: '#475569',
    marginLeft: 10,
    flexShrink: 1,
    lineHeight: 20,
  },
  reminderAcknowledgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 15,
    paddingHorizontal: 25,
    marginBottom: 20,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  reminderAcknowledgeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  // New notification styles
  highPriorityNotificationItem: {
    backgroundColor: '#fef2f2',
    borderColor: '#ef4444',
  },
  mediumPriorityNotificationItem: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  notificationActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  notificationActionText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '600',
  },
  notificationCountBadge: {
    backgroundColor: '#6366f1',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  notificationCountText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  notificationArrow: {
    marginLeft: 8,
  },
  highlightText: {
    fontWeight: '700',
    color: '#3b82f6',
  },
});
