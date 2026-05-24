"use strict";

const mongoose = require('mongoose');
const Asset = require('../models/Asset');
const AssetTagMapping = require('../models/AssetTagMapping');
const TagScanLog = require('../models/TagScanLog');
const User = require('../models/User');
const Section = require('../models/Section');
const { resolveAssetSection } = require('../utils/resolveAssetSection');
const assetTransferService = require('./assetTransferService');

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

const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const normalizeEpc = value => trimString(value).toUpperCase();

const getAssetSection = asset => resolveAssetSection(asset);

const buildSectionFilter = section => {
  const normalizedSection = trimString(section);
  return {
    $or: [
      { section: normalizedSection },
      { section: { $exists: false }, category: normalizedSection },
      { section: { $in: [null, ''] }, category: normalizedSection },
      { section: { $exists: false }, category: { $exists: false }, location: normalizedSection },
      { section: { $in: [null, ''] }, category: { $in: [null, ''] }, location: normalizedSection },
    ],
  };
};

const getAssignedByDisplayName = assignedBy => {
  if (!assignedBy) {
    return null;
  }

  if (typeof assignedBy === 'string') {
    return assignedBy;
  }

  if (assignedBy.username) {
    return assignedBy.username;
  }

  return String(assignedBy._id || assignedBy);
};

const mapAssetResponse = asset => ({
  id: asset._id,
  assetName: asset.assetName,
  assetNumber: asset.assetNumber,
  serialNumber: asset.serialNumber || null,
  epc: asset.epc,
  section: getAssetSection(asset) || null,
  status: asset.status || null,
  assignedTo: asset.assignedTo || null,
  assignmentInformation: asset.assignmentInformation ? {
    ...asset.assignmentInformation,
    assignedBy: getAssignedByDisplayName(asset.assignmentInformation.assignedBy),
  } : null,
  verificationStatus: asset.verificationStatus || null,
  verifiedAt: asset.verifiedAt || null,
  verifiedBy: getAssignedByDisplayName(asset.verifiedBy),
  updatedBy: getAssignedByDisplayName(asset.updatedBy),
  statusHistory: Array.isArray(asset.statusHistory)
    ? asset.statusHistory.map(entry => ({
      previousStatus: entry.previousStatus || null,
      newStatus: entry.newStatus || null,
      changedAt: entry.changedAt,
      changedBy: getAssignedByDisplayName(entry.changedBy),
      source: entry.source || null,
    }))
    : [],
  assignmentLifecycleHistory: asset.assignmentLifecycleHistory || [],
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
    section: normalizeOptionalString(payload.section)
      || normalizeOptionalString(payload.department)
      || normalizeOptionalString(payload.category)
      || normalizeOptionalString(payload.location),
    status,
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

  const asset = await Asset.findOne({ epc: normalizedEpc })
    .populate('assignmentInformation.assignedBy', 'username department');
  return asset ? mapAssetResponse(asset) : null;
};

const getAssetById = async assetId => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw createServiceError('Invalid asset id', 400);
  }

  const asset = await Asset.findById(assetId)
    .populate('assignmentInformation.assignedBy', 'username department');
  if (!asset) {
    throw createServiceError('Asset not found', 404);
  }

  return mapAssetResponse(asset);
};

