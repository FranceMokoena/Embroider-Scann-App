type AssetSyncEventType =
  | 'assetUpdated'
  | 'assetDeleted'
  | 'assetAssigned'
  | 'assetStatusChanged';

type AssetSyncPayload = {
  assetId?: string;
  source?: string;
};

type AssetSyncSubscriber = (event: AssetSyncEventType, payload: AssetSyncPayload) => void;

const subscribers = new Set<AssetSyncSubscriber>();

export const subscribeToAssetSync = (subscriber: AssetSyncSubscriber) => {
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
};

const publishAssetSyncEvent = (event: AssetSyncEventType, payload: AssetSyncPayload = {}) => {
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
