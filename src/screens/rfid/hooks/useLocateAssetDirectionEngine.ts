import { useMemo } from 'react';

import type { LocateAssetSignalSample } from './useLocateAssetSignalProcessor';

export type LocateAssetDirectionTrend =
  | 'idle'
  | 'searching'
  | 'correct'
  | 'wrong'
  | 'fluctuating';

export type LocateAssetDirectionState = {
  trend: LocateAssetDirectionTrend;
  guidanceText: string;
  detailText: string;
  confidence: number;
  phaseDrift: number;
};

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const idleState: LocateAssetDirectionState = {
  trend: 'idle',
  guidanceText: 'Searching for asset...',
  detailText: 'Awaiting EPC reads',
  confidence: 0,
  phaseDrift: 0,
};

const getAveragePhaseDrift = (samples: LocateAssetSignalSample[]) => {
  const phases = samples
    .map(sample => sample.phase)
    .filter((value): value is number => value !== null);

  if (phases.length < 2) {
    return 0;
  }

  let drift = 0;
  for (let index = 1; index < phases.length; index += 1) {
    drift += Math.abs(phases[index] - phases[index - 1]);
  }

  return drift / (phases.length - 1);
};

export function useLocateAssetDirectionEngine(
  signalHistory: LocateAssetSignalSample[],
  isEnabled = true,
): LocateAssetDirectionState {
  return useMemo(() => {
    if (!isEnabled) {
      return idleState;
    }

    const matchedSamples = signalHistory
      .filter(sample => sample.epcMatched)
      .slice(-8);

    if (matchedSamples.length < 3) {
      return {
        trend: 'searching',
        guidanceText: 'Scan slowly / rotate',
        detailText: 'EPC intermittent',
        confidence: 0.2,
        phaseDrift: getAveragePhaseDrift(matchedSamples),
      };
    }

    const midpoint = Math.max(1, Math.floor(matchedSamples.length / 2));
    const earlyScore = average(
      matchedSamples.slice(0, midpoint).map(sample => sample.signalScore),
    );
    const latestScore = average(
      matchedSamples.slice(midpoint).map(sample => sample.signalScore),
    );
    const delta = latestScore - earlyScore;
    const recentScores = matchedSamples.map(sample => sample.signalScore);
    const scoreMean = average(recentScores);
    const variance = average(
      recentScores.map(score => Math.abs(score - scoreMean)),
    );
    const confidence = clamp(Math.abs(delta) * 6, 0.2, 1);
    const phaseDrift = getAveragePhaseDrift(matchedSamples);
    const phaseDetail = phaseDrift > 80
      ? 'Phase shifting; slow down'
      : phaseDrift > 35
        ? 'Phase movement detected'
        : '';

    if (delta > 0.08) {
      return {
        trend: 'correct',
        guidanceText: 'Correct direction',
        detailText: phaseDetail || 'Signal improving',
        confidence,
        phaseDrift,
      };
    }

    if (delta < -0.08) {
      return {
        trend: 'wrong',
        guidanceText: 'Wrong direction',
        detailText: phaseDetail || 'Signal weakening',
        confidence,
        phaseDrift,
      };
    }

    return {
      trend: 'fluctuating',
      guidanceText: 'Scan slowly / rotate',
      detailText: phaseDetail || (variance > 0.12 ? 'Signal fluctuating' : 'Signal holding steady'),
      confidence: clamp(variance * 5, 0.2, 0.8),
      phaseDrift,
    };
  }, [isEnabled, signalHistory]);
}