const buildAssetFilter = filters => {
  const query = {};

  if (filters.status && STATUS_VALUES.includes(filters.status)) {
    query.status = filters.status;
  }

  if (filters.section || filters.department || filters.category || filters.location) {
    Object.assign(
      query,
      buildSectionFilter(filters.section || filters.department || filters.category || filters.location),
    );
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
  const assets = await Asset.find(buildAssetFilter(filters))
    .sort({ createdAt: -1 })
    .populate('assignmentInformation.assignedBy', 'username department');
  return assets.map(mapAssetResponse);
};

const updateAsset = async (assetId, payload = {}) => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw createServiceError('Invalid asset id', 400);
  }

  const requestedSection = payload.section !== undefined ? payload.section : payload.department;
  const hasSectionUpdate = requestedSection !== undefined;
  const hasStatusUpdate = payload.status !== undefined;

  if (!hasSectionUpdate && !hasStatusUpdate) {
    throw createServiceError('No valid fields to update', 400);
  }

  if (hasSectionUpdate) {
    const toSection = trimString(requestedSection);
    if (!toSection) {
      throw createServiceError('section cannot be empty', 400);
    }

    const transferResult = await assetTransferService.transferAssets({
      assetIds: [String(assetId)],
      toSection,
      assignedBy: payload.userId,
      reason: payload.reason,
      transferType: payload.transferType || 'reassignment',
      batchId: payload.batchId,
      assignmentSource: payload.assignmentSource || 'department_assignment',
    });

    const transferError = transferResult.errors.find(
      entry => String(entry.assetId) === String(assetId),
    );

    if (transferError) {
      throw createServiceError(transferError.message, transferError.statusCode || 400);
    }

    if (!hasStatusUpdate) {
      const transferredEntry = transferResult.transferred.find(
        entry => String(entry.assetId) === String(assetId),
      );

      if (transferredEntry?.asset) {
        return transferredEntry.asset;
      }

      const asset = await Asset.findById(assetId);
      if (!asset) {
        throw createServiceError('Asset not found', 404);
      }

      return mapAssetResponse(asset);
    }
  }

  const asset = await Asset.findById(assetId);
  if (!asset) {
    throw createServiceError('Asset not found', 404);
  }

  if (!hasStatusUpdate) {
    throw createServiceError('No valid fields to update', 400);
  }

  const status = normalizeOptionalString(payload.status);
  if (status && !STATUS_VALUES.includes(status)) {
    throw createServiceError(`status must be one of: ${STATUS_VALUES.join(', ')}`, 400);
  }

  if (status && status !== asset.status) {
    asset.statusHistory = asset.statusHistory || [];
    asset.statusHistory.push({
      previousStatus: asset.status || undefined,
      newStatus: status,
      changedAt: new Date(),
      changedBy: payload.userId,
      source: payload.assignmentSource || 'status_update',
    });
    asset.status = status;
  }

  if (payload.userId) {
    asset.updatedBy = payload.userId;
  }

  await asset.save();
  return mapAssetResponse(asset);
};

const deleteAsset = async assetId => {
  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw createServiceError('Invalid asset id', 400);
  }

  const asset = await Asset.findByIdAndDelete(assetId);
  if (!asset) {
    throw createServiceError('Asset not found', 404);
  }

  await Promise.all([
    AssetTagMapping.updateMany(
      { assetId: asset._id, status: 'active' },
      {
        $set: {
          status: 'removed',
          unassignedAt: new Date(),
          unassignedBy: 'asset_deleted',
          reason: 'Asset deleted from system',
        },
      },
    ),
    require('../models/TagScanLog').updateMany(
      { assetId: asset._id },
      { $unset: { assetId: '' } },
    ),
  ]);

  return mapAssetResponse(asset);
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

const getAvailableSections = async () => {
  const explicitSectionNames = await Section.distinct('section', {
    section: { $exists: true, $nin: [null, ''] },
  });

  return Array.from(new Set(explicitSectionNames.map(trimString).filter(Boolean)))
    .sort((left, right) => left.localeCompare(right));
};

