import { NativeModules, Platform } from 'react-native';
import {
  EventSubscription,
  requireOptionalNativeModule,
} from 'expo-modules-core';

import { playRfidScanSound } from './rfidScanSound';

export const CHAINWAY_RFID_MODULE_NAME = 'ChainwayRfid';
export const CHAINWAY_RFID_ACTION = 'com.rscja.scanner.action.scanner.RFID';
export const CHAINWAY_RFID_EXTRA_KEY = 'data';
export const CHAINWAY_RFID_START_ACTION = 'android.intent.action.START_BARCODE_RFID';
export const CHAINWAY_RFID_STOP_ACTION = 'android.intent.action.STOP_BARCODE_RFID';
export const CHAINWAY_RFID_FALLBACK_START_ACTION = 'ACTION_KE_START';
export const CHAINWAY_RFID_FALLBACK_STOP_ACTION = 'ACTION_KE_STOP';
export const CHAINWAY_RFID_FUNCTION_EXTRA = 'function';
export const CHAINWAY_RFID_FUNCTION_UHF = 11;
export const CHAINWAY_RFID_SCANNER_PACKAGE = 'com.rscja.scanner';
export const RFID_TAG_SCANNED_EVENT = 'rfidTagScanned';
export const CHAINWAY_RFID_JS_BRIDGE_VERSION = '3.2.0';
export const CHAINWAY_RFID_EXPECTED_NATIVE_VERSION = '3.2.0';

const LOG_PREFIX = '[ChainwayRfid]';
const MAX_REGISTRY_KEYS_IN_DIAGNOSTICS = 30;
const INVENTORY_CONFIRMATION_TIMEOUT_MS = 3000;
const INVENTORY_FALLBACK_RETRY_DELAY_MS = 2000;
const INVENTORY_START_WARNING = 'RFID inventory may not have started';
const INVENTORY_START_POSSIBLE_CAUSES = [
  'AppCenter still controlling RFID',
  'Device firmware blocking broadcast',
  'scanner service not active',
];
const LOCAL_STOP_EPC_GRACE_MS = 1000;
const DEVICE_CONTROL_CONFLICT_WARNING = 'RFID engine already active outside this app';
const DEVICE_CONTROL_CONFLICT_SOURCE = 'AppCenter or system scanner service';
const EXTERNAL_EPC_WARNING_THRESHOLD = 2;

export interface RfidTagScannedEvent {
  epc: string;
  timestamp: number;
  rssi?: number;
  antenna?: number;
  phase?: number;
  frequency?: number;
  sdkReadCount?: number;
  pc?: string;
  tid?: string;
}

export type ChainwayRfidDeviceControlConflictWarning = {
  warning: string;
  likelySource: string;
  epcWithoutLocalStartCount: number;
  lastEpcWithoutLocalStartAt: number | null;
};

export type ChainwayRfidInventoryCommandResult = {
  sent?: boolean;
  action?: string;
  'package'?: string;
  'function'?: number;
  timestamp?: number;
  reason?: string;
  flags?: number;
  includeStoppedPackages?: boolean;
  foregroundReceiver?: boolean;
  packageTargeted?: boolean;
  contextAvailable?: boolean;
  reactContextAvailable?: boolean;
  applicationContextAvailable?: boolean;
  receiverRegistered?: boolean;
  resolvedReceiverCount?: number | null;
  failure?: string | null;
  confirmed?: boolean;
  confirmedEpc?: string | null;
  confirmedAt?: number | null;
  confirmationTimeoutMs?: number;
  fallbackAttempted?: boolean;
  fallbackAction?: string;
  fallbackResult?: ChainwayRfidInventoryCommandResult | null;
  warning?: string;
  possibleCause?: string[];
  nativeDiagnostics?: ChainwayRfidNativeDiagnostics | null;
};

