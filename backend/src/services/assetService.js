"use strict";

const Asset = require('../models/Asset');

const EPC_REGEX = /^[A-Z0-9]{12,24}$/;
const STATUS_VALUES = ['Healthy', 'Repairable', 'Beyond Repair'];

const createServiceError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const trimString = value => (typeof value === 'string' ? value.trim() : '');
const normalizeOptionalString = value => {
  const trimmed = trimString(value);
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeEpc = value => trimString(value).toUpperCase();

const mapAssetResponse = asset => ({
  id: asset._id,
  assetName: asset.assetName,
  assetNumber: asset.assetNumber,
  serialNumber: asset.serialNumber || null,
  epc: asset.epc,
  category: asset.category || null,
  department: asset.category || null,
  status: asset.status || null,
  location: asset.location || null,
  assignedTo: asset.assignedTo || null,
  assignmentInformation: asset.assignmentInformation || null,
  verificationHistory: asset.verificationHistory || [],
  createdAt: asset.createdAt,
  updatedAt: asset.updatedAt,
});

const validateCreateAssetInput = payload => {
  const assetName = trimString(payload.assetName);
  const assetNumber = trimString(payload.assetNumber);
  const epc = normalizeEpc(payload.epc);
  const status = normalizeOptionalString(payload.status);

  if (!assetName) {
    throw createServiceError('assetName is required', 400);
  }

  if (!assetNumber) {
    throw createServiceError('assetNumber is required', 400);
  }

  if (!epc) {
    throw createServiceError('epc is required', 400);
  }

  if (!EPC_REGEX.test(epc)) {
    throw createServiceError('epc must be 12-24 alphanumeric characters', 400);
  }

  if (status && !STATUS_VALUES.includes(status)) {
    throw createServiceError(`status must be one of: ${STATUS_VALUES.join(', ')}`, 400);
  }

  return {
    assetName,
    assetNumber,
    serialNumber: normalizeOptionalString(payload.serialNumber),
    epc,
    category: normalizeOptionalString(payload.category) || normalizeOptionalString(payload.department),
    status,
    location: normalizeOptionalString(payload.location),
    assignedTo: normalizeOptionalString(payload.assignedTo),
    assignmentInformation: payload.userId
      ? {
          assignedAt: new Date(),
          assignedBy: payload.userId,
          source: payload.assignmentSource || 'asset_create',
        }
      : undefined,
  };
};

const createAsset = async payload => {
  const normalized = validateCreateAssetInput(payload);

  const existingByAssetNumber = await Asset.findOne({ assetNumber: normalized.assetNumber });
  if (existingByAssetNumber) {
    throw createServiceError('assetNumber already exists', 409);
  }

  const existingByEpc = await Asset.findOne({ epc: normalized.epc });
  if (existingByEpc) {
    throw createServiceError('epc already exists', 409);
  }

  try {
    const asset = await Asset.create(normalized);
    return mapAssetResponse(asset);
  } catch (error) {
    if (error && error.code === 11000) {
      if (error.keyPattern && error.keyPattern.assetNumber) {
        throw createServiceError('assetNumber already exists', 409);
      }

      if (error.keyPattern && error.keyPattern.epc) {
        throw createServiceError('epc already exists', 409);
      }

      throw createServiceError('Asset uniqueness validation failed', 409);
    }

    throw error;
  }
};

const createBulkAssets = async payload => {
  const epcs = Array.isArray(payload.epcs)
    ? payload.epcs.map(normalizeEpc).filter(Boolean)
    : [];

  const uniqueEpcs = Array.from(new Set(epcs));
  if (uniqueEpcs.length === 0) {
    throw createServiceError('epcs must contain at least one EPC', 400);
  }

  const created = [];
  const skipped = [];

  for (let index = 0; index < uniqueEpcs.length; index += 1) {
    const epc = uniqueEpcs[index];
    const suffix = uniqueEpcs.length === 1 ? '' : `-${String(index + 1).padStart(3, '0')}`;

    try {
      const asset = await createAsset({
        ...payload,
        epc,
        assetName: uniqueEpcs.length === 1
          ? payload.assetName
          : `${trimString(payload.assetName)} ${String(index + 1).padStart(3, '0')}`,
        assetNumber: `${trimString(payload.assetNumber)}${suffix}`,
        assignmentSource: 'bulk_rfid_registration',
      });
      created.push(asset);
    } catch (error) {
      if (error.statusCode === 409) {
        skipped.push({ epc, reason: error.message });
        continue;
      }

      throw error;
    }
  }

  return {
    created,
    skipped,
    requestedCount: uniqueEpcs.length,
    createdCount: created.length,
    skippedCount: skipped.length,
  };
};

const getAssetByEPC = async epc => {
  const normalizedEpc = normalizeEpc(epc);
  if (!normalizedEpc) {
    throw createServiceError('epc is required', 400);
  }

  const asset = await Asset.findOne({ epc: normalizedEpc });
  return asset ? mapAssetResponse(asset) : null;
};

const buildAssetFilter = filters => {
  const query = {};

  if (filters.status && STATUS_VALUES.includes(filters.status)) {
    query.status = filters.status;
  }

  if (filters.location) {
    query.location = trimString(filters.location);
  }

  if (filters.department) {
    query.category = trimString(filters.department);
  }

  if (filters.q) {
    const search = new RegExp(trimString(filters.q).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { assetName: search },
      { assetNumber: search },
      { serialNumber: search },
      { epc: search },
    ];
  }

  return query;
};

const getAllAssets = async (filters = {}) => {
  const assets = await Asset.find(buildAssetFilter(filters)).sort({ createdAt: -1 });
  return assets.map(mapAssetResponse);
};

const getAssetSummary = async () => {
  const [healthy, repairable, beyondRepair, total] = await Promise.all([
    Asset.countDocuments({ status: 'Healthy' }),
    Asset.countDocuments({ status: 'Repairable' }),
    Asset.countDocuments({ status: 'Beyond Repair' }),
    Asset.countDocuments({}),
  ]);

  return {
    total,
    Healthy: healthy,
    Repairable: repairable,
    'Beyond Repair': beyondRepair,
  };
};

const verifyRoomInventory = async ({ location, epcs, userId }) => {
  const normalizedLocation = normalizeOptionalString(location);
  if (!normalizedLocation) {
    throw createServiceError('location is required', 400);
  }

  const scannedEpcs = Array.isArray(epcs)
    ? epcs.map(normalizeEpc).filter(Boolean)
    : [];

  if (scannedEpcs.length === 0) {
    throw createServiceError('epcs must contain at least one EPC', 400);
  }

  const uniqueScannedEpcs = Array.from(new Set(scannedEpcs));
  const duplicateReads = scannedEpcs.length - uniqueScannedEpcs.length;
  const [expectedAssets, scannedAssets] = await Promise.all([
    Asset.find({ location: normalizedLocation }).sort({ assetName: 1 }),
    Asset.find({ epc: { $in: uniqueScannedEpcs } }),
  ]);

  const expectedByEpc = new Map(expectedAssets.map(asset => [asset.epc, asset]));
  const scannedByEpc = new Map(scannedAssets.map(asset => [asset.epc, asset]));

  const matchedAssets = uniqueScannedEpcs
    .filter(epc => expectedByEpc.has(epc))
    .map(epc => mapAssetResponse(expectedByEpc.get(epc)));

  const missingAssets = expectedAssets
    .filter(asset => !uniqueScannedEpcs.includes(asset.epc))
    .map(mapAssetResponse);

  const unexpectedAssets = uniqueScannedEpcs
    .filter(epc => {
      const asset = scannedByEpc.get(epc);
      return asset && asset.location !== normalizedLocation;
    })
    .map(epc => mapAssetResponse(scannedByEpc.get(epc)));

  const unregisteredTags = uniqueScannedEpcs
    .filter(epc => !scannedByEpc.has(epc))
    .map(epc => ({ epc }));

  const auditId = `audit-${Date.now()}`;
  const verificationPercentage = expectedAssets.length === 0
    ? 0
    : Math.round((matchedAssets.length / expectedAssets.length) * 100);

  if (matchedAssets.length > 0 || missingAssets.length > 0) {
    const matchedIds = new Set(matchedAssets.map(asset => String(asset.id)));
    const missingIds = new Set(missingAssets.map(asset => String(asset.id)));

    await Asset.updateMany(
      { _id: { $in: [...matchedIds, ...missingIds] } },
      [{
        $set: {
          verificationHistory: {
            $concatArrays: [
              { $ifNull: ['$verificationHistory', []] },
              [{
                location: normalizedLocation,
                auditId,
                result: {
                  $cond: [
                    { $in: [{ $toString: '$_id' }, Array.from(matchedIds)] },
                    'matched',
                    'missing',
                  ],
                },
                verifiedAt: new Date(),
                verifiedBy: userId,
              }],
            ],
          },
        },
      }],
    );
  }

  return {
    auditId,
    location: normalizedLocation,
    auditTimestamp: new Date(),
    expectedCount: expectedAssets.length,
    scannedCount: scannedEpcs.length,
    uniqueScannedCount: uniqueScannedEpcs.length,
    duplicateReads,
    matchedAssets,
    missingAssets,
    unexpectedAssets,
    unregisteredTags,
    verificationPercentage,
  };
};

module.exports = {
  createBulkAssets,
  createAsset,
  getAssetByEPC,
  getAllAssets,
  getAssetSummary,
  verifyRoomInventory,
};