const createSection = async ({ section, manager, description, userId }) => {
  const sectionName = trimString(section);
  if (!sectionName) {
    throw createServiceError('section is required', 400);
  }

  const managerName = trimString(manager);
  if (!managerName) {
    throw createServiceError('section manager is required', 400);
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw createServiceError('Invalid user', 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw createServiceError('User not found', 404);
  }

  const existingSection = await Section.findOne({
    section: { $regex: `^${escapeRegex(sectionName)}$`, $options: 'i' },
  });

  if (existingSection) {
    throw createServiceError('Section already exists', 409);
  }

  const newSection = await Section.create({
    section: sectionName,
    manager: managerName,
    description: normalizeOptionalString(description) || null,
    createdBy: user._id,
  });

  return newSection;
};

const getSectionSummary = async () => {
  const [assets, explicitSections] = await Promise.all([
    Asset.find({}),
    Section.find({}).populate('createdBy', 'username name email').lean(),
  ]);

  const sections = new Map();

  for (const sectionDoc of explicitSections) {
    const sectionName = trimString(sectionDoc.section);
    if (!sectionName) continue;

    sections.set(sectionName, {
      section: sectionName,
      totalAssets: 0,
      healthyAssets: 0,
      repairableAssets: 0,
      beyondRepairAssets: 0,
      createdAt: sectionDoc.createdAt || null,
      createdBy: getAssignedByDisplayName(sectionDoc.createdBy) || null,
      manager: trimString(sectionDoc.manager) || null,
    });
  }

  for (const asset of assets) {
    const sectionName = getAssetSection(asset);
    if (!sectionName) continue;

    const assignedBy = asset.assignmentInformation?.assignedBy
      ? getAssignedByDisplayName(asset.assignmentInformation.assignedBy)
      : getAssignedByDisplayName(asset.updatedBy);

    const existing = sections.get(sectionName) || {
      section: sectionName,
      totalAssets: 0,
      healthyAssets: 0,
      repairableAssets: 0,
      beyondRepairAssets: 0,
      createdAt: null,
      createdBy: null,
      manager: null,
    };

    existing.totalAssets += 1;
    if (asset.status === 'Healthy') existing.healthyAssets += 1;
    if (asset.status === 'Repairable') existing.repairableAssets += 1;
    if (asset.status === 'Beyond Repair') existing.beyondRepairAssets += 1;

    const assetCreated = asset.createdAt ? new Date(asset.createdAt) : null;
    const existingCreated = existing.createdAt ? new Date(existing.createdAt) : null;

    if (!existingCreated || (assetCreated && assetCreated < existingCreated)) {
      existing.createdAt = asset.createdAt;
      existing.createdBy = assignedBy || null;
    }

    sections.set(sectionName, existing);
  }

  return Array.from(sections.values()).sort((left, right) => left.section.localeCompare(right.section));
};

const getAssignmentLifecycle = async () => {
  const assets = await Asset.find({}).sort({ updatedAt: -1 });

  const lifecycle = assets.flatMap(asset => {
    const history = Array.isArray(asset.assignmentLifecycleHistory)
      ? asset.assignmentLifecycleHistory
      : [];

    if (history.length === 0) {
      return [{
        _id: String(asset._id),
        assetId: String(asset._id),
        assetName: asset.assetName,
        assetNumber: asset.assetNumber,
        initialSection: getAssetSection(asset) || 'Unknown',
        currentSection: getAssetSection(asset) || 'Unknown',
        assignedBy: asset.assignmentInformation?.assignedBy ? 'System' : 'Unknown',
        assignmentDate: asset.assignmentInformation?.assignedAt || asset.createdAt,
        lastUpdated: asset.updatedAt,
      }];
    }

    return history.map((entry, index) => ({
      _id: `${asset._id}-${entry._id || index}`,
      assetId: String(asset._id),
      assetName: asset.assetName,
      assetNumber: asset.assetNumber,
      initialSection: entry.fromSection || 'Unassigned',
      currentSection: entry.toSection || getAssetSection(asset) || 'Unknown',
      assignedBy: entry.assignedBy ? 'System' : 'Unknown',
      assignmentDate: entry.assignedAt || asset.updatedAt,
      lastUpdated: asset.updatedAt,
    })).sort((left, right) =>
      new Date(right.assignmentDate).getTime() - new Date(left.assignmentDate).getTime(),
    );
  });

  return lifecycle.sort((left, right) =>
    new Date(right.assignmentDate).getTime() - new Date(left.assignmentDate).getTime(),
  );
};

const verifyRoomInventory = async ({ section, location, epcs, userId }) => {
  const normalizedSection = normalizeOptionalString(section || location);
  if (!normalizedSection) {
    throw createServiceError('section is required', 400);
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
    Asset.find(buildSectionFilter(normalizedSection)).sort({ assetName: 1 }),
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
      return asset && getAssetSection(asset) !== normalizedSection;
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
                section: normalizedSection,
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

    if (matchedIds.size > 0) {
      await Asset.updateMany(
        { _id: { $in: Array.from(matchedIds) } },
        {
          $set: {
            verificationStatus: 'Verified',
            verifiedAt: new Date(),
            verifiedBy: userId,
          },
        },
      );
    }
  }

  return {
    auditId,
    section: normalizedSection,
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
  createSection,
  deleteAsset,
  getAssetByEPC,
  getAllAssets,
  getAssetSummary,
  getAssignmentLifecycle,
  getAvailableSections,
  getSectionSummary,
  getAvailableDepartments: getAvailableSections,
  mapAssetResponse,
  updateAsset,
  verifyRoomInventory,
};