export type ChainwayRfidNativeDiagnostics = {
  moduleName?: string;
  moduleVersion?: string;
  nativeBuildId?: string;
  rfidAction?: string;
  rfidExtraKey?: string;
  rfidStartAction?: string;
  rfidStopAction?: string;
  rfidFallbackStartAction?: string;
  rfidFallbackStopAction?: string;
  rfidFunctionExtra?: string;
  rfidFunctionUhf?: number;
  scannerPackage?: string;
  inventoryIntentFlags?: number;
  inventoryConfirmationTimeoutMs?: number;
  inventoryFallbackRetryDelayMs?: number;
  receiverEnabled?: boolean;
  receiverRegistered?: boolean;
  observing?: boolean;
  jsObserverActive?: boolean;
  hasActiveReactInstance?: boolean;
  applicationContextAvailable?: boolean;
  androidSdk?: number;
  moduleCreatedAt?: number;
  lastLifecycleEvent?: string;
  registerAttempts?: number;
  registerFailures?: number;
  lastRegisterFailure?: string | null;
  lastReceiverRegisteredAt?: number | null;
  lastReceiverUnregisteredAt?: number | null;
  listenerStartCount?: number;
  listenerStopCount?: number;
  explicitStartCount?: number;
  explicitStopCount?: number;
  inventoryStartCount?: number;
  inventoryStopCount?: number;
  fallbackInventoryStartCount?: number;
  fallbackInventoryStopCount?: number;
  inventoryCommandFailureCount?: number;
  lastInventoryCommand?: string | null;
  lastInventoryCommandAt?: number | null;
  lastInventoryCommandFailure?: string | null;
  lastInventoryCommandResolvedReceiverCount?: number | null;
  inventoryActiveRequested?: boolean;
  lastInventoryStartRequestedAt?: number | null;
  lastInventoryStopRequestedAt?: number | null;
  epcAfterInventoryStartCount?: number;
  epcWithoutLocalStartCount?: number;
  lastEpcWithoutLocalStartAt?: number | null;
  deviceControlConflictDetected?: boolean;
  deviceControlConflictWarning?: ChainwayRfidDeviceControlConflictWarning | null;
  broadcastCount?: number;
  invalidBroadcastCount?: number;
  emittedEventCount?: number;
  droppedEventCount?: number;
  lastBroadcastAt?: number | null;
  lastRawData?: string | null;
  lastEpc?: string | null;
  lastEpcAt?: number | null;
  lastEmittedAt?: number | null;
};

export type RfidRuntimeDiagnostics = {
  moduleName: typeof CHAINWAY_RFID_MODULE_NAME;
  jsBridgeVersion: typeof CHAINWAY_RFID_JS_BRIDGE_VERSION;
  expectedNativeVersion: typeof CHAINWAY_RFID_EXPECTED_NATIVE_VERSION;
  nativeModuleAvailable: boolean;
  nativeModuleVersion?: string;
  nativeBuildId?: string;
  nativeVersionMatches: boolean | null;
  platform: string;
  registrySource: string;
  availableInExpoModules: boolean;
  availableInNativeModulesProxy: boolean;
  availableInLegacyNativeModulesProxy: boolean;
  expoModuleKeys: string[];
  nativeProxyModuleKeys: string[];
  activeJsListenerCount: number;
  moduleLoadAttempts: number;
  lastNativeModuleError: string | null;
  lastJsReceivedEpc: string | null;
  lastJsEventAt: number | null;
  inventoryStartRequestedAt: number | null;
  inventoryStopRequestedAt: number | null;
  jsEpcWithoutLocalStartCount: number;
  lastJsEpcWithoutLocalStartAt: number | null;
  deviceControlConflictWarning: ChainwayRfidDeviceControlConflictWarning | null;
  receiverRegistered?: boolean;
  nativeDiagnostics?: ChainwayRfidNativeDiagnostics | null;
};

type ChainwayRfidNativeModule = {
  readonly rfidAction?: string;
  readonly rfidExtraKey?: string;
  readonly moduleVersion?: string;
  readonly nativeBuildId?: string;
  addListener?: (
    eventName: typeof RFID_TAG_SCANNED_EVENT,
    listener: (event: RfidTagScannedEvent) => void,
  ) => EventSubscription;
  isListening?: () => boolean;
  isReceiverRegistered?: () => boolean;
  getDiagnostics?: () => ChainwayRfidNativeDiagnostics;
  startInventory?: () => Promise<ChainwayRfidInventoryCommandResult | void>;
  startInventoryFallback?: () => Promise<ChainwayRfidInventoryCommandResult | void>;
  stopInventory?: () => Promise<ChainwayRfidInventoryCommandResult | void>;
  stopInventoryFallback?: () => Promise<ChainwayRfidInventoryCommandResult | void>;
  startListening?: () => Promise<ChainwayRfidNativeDiagnostics | void>;
  stopListening?: () => Promise<ChainwayRfidNativeDiagnostics | void>;
};

