import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { LocateAssetGuidanceState } from '../hooks/useLocateAssetGuidance';
import type { LocateAssetSignalState } from '../hooks/useLocateAssetSignalProcessor';
import SignalMeter from './SignalMeter';

type LocateAssetGuidancePanelProps = {
  guidance: LocateAssetGuidanceState;
  visible: boolean;
  feedbackMuted: boolean;
  foundLocked: boolean;
  onToggleFeedback: () => void;
  onConfirmFound: () => void;
  onReleaseFound: () => void;
};

const STATE_THEME: Record<
  LocateAssetSignalState,
  {
    color: string;
    backgroundColor: string;
    borderColor: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  far: {
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    borderColor: '#bfdbfe',
    icon: 'radio-outline',
  },
  medium: {
    color: '#ca8a04',
    backgroundColor: '#fefce8',
    borderColor: '#fde68a',
    icon: 'trending-up-outline',
  },
  close: {
    color: '#ea580c',
    backgroundColor: '#fff7ed',
    borderColor: '#fed7aa',
    icon: 'navigate-outline',
  },
  found: {
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    icon: 'locate',
  },
};

export default function LocateAssetGuidancePanel({
  guidance,
  visible,
  feedbackMuted,
  foundLocked,
  onToggleFeedback,
  onConfirmFound,
  onReleaseFound,
}: LocateAssetGuidancePanelProps) {
  if (!visible || !guidance.isActive) {
    return null;
  }

  const theme = STATE_THEME[guidance.signalState];
  const signalMeta = guidance.emaRssi === null
    ? `${guidance.stableReadCount} stable reads`
    : `EMA ${guidance.emaRssi.toFixed(0)} dBm`;
  const actionText = guidance.signalState === 'found'
    ? 'Confirm visually'
    : guidance.directionText;
  const canConfirmFound = guidance.signalState === 'found' && !foundLocked;
  const trailValues = guidance.signalTrail.length
    ? guidance.signalTrail
    : [0, 0, 0, 0, 0, 0];
  const rfMeta = [
    guidance.antenna === null ? null : `ANT ${guidance.antenna}`,
    guidance.phaseDrift > 0 ? `PHASE ${Math.round(guidance.phaseDrift)}` : null,
    guidance.frequency === null ? null : `${guidance.frequency.toFixed(1)} MHz`,
  ].filter(Boolean).join(' | ');

  const getTrailColor = (value: number) => {
    if (value >= 72) return '#ea580c';
    if (value >= 42) return '#ca8a04';
    if (value > 0) return '#2563eb';
    return '#cbd5e1';
  };

  return (
    <View
      style={[
        styles.overlay,
        {
          borderColor: theme.borderColor,
          backgroundColor: guidance.signalState === 'found'
            ? '#fff7f7'
            : 'rgba(255,255,255,0.96)',
        },
      ]}
    >
      <View style={styles.topRow}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: theme.backgroundColor,
              borderColor: theme.borderColor,
            },
          ]}
        >
          <Ionicons name={theme.icon} size={14} color={theme.color} />
          <Text style={[styles.statusText, { color: theme.color }]}>
            {guidance.statusLabel}
          </Text>
        </View>

        <SignalMeter
          signalState={guidance.signalState}
          strengthPercent={guidance.strengthPercent}
        />
      </View>

      <Text style={[styles.title, guidance.signalState === 'found' && styles.titleFound]}>
        {guidance.title}
      </Text>
      <Text style={styles.primaryText} numberOfLines={1}>
        {guidance.primaryText}
      </Text>
      <Text style={styles.secondaryText} numberOfLines={1}>
        {guidance.secondaryText} | {signalMeta}
      </Text>

      {guidance.signalLost ? (
        <View style={styles.signalLostRow}>
          <Ionicons name="alert-circle-outline" size={14} color="#b91c1c" />
          <Text style={styles.signalLostText} numberOfLines={1}>
            Signal lost. Rotate slowly or retrace your last stronger read.
          </Text>
        </View>
      ) : null}

      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>SIGNAL</Text>
          <Text style={styles.metricValue}>{guidance.strengthPercent}%</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>STATUS</Text>
          <Text style={[styles.metricValue, { color: theme.color }]}>
            {guidance.statusLabel}
          </Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>CONFIDENCE</Text>
          <Text style={styles.metricValue}>{guidance.confidence}%</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <Ionicons name="navigate-outline" size={14} color={theme.color} />
        <Text style={styles.actionText} numberOfLines={1}>
          ACTION: {actionText}
        </Text>
      </View>

      <View style={styles.trailHeader}>
        <Text style={styles.trailLabel}>TREND: {guidance.trendLabel}</Text>
        <Text style={styles.trailMeta}>
          {guidance.usingRssi ? 'RSSI EMA' : 'READ FALLBACK'}
        </Text>
      </View>

      <View style={styles.trailTrack}>
        {trailValues.map((value, index) => (
          <View
            key={`${index}-${value}`}
            style={[
              styles.trailSegment,
              {
                backgroundColor: getTrailColor(value),
                opacity: value > 0 ? 0.45 + value / 180 : 0.5,
              },
            ]}
          />
        ))}
      </View>

      {rfMeta ? (
        <Text style={styles.rfMetaText} numberOfLines={1}>
          {rfMeta}
        </Text>
      ) : null}

      <View style={styles.controlRow}>
        <TouchableOpacity
          style={styles.iconControl}
          onPress={onToggleFeedback}
          activeOpacity={0.8}
          accessibilityLabel={feedbackMuted ? 'Unmute locator feedback' : 'Mute locator feedback'}
        >
          <Ionicons
            name={feedbackMuted ? 'volume-mute-outline' : 'volume-high-outline'}
            size={16}
            color="#334155"
          />
          <Text style={styles.controlText}>
            {feedbackMuted ? 'Muted' : 'Sound'}
          </Text>
        </TouchableOpacity>

        {foundLocked ? (
          <TouchableOpacity
            style={[styles.lockControl, styles.lockControlActive]}
            onPress={onReleaseFound}
            activeOpacity={0.8}
            accessibilityLabel="Resume live locate guidance"
          >
            <Ionicons name="lock-closed-outline" size={15} color="#b91c1c" />
            <Text style={[styles.lockControlText, styles.lockControlTextActive]}>
              Locked
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.lockControl,
              !canConfirmFound && styles.lockControlDisabled,
            ]}
            onPress={onConfirmFound}
            activeOpacity={0.8}
            disabled={!canConfirmFound}
            accessibilityLabel="Confirm found asset"
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={15}
              color={canConfirmFound ? '#166534' : '#94a3b8'}
            />
            <Text style={[
              styles.lockControlText,
              !canConfirmFound && styles.lockControlTextDisabled,
            ]}
            >
              Confirm
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.zoneRow}>
        <View style={styles.zoneItem}>
          <Ionicons name="person-circle-outline" size={14} color="#475569" />
          <Text style={styles.zoneText} numberOfLines={1}>
            {guidance.staticZones.current}
          </Text>
        </View>
        <View style={styles.zoneItem}>
          <Ionicons name="business-outline" size={14} color="#475569" />
          <Text style={styles.zoneText} numberOfLines={1}>
            {guidance.staticZones.target}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    zIndex: 50,
    elevation: 8,
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  topRow: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    minHeight: 26,
    maxWidth: '58%',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 5,
    fontSize: 10,
    fontWeight: '900',
  },
  title: {
    marginTop: 7,
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  titleFound: {
    color: '#b91c1c',
  },
  primaryText: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  secondaryText: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  signalLostRow: {
    marginTop: 7,
    minHeight: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  signalLostText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 5,
    fontSize: 10,
    fontWeight: '800',
    color: '#991b1b',
  },
  metricsGrid: {
    marginTop: 8,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  metricItem: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 6,
    paddingVertical: 6,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  metricLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: '#64748b',
  },
  metricValue: {
    marginTop: 2,
    fontSize: 11,
    fontWeight: '900',
    color: '#0f172a',
  },
  actionRow: {
    marginTop: 8,
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionText: {
    flex: 1,
    minWidth: 0,
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '900',
    color: '#334155',
  },
  trailHeader: {
    marginTop: 7,
    minHeight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trailLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#334155',
  },
  trailMeta: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748b',
  },
  trailTrack: {
    height: 8,
    flexDirection: 'row',
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#e2e8f0',
  },
  trailSegment: {
    flex: 1,
    height: '100%',
  },
  rfMetaText: {
    marginTop: 5,
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
  },
  controlRow: {
    marginTop: 8,
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconControl: {
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  controlText: {
    marginLeft: 5,
    fontSize: 10,
    fontWeight: '900',
    color: '#334155',
  },
  lockControl: {
    flex: 1,
    minWidth: 0,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockControlActive: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  lockControlDisabled: {
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  lockControlText: {
    marginLeft: 5,
    fontSize: 10,
    fontWeight: '900',
    color: '#166534',
  },
  lockControlTextActive: {
    color: '#b91c1c',
  },
  lockControlTextDisabled: {
    color: '#94a3b8',
  },
  zoneRow: {
    marginTop: 8,
    minHeight: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  zoneItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  zoneText: {
    flex: 1,
    marginLeft: 4,
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
});
