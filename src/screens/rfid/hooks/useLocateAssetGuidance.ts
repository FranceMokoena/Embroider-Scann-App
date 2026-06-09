import { useEffect, useMemo } from 'react';
import { Vibration } from 'react-native';

import { playRfidScanSound } from '../../../rfid/rfidScanSound';
import type { RFIDStreamSnapshot } from '../../../rfid/RFIDStreamController';
import { useLocateAssetDirectionEngine } from './useLocateAssetDirectionEngine';
import type {
  LocateAssetSignalState,
} from './useLocateAssetSignalProcessor';
import { useLocateAssetSignalProcessor } from './useLocateAssetSignalProcessor';

type LocateAssetGuidanceOptions = {
  isFeedbackMuted?: boolean;
  isFoundLocked?: boolean;
};

export type LocateAssetGuidanceState = {
  isActive: boolean;
  signalState: LocateAssetSignalState;
  statusLabel: string;
  title: string;
  primaryText: string;
  secondaryText: string;
  strengthPercent: number;
  confidence: number;
  latestRssi: number | null;
  emaRssi: number | null;
  readFrequency: number;
  detectionRate: number;
  stableReadCount: number;
  volatility: number;
  phaseDrift: number;
  antenna: number | null;
  frequency: number | null;
  lastSeenAt: number | null;
  directionText: string;
  directionDetail: string;
  usingRssi: boolean;
  isFeedbackMuted: boolean;
  isFoundLocked: boolean;
  signalLost: boolean;
  signalTrail: number[];
  trendLabel: string;
  staticZones: {
    current: string;
    target: string;
  };
};

const AUDIO_INTERVAL_MS: Record<LocateAssetSignalState, number | null> = {
  far: null,
  medium: 1400,
  close: 520,
  found: null,
};

const SIGNAL_LOST_MS = 3200;

const playFoundSuccessTone = () => {
  void playRfidScanSound();
  const timers = [
    setTimeout(() => {
      void playRfidScanSound();
    }, 160),
    setTimeout(() => {
      void playRfidScanSound();
    }, 320),
  ];

  return () => {
    timers.forEach(clearTimeout);
  };
};

const getTitle = (
  signalState: LocateAssetSignalState,
  directionText: string,
) => {
  if (signalState === 'found') {
    return 'ASSET FOUND';
  }

  if (signalState === 'close') {
    return 'Very close';
  }

  if (signalState === 'medium') {
    return directionText === 'Correct direction'
      ? 'Move in this direction'
      : directionText;
  }

  return 'Searching for asset...';
};

const getPrimaryText = (
  signalState: LocateAssetSignalState,
  directionText: string,
) => {
  if (signalState === 'found') {
    return 'RF signal stable. Asset found.';
  }

  if (signalState === 'close') {
    return 'Very close. Slow down.';
  }

  if (signalState === 'medium') {
    return directionText;
  }

  return 'Searching for asset...';
};

const getSecondaryText = (
  signalState: LocateAssetSignalState,
  directionDetail: string,
  confidence: number,
  usingRssi: boolean,
) => {
  const signalSource = usingRssi ? 'RSSI locked' : 'RSSI unavailable';

  if (signalState === 'found') {
    return `Confidence ${confidence}% - confirm visually`;
  }

  if (signalState === 'close') {
    return `Confidence ${confidence}% - ${signalSource}`;
  }

  if (signalState === 'medium') {
    return `Confidence ${confidence}% - ${directionDetail}`;
  }

  return `Confidence ${confidence}% - EPC intermittent`;
};