type ResolveOptions = {
  reason: string;
  throwInDev?: boolean;
};

let cachedNativeModule: ChainwayRfidNativeModule | null = null;
let moduleLoadAttempts = 0;
let hasLoggedModuleLoadSuccess = false;
let hasLoggedMissingModule = false;
let hasLoggedVersionMismatch = false;
let activeJsListenerCount = 0;
let lastNativeModuleError: string | null = null;
let lastJsReceivedEpc: string | null = null;
let lastJsEventAt: number | null = null;
let inventoryStartRequestedAt: number | null = null;
let inventoryStopRequestedAt: number | null = null;
let jsEpcWithoutLocalStartCount = 0;
let lastJsEpcWithoutLocalStartAt: number | null = null;
let deviceControlConflictWarning: ChainwayRfidDeviceControlConflictWarning | null = null;

const isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__;

const logDebug = (...args: unknown[]) => {
  if (isDevelopment) {
    console.log(LOG_PREFIX, ...args);
  }
};

const logWarn = (...args: unknown[]) => {
  console.warn(LOG_PREFIX, ...args);
};

const logError = (...args: unknown[]) => {
  console.error(LOG_PREFIX, ...args);
};

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const toOptionalNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value.trim());
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const toOptionalString = (value: unknown) => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed || undefined;
};

const normalizeNativeRfidEvent = (
  event: Partial<RfidTagScannedEvent> | null | undefined,
): RfidTagScannedEvent | null => {
  const epc = normalizeEpc(event?.epc || '');

  if (!epc) {
    return null;
  }

  return {
    epc,
    timestamp: Number(event?.timestamp) || Date.now(),
    rssi: toOptionalNumber(event?.rssi),
    antenna: toOptionalNumber(event?.antenna),
    phase: toOptionalNumber(event?.phase),
    frequency: toOptionalNumber(event?.frequency),
    sdkReadCount: toOptionalNumber(event?.sdkReadCount),
    pc: toOptionalString(event?.pc),
    tid: toOptionalString(event?.tid),
  };
};

const getRegistryDebugInfo = () => {
  const expoModules = (globalThis as any).expo?.modules;
  const expoNativeProxy = expoModules?.NativeModulesProxy;
  const legacyNativeProxy = (NativeModules as any)?.NativeUnimoduleProxy;
  const nativeProxyModules =
    expoNativeProxy?.modulesConstants ?? legacyNativeProxy?.modulesConstants;

  const availableInExpoModules = Boolean(expoModules?.[CHAINWAY_RFID_MODULE_NAME]);
  const availableInNativeModulesProxy = Boolean(
    expoNativeProxy?.modulesConstants?.[CHAINWAY_RFID_MODULE_NAME],
  );
  const availableInLegacyNativeModulesProxy = Boolean(
    legacyNativeProxy?.modulesConstants?.[CHAINWAY_RFID_MODULE_NAME],
  );

  const registrySource = availableInExpoModules
    ? 'globalThis.expo.modules'
    : availableInNativeModulesProxy
      ? 'globalThis.expo.modules.NativeModulesProxy'
      : availableInLegacyNativeModulesProxy
        ? 'NativeModules.NativeUnimoduleProxy'
        : 'missing';

  return {
    registrySource,
    availableInExpoModules,
    availableInNativeModulesProxy,
    availableInLegacyNativeModulesProxy,
    expoModuleKeys: Object.keys(expoModules ?? {})
      .sort()
      .slice(0, MAX_REGISTRY_KEYS_IN_DIAGNOSTICS),
    nativeProxyModuleKeys: Object.keys(nativeProxyModules ?? {})
      .sort()
      .slice(0, MAX_REGISTRY_KEYS_IN_DIAGNOSTICS),
  };
};

const buildMissingNativeModuleMessage = (reason: string) => {
  const registryInfo = getRegistryDebugInfo();

  return [
    `${CHAINWAY_RFID_MODULE_NAME} native module is not available at runtime.`,
    `Reason: ${reason}.`,
    'The installed Android APK/dev client was built without modules/chainway-rfid or is stale.',
    `Expected native module version: ${CHAINWAY_RFID_EXPECTED_NATIVE_VERSION}.`,
    `Registry source: ${registryInfo.registrySource}.`,
    'Rebuild and reinstall the Android development client/APK after native module changes.',
  ].join(' ');
};

