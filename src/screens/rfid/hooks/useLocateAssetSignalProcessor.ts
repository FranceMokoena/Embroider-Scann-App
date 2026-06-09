import { useEffect, useMemo, useRef, useState } from 'react';

import { normalizeEpc } from '../../../rfid/chainwayRfid';
import type {
  RFIDStreamEntry,
  RFIDStreamSnapshot,
} from '../../../rfid/RFIDStreamController';

export type LocateAssetSignalState = 'far' | 'medium' | 'close' | 'found';

export type LocateAssetSignalSample = {
  at: number;
  epcMatched: boolean;
  rssi: number | null;
  emaRssi: number | null;
  antenna: number | null;
  phase: number | null;
  frequency: number | null;
  sdkReadCount: number | null;
  signalScore: number;
  confidence: number;
  volatility: number;
  readCount: number;
  readDelta: number;
  lastSeenAt: number | null;
};

export type LocateAssetSignalReading = {
  signalState: LocateAssetSignalState;
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
  epcMatched: boolean;
  usingRssi: boolean;
  history: LocateAssetSignalSample[];
};

type TransitionCounter = {
  candidate: LocateAssetSignalState | null;
  count: number;
};

type SignalMetrics = {
  candidateState: LocateAssetSignalState;
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
  epcMatched: boolean;
  usingRssi: boolean;
};

const SIGNAL_WINDOW_MS = 6000;
const RECENT_READ_MS = 1800;
const MAX_SIGNAL_SAMPLES = 36;
const EMA_ALPHA = 0.25;
const RSSI_FLOOR = -82;
const RSSI_CEILING = -38;
const CLOSE_RSSI_SCORE = 0.72;
const MEDIUM_RSSI_SCORE = 0.42;
const FOUND_MIN_CONFIDENCE = 90;
const FOUND_MAX_VOLATILITY = 3;
const FOUND_MIN_RSSI_SAMPLES = 4;

