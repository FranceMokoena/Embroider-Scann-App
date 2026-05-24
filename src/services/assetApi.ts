import { apiRequest } from '../config/api';
import {
  notifyAssetDeleted,
  notifyAssetStatusChanged,
  notifyAssetUpdated,
  notifySectionTransfer,
  type SectionTransferPayload,
} from './assetSync';

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
  verifiedAt?: string | null;
  verifiedBy?: string | null;
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
  verificationHistory?: Array<{
    section?: string;
    result?: string;
    auditId?: string;
    verifiedAt?: string;
    verifiedBy?: string;
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

export type TransferAssetsPayload = {
  assetIds: string[];
  toSection: string;
  reason?: string;
  transferType?: string;
  batchId?: string;
};

export type TransferAssetsResultItem = {
  assetId: string;
  fromSection?: string | null;
  toSection: string;
  asset?: AssetRecord;
};

export type TransferAssetsResponse = {
  success: boolean;
  message?: string;
  batchId: string;
  toSection: string;
  transferType?: string;
  transferred: TransferAssetsResultItem[];
  skipped: Array<{
    assetId: string;
    fromSection?: string | null;
    toSection: string;
    reason?: string;
  }>;
  errors: Array<{
    assetId: string;
    message: string;
    statusCode?: number;
  }>;
  summary: {
    requested: number;
    transferred: number;
    skipped: number;
    failed: number;
  };
};

const buildSectionTransferPayload = (input: {
  batchId: string;
  toSection: string;
  transferred: TransferAssetsResultItem[];
  skipped?: TransferAssetsResponse['skipped'];
}): SectionTransferPayload => {
  const fromSections = Array.from(
    new Set(
      [...input.transferred, ...(input.skipped || [])]
        .map(item => (item.fromSection || '').trim())
        .filter(Boolean),
    ),
  );

  return {
    batchId: input.batchId,
    assetIds: input.transferred.map(item => String(item.assetId)),
    toSection: input.toSection,
    fromSections,
    transferredCount: input.transferred.length,
    timestamp: Date.now(),
  };
};

export const transferAssets = async (payload: TransferAssetsPayload) => {
  const response = await apiRequest<TransferAssetsResponse>('/api/assets/transfers', {
    method: 'POST',
    body: payload,
  });

  if (response.summary.transferred > 0) {
    notifySectionTransfer(
      buildSectionTransferPayload({
        batchId: response.batchId,
        toSection: response.toSection,
        transferred: response.transferred,
        skipped: response.skipped,
      }),
    );
  }

  response.transferred.forEach(item => {
    if (item.assetId) {
      notifyAssetUpdated(item.assetId);
    }
  });

  return response;
};

export const patchAssetById = async (assetId: string, body: PatchAssetPayload) => {
  const response = await apiRequest<GetAssetResponse>(
    `/api/assets/${encodeURIComponent(assetId)}`,
    { method: 'PATCH', body },
  );

  if (body.section) {
    const history = response.data?.assignmentLifecycleHistory;
    const lastEntry = Array.isArray(history) ? history[history.length - 1] : null;
    const fromSection = lastEntry?.fromSection?.trim();

    notifySectionTransfer({
      batchId: `patch-${assetId}-${Date.now()}`,
      assetIds: [assetId],
      toSection: body.section.trim(),
      fromSections: fromSection ? [fromSection] : [],
      transferredCount: 1,
      timestamp: Date.now(),
    });
  }

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

export const fetchAllAssets = async () => {
  const result = await apiRequest<{ assets?: AssetRecord[] }>('/api/assets', {
    method: 'GET',
  });

  return result.assets || [];
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

export const fetchAssetSectionOptions = async () => {
  const result = await apiRequest<{ sections?: string[] }>(
    '/api/assets/sections/options',
    { method: 'GET' },
  );

  return normalizeSectionOptions(result.sections);
};

export type AssetLifecycleRecord = {
  _id?: string;
  assetId?: string;
  assetName?: string;
  assetNumber?: string;
  fromSection?: string;
  toSection?: string;
  assignedBy?: string;
  assignedAt?: string;
  lastUpdated?: string;
  transferType?: string;
  reason?: string;
  status?: string;
  assetStatus?: string;
  verificationStatus?: string;
};

type RawAssetLifecycleRecord = AssetLifecycleRecord & {
  initialSection?: string;
  currentSection?: string;
  assignmentDate?: string;
};

const normalizeLifecycleRecord = (record: RawAssetLifecycleRecord): AssetLifecycleRecord => ({
  _id: record._id,
  assetId: record.assetId,
  assetName: record.assetName,
  assetNumber: record.assetNumber,
  fromSection: record.fromSection || record.initialSection,
  toSection: record.toSection || record.currentSection,
  assignedBy: record.assignedBy,
  assignedAt: record.assignedAt || record.assignmentDate,
  lastUpdated: record.lastUpdated,
  transferType: record.transferType,
  reason: record.reason,
  status: record.status,
  assetStatus: record.assetStatus,
  verificationStatus: record.verificationStatus,
});

export const fetchAssignmentLifecycle = async () => {
  const result = await apiRequest<{ lifecycle: RawAssetLifecycleRecord[] }>(
    '/api/assets/lifecycle/history',
    { method: 'GET' },
  );
  return (result.lifecycle || []).map(normalizeLifecycleRecord);
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
  manager?: string | null;
};

export const fetchSectionsSummary = async () => {
  const result = await apiRequest<{ summary?: SectionSummary[] }>(
    '/api/assets/sections/summary',
    { method: 'GET' },
  );

  return result.summary || [];
};

export const exportSectionsPdf = async (section?: string) => {
  const query = section ? `?section=${encodeURIComponent(section)}` : '';
  return apiRequest<{ pdfBase64?: string }>(`/api/assets/sections/export${query}`, { method: 'GET' });
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