const readNativeDiagnostics = (
  nativeModule: ChainwayRfidNativeModule | null,
): ChainwayRfidNativeDiagnostics | null => {
  if (!nativeModule?.getDiagnostics) {
    return null;
  }

  try {
    return nativeModule.getDiagnostics();
  } catch (error) {
    lastNativeModuleError = `getDiagnostics failed: ${toErrorMessage(error)}`;
    logWarn(lastNativeModuleError);
    return null;
  }
};

const getNativeVersion = (
  nativeModule: ChainwayRfidNativeModule | null,
  nativeDiagnostics: ChainwayRfidNativeDiagnostics | null,
) => nativeModule?.moduleVersion ?? nativeDiagnostics?.moduleVersion;

const getNativeBuildId = (
  nativeModule: ChainwayRfidNativeModule | null,
  nativeDiagnostics: ChainwayRfidNativeDiagnostics | null,
) => nativeModule?.nativeBuildId ?? nativeDiagnostics?.nativeBuildId;

const validateNativeVersion = (
  nativeModule: ChainwayRfidNativeModule,
  nativeDiagnostics: ChainwayRfidNativeDiagnostics | null,
) => {
  const nativeVersion = getNativeVersion(nativeModule, nativeDiagnostics);

  if (!nativeVersion) {
    logWarn(
      'Native module loaded, but no moduleVersion constant was exposed. Rebuild the Android APK/dev client.',
    );
    return;
  }

  if (
    nativeVersion !== CHAINWAY_RFID_EXPECTED_NATIVE_VERSION &&
    !hasLoggedVersionMismatch
  ) {
    hasLoggedVersionMismatch = true;
    logWarn(
      `Native/JS RFID version mismatch. JS=${CHAINWAY_RFID_JS_BRIDGE_VERSION} native=${nativeVersion}. Rebuild the APK/dev client.`,
    );
  }
};

const getBridgeValidationErrors = (
  nativeModule: ChainwayRfidNativeModule | null,
) => {
  if (!nativeModule) {
    return ['native module is missing'];
  }

  const errors: string[] = [];

  if (typeof nativeModule.addListener !== 'function') {
    errors.push('native module does not expose addListener');
  }

  if (typeof nativeModule.startListening !== 'function') {
    errors.push('native module does not expose startListening');
  }

  if (typeof nativeModule.startInventory !== 'function') {
    errors.push('native module does not expose startInventory');
  }

  if (typeof nativeModule.stopInventory !== 'function') {
    errors.push('native module does not expose stopInventory');
  }

  if (typeof nativeModule.getDiagnostics !== 'function') {
    errors.push('native module does not expose getDiagnostics');
  }

  if (
    nativeModule.rfidAction &&
    nativeModule.rfidAction !== CHAINWAY_RFID_ACTION
  ) {
    errors.push(
      `native rfidAction mismatch: ${nativeModule.rfidAction} !== ${CHAINWAY_RFID_ACTION}`,
    );
  }

  if (
    nativeModule.rfidExtraKey &&
    nativeModule.rfidExtraKey !== CHAINWAY_RFID_EXTRA_KEY
  ) {
    errors.push(
      `native rfidExtraKey mismatch: ${nativeModule.rfidExtraKey} !== ${CHAINWAY_RFID_EXTRA_KEY}`,
    );
  }

  return errors;
};