const emptyReading: LocateAssetSignalReading = {
  signalState: 'far',
  strengthPercent: 0,
  confidence: 0,
  latestRssi: null,
  emaRssi: null,
  readFrequency: 0,
  detectionRate: 0,
  stableReadCount: 0,
  volatility: 0,
  phaseDrift: 0,
  antenna: null,
  frequency: null,
  lastSeenAt: null,
  epcMatched: false,
  usingRssi: false,
  history: [],
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const getRssiScore = (rssi: number) =>
  clamp((rssi - RSSI_FLOOR) / (RSSI_CEILING - RSSI_FLOOR), 0, 1);

const findTargetEntry = (
  entries: RFIDStreamEntry[],
  normalizedTarget: string,
) =>
  entries.find(entry => {
    const raw = normalizeEpc(entry.epcRaw);
    const key = normalizeEpc(entry.epcKey);
    return raw === normalizedTarget || key === normalizedTarget;
  }) || null;

const getSignalVolatility = (samples: LocateAssetSignalSample[]) => {
  const rssiValues = samples
    .map(sample => sample.rssi)
    .filter((value): value is number => value !== null);

  if (rssiValues.length < 2) {
    return 0;
  }

  const mean = average(rssiValues);
  return average(rssiValues.map(value => Math.abs(value - mean)));
};

const getPhaseDrift = (samples: LocateAssetSignalSample[]) => {
  const phases = samples
    .map(sample => sample.phase)
    .filter((value): value is number => value !== null);

  if (phases.length < 2) {
    return 0;
  }

  let totalDrift = 0;
  for (let index = 1; index < phases.length; index += 1) {
    totalDrift += Math.abs(phases[index] - phases[index - 1]);
  }

  return totalDrift / (phases.length - 1);
};

const getConfirmationRequirement = (
  currentState: LocateAssetSignalState,
  candidateState: LocateAssetSignalState,
) => {
  if (candidateState === currentState) {
    return 0;
  }

  if (candidateState === 'found') {
    return 4;
  }

  if (candidateState === 'close') {
    return 3;
  }

  if (currentState === 'close' && candidateState === 'medium') {
    return 3;
  }

  if (currentState === 'found') {
    return 4;
  }

  return 3;
};

const resolveHysteresisState = (
  currentState: LocateAssetSignalState,
  candidateState: LocateAssetSignalState,
  transitionCounter: TransitionCounter,
) => {
  if (candidateState === currentState) {
    transitionCounter.candidate = null;
    transitionCounter.count = 0;
    return currentState;
  }

  if (transitionCounter.candidate === candidateState) {
    transitionCounter.count += 1;
  } else {
    transitionCounter.candidate = candidateState;
    transitionCounter.count = 1;
  }

  const requiredCount = getConfirmationRequirement(currentState, candidateState);

  if (transitionCounter.count >= requiredCount) {
    transitionCounter.candidate = null;
    transitionCounter.count = 0;
    return candidateState;
  }

  return currentState;
};

const getFallbackScore = (
  recencyScore: number,
  readDelta: number,
  readCount: number,
) => {
  const burstScore = clamp(readDelta / 4, 0, 1);
  const cumulativeScore = clamp(readCount / 18, 0, 1);

  return clamp(
    recencyScore * 0.35 + burstScore * 0.45 + cumulativeScore * 0.2,
    0,
    1,
  );
};

const getMetrics = (
  recentHistory: LocateAssetSignalSample[],
): SignalMetrics => {
  const now = Date.now();
  const matchedHistory = recentHistory.filter(sample => sample.epcMatched);
  const latest = recentHistory[recentHistory.length - 1] || null;
  const latestMatched = matchedHistory[matchedHistory.length - 1] || null;
  const rssiSamples = matchedHistory.filter(sample => sample.rssi !== null);
  const emaSamples = matchedHistory.filter(sample => sample.emaRssi !== null);
  const usingRssi = rssiSamples.length > 0;
  const latestRssi = latestMatched?.rssi ?? null;
  const emaRssi = latestMatched?.emaRssi ?? null;
  const volatility = getSignalVolatility(matchedHistory.slice(-8));
  const phaseDrift = getPhaseDrift(matchedHistory.slice(-8));
  const rssiScore = emaRssi === null ? 0 : getRssiScore(emaRssi);
  const fallbackSignalScore = average(recentHistory.slice(-5).map(sample => sample.signalScore));
  const totalReadDelta = recentHistory.reduce(
    (sum, sample) => sum + sample.readDelta,
    0,
  );
  const firstSampleAt = recentHistory[0]?.at ?? now;
  const windowSeconds = Math.max((now - firstSampleAt) / 1000, 1);
  const readFrequency = totalReadDelta / windowSeconds;
  const detectionRate = recentHistory.length
    ? matchedHistory.length / recentHistory.length
    : 0;
  const readConsistency = clamp(readFrequency / 2.5, 0, 1);
  const persistenceScore = clamp(detectionRate, 0, 1);
  const stabilityScore = usingRssi
    ? clamp(1 - volatility / 12, 0, 1)
    : clamp(0.45 + persistenceScore * 0.25, 0, 0.7);
  const confidence = usingRssi
    ? Math.round(clamp(
      rssiScore * 45 +
        stabilityScore * 25 +
        readConsistency * 20 +
        persistenceScore * 10,
      0,
      100,
    ))
    : Math.round(clamp(
      fallbackSignalScore * 55 +
        readConsistency * 25 +
        persistenceScore * 20,
      0,
      84,
    ));

  let stableReadCount = 0;
  for (let index = matchedHistory.length - 1; index >= 0; index -= 1) {
    const sample = matchedHistory[index];
    const sampleScore = sample.emaRssi === null
      ? sample.signalScore
      : getRssiScore(sample.emaRssi);
    const isStrongRead = usingRssi
      ? sampleScore >= CLOSE_RSSI_SCORE
      : sample.signalScore >= CLOSE_RSSI_SCORE;

    if (!isStrongRead) {
      break;
    }

    stableReadCount += 1;
  }

  const hasStableRssi = usingRssi &&
    emaSamples.length >= FOUND_MIN_RSSI_SAMPLES &&
    stableReadCount >= FOUND_MIN_RSSI_SAMPLES &&
    volatility <= FOUND_MAX_VOLATILITY;
  const isFound = hasStableRssi && confidence >= FOUND_MIN_CONFIDENCE;
  const strengthPercent = usingRssi
    ? Math.round(rssiScore * 100)
    : Math.round(clamp(fallbackSignalScore, 0, 1) * 100);

  let candidateState: LocateAssetSignalState = 'far';
  if (isFound) {
    candidateState = 'found';
  } else if (
    (usingRssi && rssiScore >= CLOSE_RSSI_SCORE && confidence >= 70) ||
    (!usingRssi && fallbackSignalScore >= CLOSE_RSSI_SCORE && confidence >= 70)
  ) {
    candidateState = 'close';
  } else if (
    (usingRssi && rssiScore >= MEDIUM_RSSI_SCORE && confidence >= 45) ||
    (!usingRssi && fallbackSignalScore >= MEDIUM_RSSI_SCORE && confidence >= 45)
  ) {
    candidateState = 'medium';
  }

  return {
    candidateState,
    strengthPercent,
    confidence,
    latestRssi,
    emaRssi,
    readFrequency,
    detectionRate,
    stableReadCount,
    volatility,
    phaseDrift,
    antenna: latestMatched?.antenna ?? null,
    frequency: latestMatched?.frequency ?? null,
    lastSeenAt: latestMatched?.lastSeenAt ?? null,
    epcMatched: Boolean(latest?.epcMatched),
    usingRssi,
  };
};

export function useLocateAssetSignalProcessor(
  targetEpc: string | null,
  streamSnapshot: RFIDStreamSnapshot,
  isEnabled = true,
): LocateAssetSignalReading {
  const normalizedTarget = useMemo(
    () => (targetEpc ? normalizeEpc(targetEpc) : ''),
    [targetEpc],
  );
  const [history, setHistory] = useState<LocateAssetSignalSample[]>([]);
  const [stableSignalState, setStableSignalState] =
    useState<LocateAssetSignalState>('far');
  const [decayTick, setDecayTick] = useState(0);
  const previousReadCountRef = useRef<number | null>(null);
  const emaRssiRef = useRef<number | null>(null);
  const transitionCounterRef = useRef<TransitionCounter>({
    candidate: null,
    count: 0,
  });

  useEffect(() => {
    previousReadCountRef.current = null;
    emaRssiRef.current = null;
    transitionCounterRef.current = {
      candidate: null,
      count: 0,
    };
    setDecayTick(0);
    setStableSignalState('far');
    setHistory([]);
  }, [isEnabled, normalizedTarget]);

  useEffect(() => {
    if (!isEnabled || !normalizedTarget) {
      return;
    }

    const timer = setInterval(() => {
      setDecayTick(previous => previous + 1);
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [isEnabled, normalizedTarget]);

  useEffect(() => {
    if (!isEnabled || !normalizedTarget) {
      return;
    }

    const now = Date.now();
    const entry = findTargetEntry(streamSnapshot.entries, normalizedTarget);
    const rssi = typeof entry?.rssi === 'number' && Number.isFinite(entry.rssi)
      ? entry.rssi
      : null;
    const antenna = typeof entry?.antenna === 'number' && Number.isFinite(entry.antenna)
      ? entry.antenna
      : null;
    const phase = typeof entry?.phase === 'number' && Number.isFinite(entry.phase)
      ? entry.phase
      : null;
    const frequency = typeof entry?.frequency === 'number' && Number.isFinite(entry.frequency)
      ? entry.frequency
      : null;
    const sdkReadCount = typeof entry?.sdkReadCount === 'number' && Number.isFinite(entry.sdkReadCount)
      ? entry.sdkReadCount
      : null;
    const readCount = entry?.readCount ?? 0;
    const lastSeenAt = entry?.lastSeenAt ?? null;
    const epcMatched = Boolean(lastSeenAt && now - lastSeenAt <= RECENT_READ_MS);
    const readDelta = entry
      ? previousReadCountRef.current === null
        ? epcMatched
          ? 1
          : 0
        : Math.max(0, readCount - previousReadCountRef.current)
      : 0;

    if (entry) {
      previousReadCountRef.current = readCount;
    }

    const emaRssi = epcMatched && rssi !== null
      ? emaRssiRef.current === null
        ? rssi
        : EMA_ALPHA * rssi + (1 - EMA_ALPHA) * emaRssiRef.current
      : emaRssiRef.current;

    if (epcMatched && rssi !== null) {
      emaRssiRef.current = emaRssi;
    }

    const recencyScore = lastSeenAt
      ? clamp(1 - (now - lastSeenAt) / RECENT_READ_MS, 0, 1)
      : 0;
    const fallbackScore = getFallbackScore(recencyScore, readDelta, readCount);
    const signalScore = epcMatched
      ? emaRssi === null
        ? fallbackScore
        : getRssiScore(emaRssi)
      : 0;

    const sample: LocateAssetSignalSample = {
      at: now,
      epcMatched,
      rssi,
      emaRssi: epcMatched ? emaRssi : null,
      antenna,
      phase,
      frequency,
      sdkReadCount,
      signalScore,
      confidence: 0,
      volatility: 0,
      readCount,
      readDelta,
      lastSeenAt,
    };

    setHistory(previous => {
      const nextHistory = [
        ...previous.filter(item => now - item.at <= SIGNAL_WINDOW_MS),
        sample,
      ].slice(-MAX_SIGNAL_SAMPLES);
      const metrics = getMetrics(nextHistory);

      return nextHistory.map((item, index) =>
        index === nextHistory.length - 1
          ? {
            ...item,
            confidence: metrics.confidence,
            volatility: metrics.volatility,
          }
          : item,
      );
    });
  }, [
    isEnabled,
    decayTick,
    normalizedTarget,
    streamSnapshot.entries,
    streamSnapshot.listenerEpoch,
  ]);

  const recentHistory = useMemo(
    () => history.filter(item => Date.now() - item.at <= SIGNAL_WINDOW_MS),
    [history],
  );

  const metrics = useMemo(
    () => getMetrics(recentHistory),
    [recentHistory],
  );
  const latestSampleAt = recentHistory[recentHistory.length - 1]?.at ?? 0;

  useEffect(() => {
    if (!isEnabled || !normalizedTarget || recentHistory.length === 0) {
      return;
    }

    const nextState = resolveHysteresisState(
      stableSignalState,
      metrics.candidateState,
      transitionCounterRef.current,
    );

    if (nextState !== stableSignalState) {
      setStableSignalState(nextState);
    }
  }, [
    isEnabled,
    latestSampleAt,
    metrics.candidateState,
    normalizedTarget,
    recentHistory.length,
    stableSignalState,
  ]);

  return useMemo(() => {
    if (!isEnabled || !normalizedTarget || history.length === 0) {
      return {
        ...emptyReading,
        history,
      };
    }

    return {
      signalState: stableSignalState,
      strengthPercent: metrics.strengthPercent,
      confidence: metrics.confidence,
      latestRssi: metrics.latestRssi,
      emaRssi: metrics.emaRssi,
      readFrequency: metrics.readFrequency,
      detectionRate: metrics.detectionRate,
      stableReadCount: metrics.stableReadCount,
      volatility: metrics.volatility,
      phaseDrift: metrics.phaseDrift,
      antenna: metrics.antenna,
      frequency: metrics.frequency,
      lastSeenAt: metrics.lastSeenAt,
      epcMatched: metrics.epcMatched,
      usingRssi: metrics.usingRssi,
      history: recentHistory,
    };
  }, [
    history,
    isEnabled,
    metrics,
    normalizedTarget,
    recentHistory,
    stableSignalState,
  ]);
}