export function useLocateAssetGuidance(
  targetEpc: string | null,
  streamSnapshot: RFIDStreamSnapshot,
  isEnabled = true,
  options: LocateAssetGuidanceOptions = {},
): LocateAssetGuidanceState {
  const signal = useLocateAssetSignalProcessor(
    targetEpc,
    streamSnapshot,
    isEnabled,
  );
  const direction = useLocateAssetDirectionEngine(
    signal.history,
    isEnabled && Boolean(targetEpc),
  );
  const isActive = isEnabled && Boolean(targetEpc);
  const isFeedbackMuted = Boolean(options.isFeedbackMuted);
  const isFoundLocked = Boolean(options.isFoundLocked);
  const signalLost = Boolean(
    isActive &&
      !isFoundLocked &&
      signal.lastSeenAt &&
      Date.now() - signal.lastSeenAt > SIGNAL_LOST_MS,
  );
  const effectiveSignalState: LocateAssetSignalState = isFoundLocked
    ? 'found'
    : signal.signalState;

  useEffect(() => {
    if (!isActive || isFeedbackMuted || signalLost) {
      return;
    }

    if (effectiveSignalState === 'found') {
      return playFoundSuccessTone();
    }

    const intervalMs = AUDIO_INTERVAL_MS[effectiveSignalState];
    if (intervalMs === null) {
      return;
    }

    const timer = setInterval(() => {
      void playRfidScanSound();
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [effectiveSignalState, isActive, isFeedbackMuted, signalLost]);

  useEffect(() => {
    if (
      !isActive ||
      isFeedbackMuted ||
      signalLost ||
      (effectiveSignalState !== 'close' && effectiveSignalState !== 'found')
    ) {
      return;
    }

    if (effectiveSignalState === 'found') {
      Vibration.vibrate([0, 180, 90, 180, 90, 260]);

      return () => {
        Vibration.cancel();
      };
    }

    const timer = setInterval(() => {
      Vibration.vibrate(90);
    }, 1200);

    Vibration.vibrate(90);
    return () => {
      clearInterval(timer);
      Vibration.cancel();
    };
  }, [effectiveSignalState, isActive, isFeedbackMuted, signalLost]);

  return useMemo(() => {
    const signalTrail = signal.history
      .slice(-12)
      .map(sample => Math.round(Math.max(0, sample.signalScore) * 100));
    const firstTrail = signalTrail[0] ?? 0;
    const lastTrail = signalTrail[signalTrail.length - 1] ?? 0;
    const trendLabel = lastTrail - firstTrail > 8
      ? 'WARMER'
      : firstTrail - lastTrail > 8
        ? 'COOLER'
        : 'STEADY';
    const title = signalLost
      ? 'Signal lost'
      : getTitle(effectiveSignalState, direction.guidanceText);
    const primaryText = isFoundLocked
      ? 'Asset lock confirmed.'
      : signalLost
        ? 'Reacquire the target EPC.'
        : getPrimaryText(effectiveSignalState, direction.guidanceText);
    const secondaryText = getSecondaryText(
      effectiveSignalState,
      direction.detailText,
      signal.confidence,
      signal.usingRssi,
    );

    return {
      isActive,
      signalState: effectiveSignalState,
      statusLabel: isFoundLocked ? 'LOCKED' : effectiveSignalState.toUpperCase(),
      title,
      primaryText,
      secondaryText,
      strengthPercent: signal.strengthPercent,
      confidence: signal.confidence,
      latestRssi: signal.latestRssi,
      emaRssi: signal.emaRssi,
      readFrequency: signal.readFrequency,
      detectionRate: signal.detectionRate,
      stableReadCount: signal.stableReadCount,
      volatility: signal.volatility,
      phaseDrift: Math.max(signal.phaseDrift, direction.phaseDrift),
      antenna: signal.antenna,
      frequency: signal.frequency,
      lastSeenAt: signal.lastSeenAt,
      directionText: direction.guidanceText,
      directionDetail: direction.detailText,
      usingRssi: signal.usingRssi,
      isFeedbackMuted,
      isFoundLocked,
      signalLost,
      signalTrail,
      trendLabel,
      staticZones: {
        current: 'YOU ARE HERE (estimated zone)',
        target: 'TARGET ZONE (approx location)',
      },
    };
  }, [
    direction,
    effectiveSignalState,
    isActive,
    isFeedbackMuted,
    isFoundLocked,
    signal,
    signalLost,
  ]);
}