const resolveNativeModule = ({
  reason,
  throwInDev = false,
}: ResolveOptions): ChainwayRfidNativeModule | null => {
  moduleLoadAttempts += 1;

  try {
    const nativeModule =
      requireOptionalNativeModule<ChainwayRfidNativeModule>(
        CHAINWAY_RFID_MODULE_NAME,
      );

    if (!nativeModule) {
      cachedNativeModule = null;
      lastNativeModuleError = buildMissingNativeModuleMessage(reason);

      if (!hasLoggedMissingModule) {
        hasLoggedMissingModule = true;
        logError(lastNativeModuleError, getRfidDiagnosticsSnapshot(false));
      }

      if (isDevelopment && throwInDev) {
        throw new Error(lastNativeModuleError);
      }

      return null;
    }

    cachedNativeModule = nativeModule;
    lastNativeModuleError = null;
    hasLoggedMissingModule = false;

    const nativeDiagnostics = readNativeDiagnostics(nativeModule);
    validateNativeVersion(nativeModule, nativeDiagnostics);

    if (!hasLoggedModuleLoadSuccess) {
      hasLoggedModuleLoadSuccess = true;
      logDebug('Native module loaded', {
        reason,
        moduleVersion: getNativeVersion(nativeModule, nativeDiagnostics),
        nativeBuildId: getNativeBuildId(nativeModule, nativeDiagnostics),
        diagnostics: nativeDiagnostics,
      });
    }

    return nativeModule;
  } catch (error) {
    const message = toErrorMessage(error);
    lastNativeModuleError = message;

    if (isDevelopment && throwInDev) {
      throw error;
    }

    logError('Native module resolution failed', { reason, message });
    return cachedNativeModule;
  }
};

const getRfidDiagnosticsSnapshot = (
  refreshNativeModule = true,
): RfidRuntimeDiagnostics => {
  const nativeModule = refreshNativeModule
    ? resolveNativeModule({ reason: 'diagnostics', throwInDev: false })
    : cachedNativeModule;
  const nativeDiagnostics = readNativeDiagnostics(nativeModule);
  const registryInfo = getRegistryDebugInfo();
  const nativeVersion = getNativeVersion(nativeModule, nativeDiagnostics);

  return {
    moduleName: CHAINWAY_RFID_MODULE_NAME,
    jsBridgeVersion: CHAINWAY_RFID_JS_BRIDGE_VERSION,
    expectedNativeVersion: CHAINWAY_RFID_EXPECTED_NATIVE_VERSION,
    nativeModuleAvailable: Boolean(nativeModule),
    nativeModuleVersion: nativeVersion,
    nativeBuildId: getNativeBuildId(nativeModule, nativeDiagnostics),
    nativeVersionMatches: nativeVersion
      ? nativeVersion === CHAINWAY_RFID_EXPECTED_NATIVE_VERSION
      : null,
    platform: Platform.OS,
    ...registryInfo,
    activeJsListenerCount,
    moduleLoadAttempts,
    lastNativeModuleError,
    lastJsReceivedEpc,
    lastJsEventAt,
    inventoryStartRequestedAt,
    inventoryStopRequestedAt,
    jsEpcWithoutLocalStartCount,
    lastJsEpcWithoutLocalStartAt,
    deviceControlConflictWarning:
      deviceControlConflictWarning ?? nativeDiagnostics?.deviceControlConflictWarning ?? null,
    receiverRegistered:
      nativeDiagnostics?.receiverRegistered ??
      nativeModule?.isReceiverRegistered?.() ??
      nativeModule?.isListening?.(),
    nativeDiagnostics,
  };
};

const createMissingModuleSubscription = (reason: string): EventSubscription => ({
  remove: () => {
    logWarn('Removed no-op RFID subscription because native module is missing', {
      reason,
      diagnostics: getRfidDiagnosticsSnapshot(false),
    });
  },
});

export const getRfidDiagnostics = () => getRfidDiagnosticsSnapshot(true);

export const assertChainwayRfidRuntime = (reason = 'runtime validation') => {
  const nativeModule = resolveNativeModule({ reason, throwInDev: true });
  const errors = getBridgeValidationErrors(nativeModule);

  if (errors.length > 0) {
    const message = `${CHAINWAY_RFID_MODULE_NAME} runtime validation failed: ${errors.join('; ')}`;
    lastNativeModuleError = message;
    logError(message, getRfidDiagnosticsSnapshot(false));

    if (isDevelopment) {
      throw new Error(message);
    }
  }

  const diagnostics = getRfidDiagnosticsSnapshot(false);
  logDebug('Runtime validation passed', diagnostics);
  return diagnostics;
};

export const isChainwayRfidAvailable = () =>
  Boolean(resolveNativeModule({ reason: 'availability check', throwInDev: false }));

export const normalizeEpc = (value: string) =>
  value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

