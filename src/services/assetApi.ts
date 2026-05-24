import { apiRequest } from '../config/api';
import { notifyAssetDeleted, notifyAssetStatusChanged, notifyAssetUpdated } from './assetSync';

export type AssetRecord = {
  id?: string;
  _id?: string;
  assetName?: string;
  name?: string;
  assetNumber?: string | null;
  epc?: string | null;
  epcKey?: string | null;
  section?: string | null;
  department?: string | null;
  category?: string | null;
  status?: string | null;
  serialNumber?: string | null;
  location?: string | null;
  verificationStatus?: string | null;
  updatedBy?: string | null;
  assignmentInformation?: {
    assignedAt?: string;
    assignedBy?: string;
    source?: string;
  } | null;
  assignmentLifecycleHistory?: Array<{
    fromSection?: string;
    toSection?: string;
    assignedAt?: string;
    assignedBy?: string;
    source?: string;
  }>;
  statusHistory?: Array<{
    previousStatus?: string;
    newStatus?: string;
    changedAt?: string;
    changedBy?: string;
    source?: string;
  }>;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type GetAssetResponse = { success: boolean; message: string; data: AssetRecord };

export const getAssetId = (asset: AssetRecord) => String(asset.id || asset._id || '');

export const getAssetDisplayName = (asset: AssetRecord) =>
  asset.assetName || asset.name || 'Unnamed asset';

export const deleteAssetById = async (assetId: string) => {
  const response = await apiRequest<GetAssetResponse>(
    `/api/assets/${encodeURIComponent(assetId)}`,
    { method: 'DELETE' },
  );
  notifyAssetDeleted(assetId);
  return response;
};

export type PatchAssetPayload = {
  section?: string;
  status?: string;
};

export const patchAssetById = async (assetId: string, body: PatchAssetPayload) => {
  const response = await apiRequest<GetAssetResponse>(
    `/api/assets/${encodeURIComponent(assetId)}`,
    { method: 'PATCH', body },
  );

  if (body.status) {
    notifyAssetStatusChanged(assetId);
  }
  notifyAssetUpdated(assetId);

  return response;
};

export const fetchAssetById = async (assetId: string) => {
  const response = await apiRequest<GetAssetResponse>(
    `/api/assets/${encodeURIComponent(assetId)}`,
    { method: 'GET' },
  );
  return response.data;
};

const normalizeSectionOptions = (values: unknown) => {
  if (!Array.isArray(values)) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map(value => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right));
};

export const fetchSectionOptions = async () => {
  const optionEndpoints = [
    '/api/assets/sections/options',
    '/api/assets/departments/options',
  ];

  for (const endpoint of optionEndpoints) {
    try {
      const result = await apiRequest<{ sections?: string[]; departments?: string[] }>(
        endpoint,
        { method: 'GET' },
      );
      const options = normalizeSectionOptions(result.sections || result.departments);

      if (options.length > 0) {
        return options;
      }
    } catch (error) {
      console.error(`Failed to load section options from ${endpoint}`, error);
    }
  }

  const result = await apiRequest<{ assets?: AssetRecord[] }>('/api/assets', { method: 'GET' });
  return normalizeSectionOptions(
    (result.assets || []).map(asset => asset.section || asset.department || asset.category || asset.location),
  );
};

export const fetchDepartmentOptions = fetchSectionOptions;

export const fetchAssignmentLifecycle = async () => {
  const result = await apiRequest<{ lifecycle: unknown[] }>(
    '/api/assets/lifecycle/history',
    { method: 'GET' },
  );
  return result.lifecycle || [];
};

export const fetchAssetsByStatus = async (status: string) => {
  const encodedStatus = encodeURIComponent(status);
  const result = await apiRequest<{ assets: AssetRecord[] }>(
    `/api/assets?status=${encodedStatus}`,
    { method: 'GET' },
  );

  return result.assets || [];
};

export type SectionSummary = {
  section: string;
  totalAssets: number;
  healthyAssets: number;
  repairableAssets: number;
  beyondRepairAssets: number;
  createdAt?: string | null;
  createdBy?: string | null;
};

export const fetchSectionsSummary = async () => {
  const result = await apiRequest<{ summary?: SectionSummary[] }>(
    '/api/assets/sections/summary',
    { method: 'GET' },
  );

  return result.summary || [];
};

export const fetchAssetsBySection = async (section: string) => {
  const encodedSection = encodeURIComponent(section);
  const result = await apiRequest<{ assets: AssetRecord[] }>(
    `/api/assets?section=${encodedSection}`,
    { method: 'GET' },
  );

  return result.assets || [];
};

export type CreateSectionPayload = {
  section: string;
  manager: string;
  description?: string;
};

export const createSection = async (body: CreateSectionPayload) => {
  return apiRequest<{ success: boolean; message: string; data?: unknown }>(
    '/api/assets/sections',
    { method: 'POST', body },
  );
};
