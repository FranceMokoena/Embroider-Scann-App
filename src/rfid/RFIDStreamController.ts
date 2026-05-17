import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';

import {
  ChainwayRfid,
  RfidTagScannedEvent,
  normalizeEpc,
} from './chainwayRfid';
import { useRfidListener } from './useRfidListener';

export type RFIDScanLifecycleState =
  | 'idle'
  | 'starting'
  | 'scanning'
  | 'paused'
  | 'stopping';

export type RFIDMappingStatus = 'assigned' | 'unassigned' | 'unknown';

export type RFIDStreamEntry = {
  epcRaw: string;
  epcKey: string;
  firstSeenAt: number;
  lastSeenAt: number;
  readCount: number;
  duplicateSuppressedCount: number;
  mappingStatus: RFIDMappingStatus;
};

export type RFIDStreamSnapshot = {
  lifecycle: RFIDScanLifecycleState;
  entries: RFIDStreamEntry[];
  lastEpc: string | null;
  activeSessionId: string | null;
  error: string | null;
  listenerEpoch: number;
  lastRecoveryAt: number | null;
};

type RFIDStreamSubscriber = (snapshot: RFIDStreamSnapshot) => void;

const BUFFER_WINDOW_MS = 150;
const DUPLICATE_SUPPRESSION_WINDOW_MS = 1500;
const MAX_VISIBLE_ENTRIES = 200;
const GLOBAL_RFID_STREAM_CONTROLLER_KEY = '__EmbroideryTechRFIDStreamController__';