const isLocalInventoryActive = () =>
  inventoryStartRequestedAt !== null &&
  (inventoryStopRequestedAt === null ||
    inventoryStartRequestedAt > inventoryStopRequestedAt ||
    Date.now() - inventoryStopRequestedAt <= LOCAL_STOP_EPC_GRACE_MS);

const createDeviceControlConflictWarning = (count: number, timestamp: number | null) => ({
  warning: DEVICE_CONTROL_CONFLICT_WARNING,
  likelySource: DEVICE_CONTROL_CONFLICT_SOURCE,
  epcWithoutLocalStartCount: count,
  lastEpcWithoutLocalStartAt: timestamp,
});

const recordJsRfidEvent = (
  event: RfidTagScannedEvent,
  source: string,
) => {
  lastJsReceivedEpc = event.epc;
  lastJsEventAt = event.timestamp;

  if (isLocalInventoryActive()) {
    return;
  }

  jsEpcWithoutLocalStartCount += 1;
  lastJsEpcWithoutLocalStartAt = event.timestamp;

  if (jsEpcWithoutLocalStartCount >= EXTERNAL_EPC_WARNING_THRESHOLD) {
    deviceControlConflictWarning = createDeviceControlConflictWarning(
      jsEpcWithoutLocalStartCount,
      lastJsEpcWithoutLocalStartAt,
    );
    logWarn('RFID EPC received while this app has no active inventory request', {
      source,
      warning: deviceControlConflictWarning,
    });
  }
};

const getConfirmedNativeEpc = (
  nativeModule: ChainwayRfidNativeModule,
  startedAt: number,
): RfidTagScannedEvent | null => {
  const diagnostics = readNativeDiagnostics(nativeModule);
  const timestamp = diagnostics?.lastEpcAt ?? null;
  const epc = normalizeEpc(diagnostics?.lastEpc ?? '');

  if (timestamp && timestamp >= startedAt && epc) {
    return { epc, timestamp };
  }

  return null;
};

const waitForConfirmedEpc = (
  nativeModule: ChainwayRfidNativeModule,
  startedAt: number,
  timeoutMs: number,
): Promise<RfidTagScannedEvent | null> => {
  const alreadyConfirmed = getConfirmedNativeEpc(nativeModule, startedAt);

  if (alreadyConfirmed) {
    return Promise.resolve(alreadyConfirmed);
  }

  if (!nativeModule.addListener || timeoutMs <= 0) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve(getConfirmedNativeEpc(nativeModule, startedAt));
      }, Math.max(0, timeoutMs));
    });
  }

  return new Promise(resolve => {
    let resolved = false;
    let subscription: EventSubscription | null = null;

    const finish = (event: RfidTagScannedEvent | null) => {
      if (resolved) {
        return;
      }

      resolved = true;
      subscription?.remove();
      clearTimeout(timer);
      resolve(event ?? getConfirmedNativeEpc(nativeModule, startedAt));
    };

    const timer = setTimeout(() => finish(null), timeoutMs);

    try {
      subscription = nativeModule.addListener!(RFID_TAG_SCANNED_EVENT, event => {
        const normalizedEvent = normalizeNativeRfidEvent(event);

        if (!normalizedEvent || normalizedEvent.timestamp < startedAt) {
          return;
        }

        void playRfidScanSound();
        recordJsRfidEvent(normalizedEvent, 'inventoryConfirmation');
        finish(normalizedEvent);
      });
    } catch (error) {
      logWarn('RFID confirmation listener could not attach; falling back to native diagnostics polling', {
        message: toErrorMessage(error),
      });
    }
  });
};

const toInventoryCommandResult = (
  result: ChainwayRfidInventoryCommandResult | void | null,
): ChainwayRfidInventoryCommandResult =>
  (result ?? {}) as ChainwayRfidInventoryCommandResult;

