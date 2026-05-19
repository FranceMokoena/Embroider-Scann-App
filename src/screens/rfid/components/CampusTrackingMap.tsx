import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { DimensionValue } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { CampusProximityState } from '../hooks/useCampusProximityTracker';
import { PRIMARY_BLUE } from '../../../theme/erpTheme';

type CampusTrackingMapProps = {
  isTracking: boolean;
  locationLabel: string;
  proximity: CampusProximityState;
};

export default function CampusTrackingMap({
  isTracking,
  locationLabel,
  proximity,
}: CampusTrackingMapProps) {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const guidanceAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isTracking) {
      pulseAnim.stopAnimation();
      guidanceAnim.stopAnimation();
      pulseAnim.setValue(0);
      guidanceAnim.setValue(0);
      return;
    }

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );

    const guidanceLoop = Animated.loop(
      Animated.timing(guidanceAnim, {
        toValue: 1,
        duration: 2200,
        useNativeDriver: true,
      }),
    );

    pulseLoop.start();
    guidanceLoop.start();

    return () => {
      pulseLoop.stop();
      guidanceLoop.stop();
    };
  }, [guidanceAnim, isTracking, pulseAnim]);

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.85, 1.35],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.08],
  });

  const guidanceOpacity = guidanceAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.55, 1, 0.55],
  });

  if (!isTracking) {
    return (
      <View style={styles.mapIdleState}>
        <View style={styles.mapIdleIcon}>
          <Ionicons name="locate-outline" size={26} color={PRIMARY_BLUE} />
        </View>
        <Text style={styles.mapIdleTitle}>Locator Idle</Text>
        <Text style={styles.mapIdleText}>Awaiting asset match from ERP records.</Text>
      </View>
    );
  }

  const techLeft = `${proximity.technicianPosition.x * 100}%` as DimensionValue;
  const techTop = `${proximity.technicianPosition.y * 100}%` as DimensionValue;
  const assetLeft = `${proximity.assetPosition.x * 100}%` as DimensionValue;
  const assetTop = `${proximity.assetPosition.y * 100}%` as DimensionValue;

  return (
    <View style={styles.liveMap}>
      <View style={styles.gridVertical} />
      <View style={styles.gridHorizontal} />
      <View style={styles.gridDiagonal} />

      <Animated.View
        style={[
          styles.radarRing,
          {
            left: techLeft,
            top: techTop,
            opacity: pulseOpacity,
            transform: [{ scale: pulseScale }],
          },
        ]}
      />

      <View style={[styles.connectorLine, styles.connectorLineDynamic]} />

      <View style={[styles.assetDotWrap, { left: assetLeft, top: assetTop }]}>
        <View style={styles.assetDotOuter}>
          <View style={styles.assetDotInner} />
        </View>
        <Text style={styles.dotLabel}>Asset</Text>
      </View>

      <View style={[styles.techDotWrap, { left: techLeft, top: techTop }]}>
        <View style={styles.techDotOuter}>
          <View style={styles.techDotInner} />
        </View>
        <Text style={styles.dotLabelYou}>You</Text>
      </View>

      <View style={styles.signalCard}>
        <Text style={styles.signalTitle}>{proximity.signalLabel}</Text>
        <Text style={styles.signalValue}>{proximity.proximityPercent}% proximity</Text>
        <View style={styles.signalBarTrack}>
          <View
            style={[
              styles.signalBarFill,
              { width: `${proximity.proximityPercent}%` },
            ]}
          />
        </View>
      </View>

      <View style={styles.locationTag}>
        <Ionicons name="business-outline" size={15} color={PRIMARY_BLUE} />
        <Text style={styles.locationTagText} numberOfLines={1}>
          {locationLabel}
        </Text>
      </View>

      
    </View>
  );
}

const styles = StyleSheet.create({
  mapIdleState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  mapIdleIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  mapIdleTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  mapIdleText: {
    marginTop: 6,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  liveMap: {
    flex: 1,
    minHeight: 260,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#dbe2ea',
  },
  gridVertical: {
    position: 'absolute',
    left: '33%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  gridHorizontal: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  gridDiagonal: {
    position: 'absolute',
    left: -40,
    right: -40,
    top: '50%',
    height: 1,
    backgroundColor: '#e2e8f0',
    transform: [{ rotate: '24deg' }],
  },
  radarRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    marginLeft: -36,
    marginTop: -36,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#fca5a5',
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
  },
  connectorLine: {
    position: 'absolute',
    left: '20%',
    top: '78%',
    width: '56%',
    height: 2,
    backgroundColor: '#cbd5e1',
  },
  connectorLineDynamic: {
    opacity: 0.45,
  },
  assetDotWrap: {
    position: 'absolute',
    marginLeft: -14,
    marginTop: -14,
    alignItems: 'center',
  },
  techDotWrap: {
    position: 'absolute',
    marginLeft: -14,
    marginTop: -14,
    alignItems: 'center',
  },
  assetDotOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(22, 163, 74, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assetDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#16a34a',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  techDotOuter: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(220, 38, 38, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  techDotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#dc2626',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  dotLabel: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '800',
    color: '#166534',
  },
  dotLabelYou: {
    marginTop: 4,
    fontSize: 9,
    fontWeight: '800',
    color: '#b91c1c',
  },
  signalCard: {
    position: 'absolute',
    left: 12,
    top: 12,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    padding: 10,
  },
  signalTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0f172a',
  },
  signalValue: {
    marginTop: 2,
    fontSize: 10,
    color: '#64748b',
    fontWeight: '600',
  },
  signalBarTrack: {
    marginTop: 8,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  signalBarFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#16a34a',
  },
  locationTag: {
    position: 'absolute',
    right: 12,
    bottom: 56,
    maxWidth: '52%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  locationTagText: {
    marginLeft: 5,
    fontSize: 10,
    fontWeight: '700',
    color: '#0f172a',
  },
  guidanceCard: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3a8a',
    borderRadius: 8,
    padding: 10,
  },
  guidanceIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  guidanceCopy: {
    flex: 1,
    minWidth: 0,
  },
  guidanceTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#ffffff',
  },
  guidanceText: {
    marginTop: 2,
    fontSize: 10,
    lineHeight: 14,
    color: 'rgba(255,255,255,0.88)',
  },
});
