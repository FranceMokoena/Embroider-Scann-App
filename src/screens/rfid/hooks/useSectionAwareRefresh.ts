import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import {
  isSectionTransferPayload,
  subscribeToAssetSync,
  type SectionTransferPayload,
} from '../../../services/assetSync';

const DEBOUNCE_MS = 400;

const normalizeSectionName = (value: string) => value.trim().toLowerCase();

type UseSectionAwareRefreshOptions = {
  watchedSections?: string[];
  onRefresh: () => void | Promise<void>;
  enabled?: boolean;
  refreshOnFocus?: boolean;
};

const shouldRefreshForTransfer = (
  payload: SectionTransferPayload,
  watchedSections?: string[],
) => {
  if (!watchedSections || watchedSections.length === 0) {
    return true;
  }

  const watchSet = new Set(
    watchedSections.map(section => normalizeSectionName(section)).filter(Boolean),
  );

  if (watchSet.has(normalizeSectionName(payload.toSection))) {
    return true;
  }

  return payload.fromSections.some(section =>
    watchSet.has(normalizeSectionName(section)),
  );
};

export function useSectionAwareRefresh({
  watchedSections,
  onRefresh,
  enabled = true,
  refreshOnFocus = true,
}: UseSectionAwareRefreshOptions) {
  const onRefreshRef = useRef(onRefresh);
  const mountedRef = useRef(true);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    onRefreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  const runRefresh = useCallback(async () => {
    if (!enabled || !mountedRef.current || isRefreshingRef.current) {
      return;
    }

    isRefreshingRef.current = true;

    try {
      await Promise.resolve(onRefreshRef.current());
    } catch (error) {
      console.error('Section-aware refresh failed', error);
    } finally {
      isRefreshingRef.current = false;
    }
  }, [enabled]);

  const scheduleRefresh = useCallback(() => {
    if (!enabled || !mountedRef.current) {
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void runRefresh();
    }, DEBOUNCE_MS);
  }, [enabled, runRefresh]);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const unsubscribe = subscribeToAssetSync((event, payload) => {
      if (event !== 'sectionTransferCompleted' || !isSectionTransferPayload(payload)) {
        return;
      }

      if (shouldRefreshForTransfer(payload, watchedSections)) {
        scheduleRefresh();
      }
    });

    return unsubscribe;
  }, [enabled, watchedSections, scheduleRefresh]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled || !refreshOnFocus) {
        return undefined;
      }

      scheduleRefresh();
      return undefined;
    }, [enabled, refreshOnFocus, scheduleRefresh]),
  );
}