export const addRfidTagListener = (
  listener: (event: RfidTagScannedEvent) => void,
  source = 'unspecified',
): EventSubscription => {
  const nativeModule = resolveNativeModule({
    reason: `addRfidTagListener:${source}`,
    throwInDev: true,
  });

  if (!nativeModule) {
    return createMissingModuleSubscription(source);
  }

  const errors = getBridgeValidationErrors(nativeModule);
  if (errors.length > 0) {
    const message = `${CHAINWAY_RFID_MODULE_NAME} listener cannot attach: ${errors.join('; ')}`;
    lastNativeModuleError = message;
    logError(message, getRfidDiagnosticsSnapshot(false));

    if (isDevelopment) {
      throw new Error(message);
    }

    return createMissingModuleSubscription(source);
  }

  activeJsListenerCount += 1;
  logDebug('Attaching JS RFID listener', {
    source,
    activeJsListenerCount,
    diagnostics: getRfidDiagnosticsSnapshot(false),
  });

  let nativeSubscription: EventSubscription;

  try {
    nativeSubscription = nativeModule.addListener!(RFID_TAG_SCANNED_EVENT, event => {
      const normalizedEvent = normalizeNativeRfidEvent(event);
      if (!normalizedEvent) {
        logWarn('Ignoring native RFID event without a valid EPC', event);
        return;
      }

      void playRfidScanSound();
      recordJsRfidEvent(normalizedEvent, source);
      logDebug('JS RFID event received', normalizedEvent);
      listener(normalizedEvent);
    });
  } catch (error) {
    activeJsListenerCount = Math.max(0, activeJsListenerCount - 1);
    const message = `Failed to attach RFID native event listener: ${toErrorMessage(error)}`;
    lastNativeModuleError = message;
    logError(message, getRfidDiagnosticsSnapshot(false));

    if (isDevelopment) {
      throw error;
    }

    return createMissingModuleSubscription(source);
  }

  let removed = false;

  return {
    remove: () => {
      if (removed) {
        return;
      }

      removed = true;
      nativeSubscription.remove();
      activeJsListenerCount = Math.max(0, activeJsListenerCount - 1);
      logDebug('Removed JS RFID listener', {
        source,
        activeJsListenerCount,
        diagnostics: getRfidDiagnosticsSnapshot(false),
      });
    },
  };
};

export const startRfidListening = async (reason = 'manual') => {
  const nativeModule = resolveNativeModule({
    reason: `startRfidListening:${reason}`,
    throwInDev: true,
  });

  if (!nativeModule?.startListening) {
    const message = `${CHAINWAY_RFID_MODULE_NAME}.startListening is unavailable.`;
    lastNativeModuleError = message;
    logError(message, getRfidDiagnosticsSnapshot(false));

    if (isDevelopment) {
      throw new Error(message);
    }

    return null;
  }

  logDebug('Requesting native receiver start', { reason });
  const diagnostics = await nativeModule.startListening();
  const snapshot = diagnostics ?? readNativeDiagnostics(nativeModule);
  logDebug('Native receiver start completed', snapshot);
  return snapshot;
};

export const startRfidInventory = async (reason = 'manual') => {
  const nativeModule = resolveNativeModule({
    reason: `startRfidInventory:${reason}`,
    throwInDev: true,
  });

  if (!nativeModule?.startInventory) {
    const message = `${CHAINWAY_RFID_MODULE_NAME}.startInventory is unavailable.`;
    lastNativeModuleError = message;
    logError(message, getRfidDiagnosticsSnapshot(false));

    if (isDevelopment) {
      throw new Error(message);
    }

    return null;
  }

  logDebug('Requesting native RFID inventory start', { reason });
  await startRfidListening(`startInventory:${reason}`);

  inventoryStartRequestedAt = Date.now();
  inventoryStopRequestedAt = null;
  deviceControlConflictWarning = null;

  const primaryResult = toInventoryCommandResult(await nativeModule.startInventory());
  const primaryStartedAt = primaryResult.timestamp ?? inventoryStartRequestedAt;

  let confirmedEvent = await waitForConfirmedEpc(
    nativeModule,
    primaryStartedAt,
    INVENTORY_FALLBACK_RETRY_DELAY_MS,
  );

  let fallbackAttempted = false;
  let fallbackResult: ChainwayRfidInventoryCommandResult | null = null;

  if (!confirmedEvent && nativeModule.startInventoryFallback) {
    fallbackAttempted = true;
    logWarn('No RFID EPC confirmation after primary start; sending fallback inventory start', {
      reason,
      primaryAction: primaryResult.action ?? CHAINWAY_RFID_START_ACTION,
      fallbackAction: CHAINWAY_RFID_FALLBACK_START_ACTION,
    });

    fallbackResult = toInventoryCommandResult(await nativeModule.startInventoryFallback());
    confirmedEvent = await waitForConfirmedEpc(
      nativeModule,
      primaryStartedAt,
      Math.max(0, INVENTORY_CONFIRMATION_TIMEOUT_MS - INVENTORY_FALLBACK_RETRY_DELAY_MS),
    );
  } else if (!confirmedEvent) {
    confirmedEvent = await waitForConfirmedEpc(
      nativeModule,
      primaryStartedAt,
      Math.max(0, INVENTORY_CONFIRMATION_TIMEOUT_MS - INVENTORY_FALLBACK_RETRY_DELAY_MS),
    );
  }

  const nativeDiagnostics = readNativeDiagnostics(nativeModule);
  const result: ChainwayRfidInventoryCommandResult = {
    ...primaryResult,
    confirmed: Boolean(confirmedEvent),
    confirmedEpc: confirmedEvent?.epc ?? null,
    confirmedAt: confirmedEvent?.timestamp ?? null,
    confirmationTimeoutMs: INVENTORY_CONFIRMATION_TIMEOUT_MS,
    fallbackAttempted,
    fallbackAction: fallbackAttempted ? CHAINWAY_RFID_FALLBACK_START_ACTION : undefined,
    fallbackResult,
    nativeDiagnostics,
  };

  if (!confirmedEvent) {
    result.warning = INVENTORY_START_WARNING;
    result.possibleCause = INVENTORY_START_POSSIBLE_CAUSES;
    logWarn('RFID inventory start was not confirmed by an EPC broadcast', result);
  } else {
    logDebug('Native RFID inventory start confirmed', result);
  }

  return result;
};