const createControllerId = () =>
  `rfid-stream-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const now = () => Date.now();

type RFIDStreamControllerGlobal = typeof globalThis & {
  __EmbroideryTechRFIDStreamController__?: RFIDStreamController;
};

export class RFIDStreamController {
  private static instance: RFIDStreamController | null = null;

  private readonly ownerId = createControllerId();
  private listenerBindingOwnerId: string | null = null;
  private lifecycle: RFIDScanLifecycleState = 'idle';
  private entriesByEpc = new Map<string, RFIDStreamEntry>();
  private pendingByEpc = new Map<string, RFIDStreamEntry>();
  private subscribers = new Set<RFIDStreamSubscriber>();
  private bufferTimer: ReturnType<typeof setTimeout> | null = null;
  private lastEpc: string | null = null;
  private activeSessionId: string | null = null;
  private error: string | null = null;
  private desiredScanning = false;
  private listenerEpoch = 0;
  private lastRecoveryAt: number | null = null;
  private appState: AppStateStatus = AppState.currentState;
  private resumeRecoveryInFlight: Promise<void> | null = null;
  private currentOwnerId: string | null = null;
  private nativeOperationChain: Promise<void> = Promise.resolve();
  private shouldResumeAfterBackground = false;

  private constructor() {
    // Hard singleton - prevent direct instantiation
  }

  static getInstance(): RFIDStreamController {
    const globalScope = globalThis as RFIDStreamControllerGlobal;

    if (!globalScope[GLOBAL_RFID_STREAM_CONTROLLER_KEY]) {
      globalScope[GLOBAL_RFID_STREAM_CONTROLLER_KEY] = new RFIDStreamController();
    }

    RFIDStreamController.instance = globalScope[GLOBAL_RFID_STREAM_CONTROLLER_KEY];
    return RFIDStreamController.instance;
  }

  subscribe(subscriber: RFIDStreamSubscriber) {
    this.subscribers.add(subscriber);
    subscriber(this.getSnapshot());

    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  getSnapshot(): RFIDStreamSnapshot {
    return {
      lifecycle: this.lifecycle,
      entries: Array.from(this.entriesByEpc.values())
        .sort((left, right) => right.lastSeenAt - left.lastSeenAt)
        .slice(0, MAX_VISIBLE_ENTRIES),
      lastEpc: this.lastEpc,
      activeSessionId: this.activeSessionId,
      error: this.error,
      listenerEpoch: this.listenerEpoch,
      lastRecoveryAt: this.lastRecoveryAt,
    };
  }

  getSubscriberCount() {
    return this.subscribers.size;
  }

  acquireListenerBinding(bindingOwnerId: string) {
    if (!this.listenerBindingOwnerId) {
      this.listenerBindingOwnerId = bindingOwnerId;
      this.notify();
    }

    return this.listenerBindingOwnerId === bindingOwnerId;
  }

  releaseListenerBinding(bindingOwnerId: string) {
    if (this.listenerBindingOwnerId !== bindingOwnerId) {
      return;
    }

    this.listenerBindingOwnerId = null;
    this.notify();
  }

  isListenerBindingOwner(bindingOwnerId: string) {
    return this.listenerBindingOwnerId === bindingOwnerId;
  }

  isOwner(ownerId: string) {
    return this.currentOwnerId === ownerId;
  }

  getActiveOwnerId() {
    return this.currentOwnerId;
  }

  private enqueueNativeOperation(operation: () => Promise<void>): Promise<void> {
    const runOperation = this.nativeOperationChain
      .catch(() => undefined)
      .then(operation);

    this.nativeOperationChain = runOperation.catch(() => undefined);
    return runOperation;
  }

  private async executeScanStart(ownerId: string) {
    if (this.currentOwnerId !== ownerId && this.currentOwnerId !== null) {
      await this.executeScanStop(this.currentOwnerId);
    }

    if (this.currentOwnerId === ownerId &&
      (this.lifecycle === 'scanning' || this.lifecycle === 'starting')) {
      this.desiredScanning = true;
      return;
    }

    this.currentOwnerId = ownerId;
    this.desiredScanning = true;
    this.shouldResumeAfterBackground = false;
    this.activeSessionId = createControllerId();
    this.error = null;
    this.bumpListenerEpoch();
    this.setLifecycle('starting');

    if (this.appState !== 'active') {
      this.shouldResumeAfterBackground = true;
      this.setLifecycle('paused');
      return;
    }

    try {
      await ChainwayRfid.startListening('RFIDStreamController.startScan');
      await ChainwayRfid.startInventory('RFIDStreamController.startScan');
      this.setLifecycle('scanning');
    } catch (error) {
      this.error = error instanceof Error
        ? error.message
        : 'Failed to start RFID scanning.';
      this.desiredScanning = false;
      this.shouldResumeAfterBackground = false;
      this.activeSessionId = null;
      this.currentOwnerId = null;
      this.bumpListenerEpoch();
      this.setLifecycle('idle');
      throw error;
    }
  }

  private async executeScanStop(ownerId: string) {
    if (this.currentOwnerId !== ownerId) {
      return;
    }

    if (this.lifecycle === 'idle' || this.lifecycle === 'stopping') {
      this.desiredScanning = false;
      this.shouldResumeAfterBackground = false;
      this.currentOwnerId = null;
      return;
    }

    this.desiredScanning = false;
    this.shouldResumeAfterBackground = false;
    this.setLifecycle('stopping');
    this.flushBuffer();

    try {
      await ChainwayRfid.stopInventory('RFIDStreamController.stopScan');
      await ChainwayRfid.stopListening('RFIDStreamController.stopScan');
    } finally {
      this.currentOwnerId = null;
      this.activeSessionId = null;
      this.bumpListenerEpoch();
      this.setLifecycle('idle');
    }
  }

  async startScan(ownerId: string) {
    return this.enqueueNativeOperation(() => this.executeScanStart(ownerId));
  }

  async stopScan(ownerId: string) {
    return this.enqueueNativeOperation(() => this.executeScanStop(ownerId));
  }

  async pauseScan() {
    return this.enqueueNativeOperation(async () => {
      if (this.lifecycle !== 'scanning') {
        return;
      }

      this.desiredScanning = false;
      this.shouldResumeAfterBackground = false;
      this.flushBuffer();
      await ChainwayRfid.stopInventory('RFIDStreamController.pauseScan');
      await ChainwayRfid.stopListening('RFIDStreamController.pauseScan');
      this.setLifecycle('paused');
    });
  }

  async resumeScan() {
    return this.enqueueNativeOperation(async () => {
      if (this.lifecycle !== 'paused' || !this.currentOwnerId || this.appState !== 'active') {
        return;
      }

      this.desiredScanning = true;
      this.shouldResumeAfterBackground = false;
      this.error = null;
      this.bumpListenerEpoch();
      this.setLifecycle('starting');
      await ChainwayRfid.startListening('RFIDStreamController.resumeScan');
      await ChainwayRfid.startInventory('RFIDStreamController.resumeScan');
      this.setLifecycle('scanning');
    });
  }

  clear() {
    this.resetStreamState(false);
  }

  async destroySession(reason = 'RFIDStreamController.destroySession') {
    return this.enqueueNativeOperation(async () => {
      const hadActiveScan = this.currentOwnerId !== null;

      this.desiredScanning = false;
      this.shouldResumeAfterBackground = false;
      this.flushBuffer();
      this.resetStreamState(true);

      if (!hadActiveScan && this.lifecycle === 'idle') {
        return;
      }

      this.setLifecycle('stopping');

      try {
        await ChainwayRfid.stopInventory(reason);
        await ChainwayRfid.stopListening(reason);
      } finally {
        this.currentOwnerId = null;
        this.activeSessionId = null;
        this.bumpListenerEpoch();
        this.setLifecycle('idle');
      }
    });
  }

  handleAppStateChange(nextState: AppStateStatus) {
    const previousState = this.appState;
    this.appState = nextState;

    if (previousState === 'active' && nextState !== 'active') {
      this.flushBuffer();
      this.shouldResumeAfterBackground =
        this.desiredScanning &&
        this.currentOwnerId !== null &&
        this.lifecycle !== 'idle' &&
        this.lifecycle !== 'stopping';

      if (this.shouldResumeAfterBackground) {
        void this.pauseNativeDeviceForBackground();
      }
      return;
    }

    if (previousState !== 'active' && nextState === 'active') {
      void this.recoverAfterAppResume();
    }
  }

  private async pauseNativeDeviceForBackground() {
    return this.enqueueNativeOperation(async () => {
      if (!this.shouldResumeAfterBackground || !this.currentOwnerId) {
        return;
      }

      try {
        this.flushBuffer();
        await ChainwayRfid.stopInventory('RFIDStreamController.background');
        await ChainwayRfid.stopListening('RFIDStreamController.background');
        this.setLifecycle('paused');
      } catch (error) {
        console.warn('[RFIDStreamController]', 'Failed to pause native device on background', error);
      }
    });
  }

  async recoverAfterAppResume() {
    if (
      !this.desiredScanning ||
      !this.activeSessionId ||
      this.lifecycle === 'idle' ||
      this.lifecycle === 'stopping'
    ) {
      return;
    }

    if (this.resumeRecoveryInFlight) {
      return this.resumeRecoveryInFlight;
    }

    this.resumeRecoveryInFlight = this.rebindNativeReaderAfterResume()
      .finally(() => {
        this.resumeRecoveryInFlight = null;
      });

    return this.resumeRecoveryInFlight;
  }

  private resetStreamState(clearSessionId: boolean) {
    this.entriesByEpc.clear();
    this.pendingByEpc.clear();
    this.lastEpc = null;
    this.error = null;
    if (clearSessionId) {
      this.activeSessionId = null;
    }
    this.clearBufferTimer();
    this.notify();
  }

  setMappingStatus(epcRaw: string, mappingStatus: RFIDMappingStatus) {
    const epcKey = normalizeEpc(epcRaw);
    const entry = this.entriesByEpc.get(epcKey);

    if (!entry) {
      return;
    }

    const updatedEntry = { ...entry, mappingStatus };
    this.entriesByEpc.set(epcKey, updatedEntry);
    this.notify();
  }

  handleEvents(events: RfidTagScannedEvent[]) {
    if (this.lifecycle !== 'scanning' && this.lifecycle !== 'starting') {
      return;
    }

    const receivedAt = now();

    events.forEach(event => {
      this.handleEvent(event, receivedAt);
    });

    this.scheduleFlush();
  }

  shouldAttachListener() {
    return (
      this.currentOwnerId !== null &&
      (this.lifecycle === 'starting' || this.lifecycle === 'scanning')
    );
  }

  private async rebindNativeReaderAfterResume() {
    return this.enqueueNativeOperation(async () => {
      if (
        !this.desiredScanning ||
        !this.activeSessionId ||
        !this.currentOwnerId ||
        this.appState !== 'active'
      ) {
        return;
      }

      try {
        this.flushBuffer();
        this.error = null;
        this.bumpListenerEpoch();
        this.setLifecycle('starting');

        const diagnostics = ChainwayRfid.getDiagnostics();
        const receiverRegistered =
          diagnostics.receiverRegistered ??
          diagnostics.nativeDiagnostics?.receiverRegistered ??
          ChainwayRfid.isListening();

        if (!receiverRegistered) {
          console.warn('[RFIDStreamController]', 'RFID listener was stale on app resume; rebinding native receiver.');
        }

        await ChainwayRfid.startListening('RFIDStreamController.appResume');
        await ChainwayRfid.startInventory('RFIDStreamController.appResume');

        this.shouldResumeAfterBackground = false;
        this.lastRecoveryAt = now();
        this.setLifecycle('scanning');
      } catch (error) {
        this.error = error instanceof Error
          ? error.message
          : 'RFID app-resume recovery failed.';
        this.desiredScanning = false;
        this.shouldResumeAfterBackground = false;
        this.setLifecycle('paused');
      }
    });
  }

  private handleEvent(event: RfidTagScannedEvent, receivedAt: number) {
    const epcRaw = event.epc;
    const epcKey = normalizeEpc(epcRaw);

    if (!epcKey) {
      return;
    }

    const existing = this.entriesByEpc.get(epcKey);
    this.lastEpc = epcRaw;

    if (!existing) {
      const entry: RFIDStreamEntry = {
        epcRaw,
        epcKey,
        firstSeenAt: event.timestamp || receivedAt,
        lastSeenAt: event.timestamp || receivedAt,
        readCount: 1,
        duplicateSuppressedCount: 0,
        mappingStatus: 'unknown',
      };

      this.entriesByEpc.set(epcKey, entry);
      this.pendingByEpc.set(epcKey, entry);
      return;
    }

    const isDuplicate =
      receivedAt - existing.lastSeenAt <= DUPLICATE_SUPPRESSION_WINDOW_MS;

    const updatedEntry: RFIDStreamEntry = {
      ...existing,
      epcRaw,
      lastSeenAt: event.timestamp || receivedAt,
      readCount: existing.readCount + 1,
      duplicateSuppressedCount: isDuplicate
        ? existing.duplicateSuppressedCount + 1
        : existing.duplicateSuppressedCount,
    };

    this.entriesByEpc.set(epcKey, updatedEntry);
    this.pendingByEpc.set(epcKey, updatedEntry);
  }

  private scheduleFlush() {
    if (this.bufferTimer) {
      return;
    }

    this.bufferTimer = setTimeout(() => {
      this.flushBuffer();
    }, BUFFER_WINDOW_MS);
  }

  private flushBuffer() {
    if (this.pendingByEpc.size === 0) {
      this.clearBufferTimer();
      return;
    }

    this.pendingByEpc.clear();
    this.clearBufferTimer();
    this.notify();
  }

  private clearBufferTimer() {
    if (!this.bufferTimer) {
      return;
    }

    clearTimeout(this.bufferTimer);
    this.bufferTimer = null;
  }

  private setLifecycle(lifecycle: RFIDScanLifecycleState) {
    this.lifecycle = lifecycle;
    this.notify();
  }

  private bumpListenerEpoch() {
    this.listenerEpoch += 1;
    this.notify();
  }

  private notify() {
    const snapshot = this.getSnapshot();
    this.subscribers.forEach(subscriber => subscriber(snapshot));
  }
}

const globalRFIDStreamController = RFIDStreamController.getInstance();

export function useRFIDStreamController() {
  const controller = useMemo(() => globalRFIDStreamController, []);
  const listenerBindingId = useMemo(() => createControllerId(), []);
  const [snapshot, setSnapshot] = useState<RFIDStreamSnapshot>(
    controller.getSnapshot(),
  );
  const [hasListenerBinding, setHasListenerBinding] = useState(false);

  useEffect(() => {
    const unsubscribe = controller.subscribe(setSnapshot);

    return () => {
      unsubscribe();
      controller.releaseListenerBinding(listenerBindingId);

      if (controller.getSubscriberCount() === 0) {
        void controller.destroySession('RFIDStreamController.unmount');
      }
    };
  }, [controller, listenerBindingId]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextState => {
      controller.handleAppStateChange(nextState);
    });

    return () => {
      subscription.remove();
    };
  }, [controller]);

  useEffect(() => {
    if (hasListenerBinding) {
      return;
    }

    const acquired = controller.acquireListenerBinding(listenerBindingId);
    if (acquired) {
      setHasListenerBinding(true);
    }
  }, [controller, hasListenerBinding, listenerBindingId, snapshot]);

  useEffect(() => {
    if (!hasListenerBinding) {
      return;
    }

    if (!controller.isListenerBindingOwner(listenerBindingId)) {
      setHasListenerBinding(false);
    }
  }, [controller, hasListenerBinding, listenerBindingId, snapshot]);

  useRfidListener({
    enabled: hasListenerBinding && controller.shouldAttachListener(),
    debounceMs: BUFFER_WINDOW_MS,
    duplicateWindowMs: DUPLICATE_SUPPRESSION_WINDOW_MS,
    resetKey: snapshot.listenerEpoch,
    source: 'RFIDStreamController',
    onTags: events => controller.handleEvents(events),
  });

  return {
    controller,
    snapshot,
  };
}

export const getGlobalRFIDStreamController = () => globalRFIDStreamController;
