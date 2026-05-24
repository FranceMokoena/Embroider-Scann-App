export type AssetSyncEventType =
  | 'assetUpdated'
  | 'assetDeleted'
  | 'assetAssigned'
  | 'assetStatusChanged'
  | 'assetCreated'
  | 'sectionTransferCompleted';

export type AssetSyncPayload = {
  assetId?: string;
  source?: string;
};

export type SectionTransferPayload = {
  batchId: string;
  assetIds: string[];
  toSection: string;
  fromSections: string[];
  transferredCount: number;
  timestamp: number;
};

export type AssetSyncEventPayload = AssetSyncPayload | SectionTransferPayload;

type AssetSyncSubscriber = (
  event: AssetSyncEventType,
  payload: AssetSyncEventPayload,
) => void;

const subscribers = new Set<AssetSyncSubscriber>();

export const subscribeToAssetSync = (subscriber: AssetSyncSubscriber) => {
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
};

export const subscribeToSectionTransfers = (
  handler: (payload: SectionTransferPayload) => void,
) =>
  subscribeToAssetSync((event, payload) => {
    if (event === 'sectionTransferCompleted') {
      handler(payload as SectionTransferPayload);
    }
  });

const publishAssetSyncEvent = (
  event: AssetSyncEventType,
  payload: AssetSyncEventPayload = {},
) => {
  subscribers.forEach(subscriber => {
    try {
      subscriber(event, payload);
    } catch (error) {
      console.error('Asset sync subscriber error:', error);
    }
  });
};

export const notifyAssetUpdated = (assetId?: string) =>
  publishAssetSyncEvent('assetUpdated', { assetId, source: 'assetApi' });

export const notifyAssetDeleted = (assetId?: string) =>
  publishAssetSyncEvent('assetDeleted', { assetId, source: 'assetApi' });

export const notifyAssetAssigned = (assetId?: string) =>
  publishAssetSyncEvent('assetAssigned', { assetId, source: 'assetApi' });

export const notifyAssetStatusChanged = (assetId?: string) =>
  publishAssetSyncEvent('assetStatusChanged', { assetId, source: 'assetApi' });

export const notifyAssetCreated = (assetId?: string) =>
  publishAssetSyncEvent('assetCreated', { assetId, source: 'assetApi' });

export const notifySectionTransfer = (payload: SectionTransferPayload) => {
  publishAssetSyncEvent('sectionTransferCompleted', payload);
};

export const isSectionTransferPayload = (
  payload: AssetSyncEventPayload,
): payload is SectionTransferPayload =>
  typeof (payload as SectionTransferPayload).batchId === 'string'
  && Array.isArray((payload as SectionTransferPayload).assetIds);
