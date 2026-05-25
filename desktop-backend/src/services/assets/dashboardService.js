import {
  DesktopAsset,
  DesktopAssetIdentifier,
  DesktopAssetTransfer,
  DesktopAssetVerification,
  DesktopRFIDEvent,
} from '../../models/assetReadModels.js';
import { assertDesktopDatabaseReady } from '../../config/desktopDatabase.js';
import { normalizeText, toNumber } from './queryUtils.js';
import {
  toAssetProjection,
  toRfidEventProjection,
  toSectionCardProjection,
} from './assetProjectionService.js';

const VERIFIED_REGEX = /^verified/i;
const ACTIVE_ASSET_FILTER = { sourceDeleted: { $ne: true } };

const countByStatus = async () => {
  const rows = await DesktopAsset.aggregate([
    { $match: ACTIVE_ASSET_FILTER },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  return rows.reduce((result, row) => {
    result[row._id || 'Unknown'] = row.count;
    return result;
  }, {});
};

export const getAssetSummaryCards = async () => {
  assertDesktopDatabaseReady();

  const [
    totalAssets,
    byStatus,
    verifiedAssets,
    transferredAssetIds,
    activeRFIDAssetIds,
  ] = await Promise.all([
    DesktopAsset.countDocuments(ACTIVE_ASSET_FILTER),
    countByStatus(),
    DesktopAsset.countDocuments({ ...ACTIVE_ASSET_FILTER, verificationState: VERIFIED_REGEX }),
    DesktopAssetTransfer.distinct('sourceAssetId', {}),
    DesktopAssetIdentifier.distinct('sourceAssetId', {
      type: { $in: ['RFID', 'EPC'] },
      active: true,
      sourceAssetId: { $exists: true, $nin: [null, ''] },
    }),
  ]);

  return {
    totalAssets,
    healthyAssets: byStatus.Healthy || 0,
    repairableAssets: byStatus.Repairable || 0,
    writtenOffAssets: byStatus['Beyond Repair'] || 0,
    verifiedAssets,
    transferredAssets: transferredAssetIds.length,
    activeRFIDAssets: activeRFIDAssetIds.length,
  };
};

export const getSectionSummaryCards = async () => {
  assertDesktopDatabaseReady();

  const rows = await DesktopAsset.aggregate([
    { $match: ACTIVE_ASSET_FILTER },
    {
      $group: {
        _id: { $ifNull: ['$currentSection', { $ifNull: ['$section', 'Unassigned'] }] },
        assetCount: { $sum: 1 },
        healthyCount: {
          $sum: { $cond: [{ $eq: ['$status', 'Healthy'] }, 1, 0] },
        },
        repairableCount: {
          $sum: { $cond: [{ $eq: ['$status', 'Repairable'] }, 1, 0] },
        },
        writtenOffCount: {
          $sum: { $cond: [{ $eq: ['$status', 'Beyond Repair'] }, 1, 0] },
        },
        verifiedCount: {
          $sum: {
            $cond: [
              { $regexMatch: { input: { $ifNull: ['$verificationState', ''] }, regex: 'verified', options: 'i' } },
              1,
              0,
            ],
          },
        },
      },
    },
    { $sort: { assetCount: -1, _id: 1 } },
  ]);

  return rows.map(row => toSectionCardProjection({
    section: row._id,
    ...row,
  }));
};

export const getTechnicianSummaryCards = async () => {
  assertDesktopDatabaseReady();

  const [assignedRows, verifiedRows, transferredRows, pendingRows] = await Promise.all([
    DesktopAsset.aggregate([
      { $match: { ...ACTIVE_ASSET_FILTER, technician: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$technician', assignedAssets: { $sum: 1 } } },
    ]),
    DesktopAsset.aggregate([
      {
        $match: {
          ...ACTIVE_ASSET_FILTER,
          technician: { $exists: true, $nin: [null, ''] },
          verificationState: VERIFIED_REGEX,
        },
      },
      { $group: { _id: '$technician', verifiedAssets: { $sum: 1 } } },
    ]),
    DesktopAssetTransfer.aggregate([
      { $match: { actorId: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$actorId', transferredAssets: { $addToSet: '$sourceAssetId' } } },
    ]),
    DesktopAsset.aggregate([
      {
        $match: {
          ...ACTIVE_ASSET_FILTER,
          technician: { $exists: true, $nin: [null, ''] },
          verificationState: { $not: VERIFIED_REGEX },
        },
      },
      { $group: { _id: '$technician', pendingVerifications: { $sum: 1 } } },
    ]),
  ]);

  const cards = new Map();
  const ensure = technicianId => {
    if (!cards.has(technicianId)) {
      cards.set(technicianId, {
        technicianId,
        technicianName: technicianId,
        assignedAssets: 0,
        verifiedAssets: 0,
        transferredAssets: 0,
        pendingVerifications: 0,
      });
    }

    return cards.get(technicianId);
  };

  assignedRows.forEach(row => { ensure(row._id).assignedAssets = row.assignedAssets; });
  verifiedRows.forEach(row => { ensure(row._id).verifiedAssets = row.verifiedAssets; });
  transferredRows.forEach(row => { ensure(row._id).transferredAssets = row.transferredAssets.length; });
  pendingRows.forEach(row => { ensure(row._id).pendingVerifications = row.pendingVerifications; });

  return [...cards.values()].sort((left, right) => right.assignedAssets - left.assignedAssets);
};

export const getRfidActivityMetrics = async () => {
  assertDesktopDatabaseReady();

  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [
    totalEvents,
    eventsLast24Hours,
    duplicateEvents,
    unresolvedEvents,
    uniqueEpcRows,
    activeReaderSessions,
  ] = await Promise.all([
    DesktopRFIDEvent.countDocuments({}),
    DesktopRFIDEvent.countDocuments({ eventTimestamp: { $gte: last24Hours } }),
    DesktopRFIDEvent.countDocuments({ duplicateSuppressed: true }),
    DesktopRFIDEvent.countDocuments({ $or: [{ sourceAssetId: null }, { sourceAssetId: '' }, { sourceAssetId: { $exists: false } }] }),
    DesktopRFIDEvent.aggregate([
      { $match: { epcKey: { $exists: true, $nin: [null, ''] } } },
      { $group: { _id: '$epcKey' } },
      { $count: 'count' },
    ]),
    DesktopRFIDEvent.distinct('readerSessionId', {
      readerSessionId: { $exists: true, $nin: [null, ''] },
      eventTimestamp: { $gte: last24Hours },
    }),
  ]);

  return {
    totalEvents,
    eventsLast24Hours,
    duplicateEvents,
    unresolvedEvents,
    uniqueEpcCount: toNumber(uniqueEpcRows[0]?.count),
    activeReaderSessions: activeReaderSessions.length,
  };
};

export const getAssetDashboard = async (query = {}) => {
  assertDesktopDatabaseReady();

  const recentLimit = Math.min(Math.max(Number(query.recentLimit) || 10, 1), 50);
  const [
    summary,
    sections,
    technicians,
    rfidActivity,
    recentlyUpdatedAssets,
    recentlyScannedEvents,
    unresolvedIdentifiers,
  ] = await Promise.all([
    getAssetSummaryCards(),
    getSectionSummaryCards(),
    getTechnicianSummaryCards(),
    getRfidActivityMetrics(),
    DesktopAsset.find(ACTIVE_ASSET_FILTER)
      .sort({ updatedAtSource: -1 })
      .limit(recentLimit)
      .lean(),
    DesktopRFIDEvent.find({})
      .sort({ eventTimestamp: -1 })
      .limit(recentLimit)
      .lean(),
    DesktopAssetIdentifier.countDocuments({
      $or: [{ sourceAssetId: null }, { sourceAssetId: '' }, { sourceAssetId: { $exists: false } }],
    }),
  ]);

  return {
    summary,
    sections,
    technicians,
    rfidActivity: {
      ...rfidActivity,
      unresolvedIdentifierCount: unresolvedIdentifiers,
    },
    recentlyUpdatedAssets: recentlyUpdatedAssets.map(asset => toAssetProjection(asset)),
    recentlyScannedAssets: recentlyScannedEvents.map(toRfidEventProjection),
  };
};

export const getAssetStatistics = async query => {
  assertDesktopDatabaseReady();

  const section = normalizeText(query.section);
  const baseMatch = section ? { ...ACTIVE_ASSET_FILTER, currentSection: section } : ACTIVE_ASSET_FILTER;
  const [statusRows, verificationRows, repairRows] = await Promise.all([
    DesktopAsset.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    DesktopAsset.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$verificationState', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    DesktopAsset.aggregate([
      { $match: baseMatch },
      { $group: { _id: '$repairState', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return {
    byStatus: statusRows,
    byVerificationState: verificationRows,
    byRepairState: repairRows,
  };
};
