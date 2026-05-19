import { useEffect, useMemo, useRef, useState } from 'react';

import { normalizeEpc } from '../../../rfid/chainwayRfid';
import type { RFIDStreamSnapshot } from '../../../rfid/RFIDStreamController';

const PROXIMITY_WINDOW_MS = 2500;
const ASSET_ANCHOR = { x: 0.76, y: 0.24 };
const TECHNICIAN_START = { x: 0.2, y: 0.78 };

type ProximitySample = {
  at: number;
  readCount: number;
};

export type CampusProximityState = {
  proximityPercent: number;
  signalLabel: string;
  guidanceText: string;
  isApproaching: boolean;
  technicianPosition: { x: number; y: number };
  assetPosition: { x: number; y: number };
  lastSignalAt: number | null;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

export function useCampusProximityTracker(
  targetEpc: string | null,
  isTracking: boolean,
  snapshot: RFIDStreamSnapshot,
) {
  const [proximityPercent, setProximityPercent] = useState(0);
  const [isApproaching, setIsApproaching] = useState(false);
  const [lastSignalAt, setLastSignalAt] = useState<number | null>(null);
  const samplesRef = useRef<ProximitySample[]>([]);
  const previousScoreRef = useRef(0);

  useEffect(() => {
    if (!isTracking || !targetEpc) {
      samplesRef.current = [];
      previousScoreRef.current = 0;
      setProximityPercent(0);
      setIsApproaching(false);
      setLastSignalAt(null);
      return;
    }

    const normalizedTarget = normalizeEpc(targetEpc);
    const entry = snapshot.entries.find(
      item => normalizeEpc(item.epcRaw) === normalizedTarget,
    );

    const now = Date.now();
    samplesRef.current = samplesRef.current.filter(
      sample => now - sample.at <= PROXIMITY_WINDOW_MS,
    );

    if (entry) {
      samplesRef.current.push({
        at: now,
        readCount: entry.readCount,
      });
      setLastSignalAt(entry.lastSeenAt);
    }

    const windowSamples = samplesRef.current;
    const readBurst = windowSamples.length;
    const totalReads = windowSamples.reduce((sum, sample) => sum + sample.readCount, 0);
    const recencyMs = entry ? now - entry.lastSeenAt : PROXIMITY_WINDOW_MS;
    const recencyScore = clamp(1 - recencyMs / PROXIMITY_WINDOW_MS, 0, 1);
    const burstScore = clamp(readBurst / 8, 0, 1);
    const volumeScore = clamp(totalReads / 24, 0, 1);
    const score = clamp(
      recencyScore * 0.45 + burstScore * 0.35 + volumeScore * 0.2,
      0,
      1,
    );

    setProximityPercent(Math.round(score * 100));
    setIsApproaching(score >= previousScoreRef.current);
    previousScoreRef.current = score;
  }, [isTracking, snapshot.entries, snapshot.listenerEpoch, targetEpc]);

  const signalLabel = useMemo(() => {
    if (!isTracking || !targetEpc) {
      return 'No Signal';
    }
    if (proximityPercent >= 75) {
      return 'Strong Signal';
    }
    if (proximityPercent >= 45) {
      return 'Moderate Signal';
    }
    if (proximityPercent >= 15) {
      return 'Weak Signal';
    }
    return 'Scanning…';
  }, [isTracking, proximityPercent, targetEpc]);

  const guidanceText = useMemo(() => {
    if (!isTracking || !targetEpc) {
      return 'Start a locate session to activate campus tracking.';
    }
    if (proximityPercent >= 80) {
      return 'Asset is very close. Slow down and confirm the tagged item visually.';
    }
    if (isApproaching) {
      return 'RFID signal is strengthening. Continue moving in this direction.';
    }
    if (proximityPercent > 0) {
      return 'Signal is weakening. Adjust your route toward the asset location.';
    }
    return 'Walk the campus while the locator listens for the assigned EPC tag.';
  }, [isApproaching, isTracking, proximityPercent, targetEpc]);

  const technicianPosition = useMemo(() => {
    const t = proximityPercent / 100;
    return {
      x: lerp(TECHNICIAN_START.x, ASSET_ANCHOR.x, t),
      y: lerp(TECHNICIAN_START.y, ASSET_ANCHOR.y, t),
    };
  }, [proximityPercent]);

  const state: CampusProximityState = {
    proximityPercent,
    signalLabel,
    guidanceText,
    isApproaching,
    technicianPosition,
    assetPosition: ASSET_ANCHOR,
    lastSignalAt,
  };

  return state;
}
