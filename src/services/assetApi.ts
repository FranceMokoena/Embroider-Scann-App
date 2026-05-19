import { apiRequest } from '../config/api';

export type AssetRecord = {
  id?: string;
  _id?: string;
  assetName?: string;
  name?: string;
  assetNumber?: string | null;
  epc?: string | null;
  epcKey?: string | null;
  department?: string | null;
  category?: string | null;
  status?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  verificationStatus?: string | null;
  assignmentLifecycleHistory?: Array<{
    fromSection?: string;
    toSection?: string;
    assignedAt?: string;
    assignedBy?: string;
    source?: string;
  }>;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export const getAssetId = (asset: AssetRecord) => String(asset.id || asset._id || '');

export const getAssetDisplayName = (asset: AssetRecord) =>
  asset.assetName || asset.name || 'Unnamed asset';

export const deleteAssetById = async (assetId: string) =>
  apiRequest<{ success: boolean; message: string; data: AssetRecord }>(
    `/api/assets/${encodeURIComponent(assetId)}`,
    { method: 'DELETE' },
  );

export type PatchAssetPayload = {
  department?: string;
  location?: string;
  status?: string;
};

export const patchAssetById = async (assetId: string, body: PatchAssetPayload) =>
  apiRequest<{ success: boolean; message: string; data: AssetRecord }>(
    `/api/assets/${encodeURIComponent(assetId)}`,
    { method: 'PATCH', body },
  );

export const fetchAssetsByStatus = async (status: string) => {
  const encodedStatus = encodeURIComponent(status);
  const result = await apiRequest<{ assets: AssetRecord[] }>(
    `/api/assets?status=${encodedStatus}`,
    { method: 'GET' },
  );

  return result.assets || [];
};
