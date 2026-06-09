import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { LocateAssetSignalState } from '../hooks/useLocateAssetSignalProcessor';

type SignalMeterProps = {
  strengthPercent: number;
  signalState: LocateAssetSignalState;
};

const SIGNAL_COLORS: Record<LocateAssetSignalState, string> = {
  far: '#2563eb',
  medium: '#ca8a04',
  close: '#ea580c',
  found: '#dc2626',
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export default function SignalMeter({
  strengthPercent,
  signalState,
}: SignalMeterProps) {
  const normalizedStrength = clamp(strengthPercent, 0, 100);
  const activeBars = Math.ceil(normalizedStrength / 20);
  const color = SIGNAL_COLORS[signalState];

  return (
    <View style={styles.container}>
      <View style={styles.bars} accessibilityElementsHidden>
        {[0, 1, 2, 3, 4].map(index => (
          <View
            key={index}
            style={[
              styles.bar,
              { height: 6 + index * 3 },
              index < activeBars && { backgroundColor: color },
            ]}
          />
        ))}
      </View>
      <Text style={styles.value}>{Math.round(normalizedStrength)}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 86,
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bars: {
    width: 42,
    height: 22,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  bar: {
    width: 6,
    borderRadius: 4,
    backgroundColor: '#cbd5e1',
  },
  value: {
    width: 38,
    marginLeft: 6,
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'right',
  },
});