export const stopRfidInventory = async (reason = 'manual') => {
  const nativeModule = resolveNativeModule({
    reason: `stopRfidInventory:${reason}`,
    throwInDev: false,
  });

  if (!nativeModule?.stopInventory) {
    logWarn(`${CHAINWAY_RFID_MODULE_NAME}.stopInventory is unavailable.`, {
      diagnostics: getRfidDiagnosticsSnapshot(false),
    });
    return null;
  }

  logDebug('Requesting native RFID inventory stop', { reason });
  inventoryStopRequestedAt = Date.now();

  const primaryResult = toInventoryCommandResult(await nativeModule.stopInventory());
  let fallbackResult: ChainwayRfidInventoryCommandResult | null = null;

  if (nativeModule.stopInventoryFallback) {
    fallbackResult = toInventoryCommandResult(await nativeModule.stopInventoryFallback());
  }

  const result: ChainwayRfidInventoryCommandResult = {
    ...primaryResult,
    fallbackAttempted: Boolean(fallbackResult),
    fallbackAction: fallbackResult ? CHAINWAY_RFID_FALLBACK_STOP_ACTION : undefined,
    fallbackResult,
    nativeDiagnostics: readNativeDiagnostics(nativeModule),
  };

  logDebug('Native RFID inventory stop completed', result);
  return result;
};

export const stopRfidListening = async (reason = 'manual') => {
  const nativeModule = resolveNativeModule({
    reason: `stopRfidListening:${reason}`,
    throwInDev: false,
  });

  if (!nativeModule?.stopListening) {
    logWarn(`${CHAINWAY_RFID_MODULE_NAME}.stopListening is unavailable.`, {
      diagnostics: getRfidDiagnosticsSnapshot(false),
    });
    return null;
  }

  logDebug('Requesting native receiver stop', { reason });
  const diagnostics = await nativeModule.stopListening();
  const snapshot = diagnostics ?? readNativeDiagnostics(nativeModule);
  logDebug('Native receiver stop completed', snapshot);
  return snapshot;
};

export const isRfidListening = () => {
  const nativeModule = resolveNativeModule({
    reason: 'isRfidListening',
    throwInDev: false,
  });

  return (
    nativeModule?.isReceiverRegistered?.() ??
    nativeModule?.isListening?.() ??
    false
  );
};

export const ChainwayRfid = {
  addRfidTagListener,
  assertRuntime: assertChainwayRfidRuntime,
  getDiagnostics: getRfidDiagnostics,
  isAvailable: isChainwayRfidAvailable,
  isListening: isRfidListening,
  normalizeEpc,
  startInventory: startRfidInventory,
  stopInventory: stopRfidInventory,
  startListening: startRfidListening,
  stopListening: stopRfidListening,
};
