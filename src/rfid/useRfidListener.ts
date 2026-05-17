import { useEffect, useRef } from 'react';

import {
  RfidTagScannedEvent,
  addRfidTagListener,
  assertChainwayRfidRuntime,
  getRfidDiagnostics,
} from './chainwayRfid';

type UseRfidListenerOptions = {
  enabled?: boolean;
  debounceMs?: number;
  duplicateWindowMs?: number;
  resetKey?: string | number | null;
  source?: string;
  onTag?: (event: RfidTagScannedEvent) => void;
  onTags?: (events: RfidTagScannedEvent[]) => void;
};

const DEFAULT_DEBOUNCE_MS = 150;
const DEFAULT_DUPLICATE_WINDOW_MS = 1200;

export function useRfidListener({
  enabled = true,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  duplicateWindowMs = DEFAULT_DUPLICATE_WINDOW_MS,
  resetKey,
  source = 'useRfidListener',
  onTag,
  onTags,
}: UseRfidListenerOptions) {
  const onTagRef = useRef(onTag);
  const onTagsRef = useRef(onTags);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingByEpcRef = useRef<Map<string, RfidTagScannedEvent>>(new Map());
  const lastSeenByEpcRef = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    onTagRef.current = onTag;
    onTagsRef.current = onTags;
  }, [onTag, onTags]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const diagnostics = assertChainwayRfidRuntime(`${source} attach`);
    console.log('[ChainwayRfid]', 'useRfidListener enabled', diagnostics);

    const flush = () => {
      timerRef.current = null;

      const events = Array.from(pendingByEpcRef.current.values());
      pendingByEpcRef.current.clear();

      if (events.length === 0) {
        return;
      }

      onTagsRef.current?.(events);
      events.forEach(event => onTagRef.current?.(event));
      console.log('[ChainwayRfid]', 'React RFID state callbacks invoked', {
        eventCount: events.length,
        diagnostics: getRfidDiagnostics(),
      });
    };

    const scheduleFlush = () => {
      if (timerRef.current) {
        return;
      }

      if (debounceMs <= 0) {
        flush();
        return;
      }

      timerRef.current = setTimeout(flush, debounceMs);
    };

    const subscription = addRfidTagListener(event => {
      const now = Date.now();
      const lastSeenAt = lastSeenByEpcRef.current.get(event.epc);

      if (lastSeenAt && now - lastSeenAt < duplicateWindowMs) {
        console.log('[ChainwayRfid]', 'Duplicate EPC suppressed', {
          epc: event.epc,
          duplicateWindowMs,
        });
        return;
      }

      lastSeenByEpcRef.current.set(event.epc, now);
      pendingByEpcRef.current.set(event.epc, event);
      scheduleFlush();
    }, source);

    return () => {
      subscription.remove();
      console.log('[ChainwayRfid]', 'useRfidListener cleanup', getRfidDiagnostics());

      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      pendingByEpcRef.current.clear();
      lastSeenByEpcRef.current.clear();
    };
  }, [debounceMs, duplicateWindowMs, enabled, resetKey, source]);
}
