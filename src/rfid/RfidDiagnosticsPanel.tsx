import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  RfidRuntimeDiagnostics,
  getRfidDiagnostics,
} from './chainwayRfid';

type RfidDiagnosticsPanelProps = {
  visible?: boolean;
  pollMs?: number;
};

const getInitialDiagnostics = () => getRfidDiagnostics();

export default function RfidDiagnosticsPanel({
  visible,
  pollMs = 2500,
}: RfidDiagnosticsPanelProps) {
  const [diagnostics, setDiagnostics] = useState<RfidRuntimeDiagnostics>(
    getInitialDiagnostics,
  );

  useEffect(() => {
    const refresh = () => setDiagnostics(getRfidDiagnostics());
    refresh();

    if (pollMs <= 0) {
      return;
    }

    const interval = setInterval(refresh, pollMs);
    return () => clearInterval(interval);
  }, [pollMs]);

  const shouldShow =
    visible ??
    Boolean(
      __DEV__ ||
        !diagnostics.nativeModuleAvailable ||
        diagnostics.receiverRegistered === false ||
        diagnostics.nativeVersionMatches === false,
    );

  if (!shouldShow) {
    return null;
  }

  const nativeStatus = diagnostics.nativeModuleAvailable ? 'Loaded' : 'Missing';
  const receiverStatus = diagnostics.receiverRegistered ? 'Registered' : 'Inactive';
  const lastEpc =
    diagnostics.lastJsReceivedEpc ||
    diagnostics.nativeDiagnostics?.lastEpc ||
    'None';
  const hasRuntimeIssue =
    !diagnostics.nativeModuleAvailable ||
    diagnostics.receiverRegistered === false ||
    diagnostics.nativeVersionMatches === false;

  return (
    <View style={[styles.panel, hasRuntimeIssue && styles.panelWarning]}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>RFID Runtime Diagnostics</Text>
          <Text style={styles.subtitle}>
            JS {diagnostics.jsBridgeVersion} / Native {diagnostics.nativeModuleVersion || 'missing'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => setDiagnostics(getRfidDiagnostics())}
          activeOpacity={0.8}
        >
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.grid}>
        <View style={styles.item}>
          <Text style={styles.label}>Native Module</Text>
          <Text style={styles.value}>{nativeStatus}</Text>
        </View>

        <View style={styles.item}>
          <Text style={styles.label}>Receiver</Text>
          <Text style={styles.value}>{receiverStatus}</Text>
        </View>

        <View style={styles.item}>
          <Text style={styles.label}>Broadcasts</Text>
          <Text style={styles.value}>
            {diagnostics.nativeDiagnostics?.broadcastCount ?? 0}
          </Text>
        </View>

        <View style={styles.item}>
          <Text style={styles.label}>Last EPC</Text>
          <Text style={styles.value} numberOfLines={1}>
            {lastEpc}
          </Text>
        </View>
      </View>

      {hasRuntimeIssue ? (
        <Text style={styles.warningText}>
          Rebuild and reinstall the Android dev client/APK if the native module is missing,
          stale, or inactive.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
  },
  panelWarning: {
    borderColor: '#f59e0b',
    backgroundColor: '#fffbeb',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: '#64748b',
  },
  refreshButton: {
    borderRadius: 6,
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  item: {
    minWidth: '47%',
    flexGrow: 1,
    borderRadius: 6,
    backgroundColor: '#f8fafc',
    padding: 10,
  },
  label: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  value: {
    marginTop: 4,
    fontSize: 13,
    color: '#0f172a',
    fontWeight: '700',
  },
  warningText: {
    marginTop: 12,
    fontSize: 12,
    lineHeight: 17,
    color: '#92400e',
  },
});
