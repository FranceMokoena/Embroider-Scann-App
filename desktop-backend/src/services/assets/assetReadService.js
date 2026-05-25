import {
  DesktopAsset,
  DesktopAssetHistory,
  DesktopAssetIdentifier,
  DesktopAssetTransfer,
  DesktopAssetVerification,
  DesktopRFIDEvent,
} from '../../models/assetReadModels.js';
import { assertDesktopDatabaseReady } from '../../config/desktopDatabase.js';
import {
  createPageMeta,
  escapeRegex,
  isObjectId,
  normalizeStatus,
  normalizeText,
  parseDateRange,
  parsePagination,
  parseSort,
  toCaseInsensitiveExactRegex,
} from './queryUtils.js';
import {
  toAssetListProjection,
  toAssetProjection,
  toHistoryProjection,
  toIdentifierProjection,
  toRfidEventProjection,
  toTransferProjection,
  toVerificationProjection,
} from './assetProjectionService.js';

const ASSET_SORT_FIELDS = [
  'assetNumber',
  'assetName',
  'status',
  'section',
  'technician',
  'lastSeenAt',
  'updatedAtSource',
  'createdAtSource',
];

const buildAssetFilter = query => {
  const filter = query.includeDeleted === 'true' ? {} : { sourceDeleted: { $ne: true } };
  const status = normalizeStatus(query.status);
  const section = normalizeText(query.currentSection || query.section);
  const technician = normalizeText(query.technician);
  const verificationState = normalizeText(query.verificationState);
  const repairState = normalizeText(query.repairState);
  const q = normalizeText(query.q || query.search);

  if (status) {
    filter.status = status;
  }

  if (section) {
    filter.currentSection = toCaseInsensitiveExactRegex(section);
  }

  if (technician) {
    filter.technician = technician;
  }

  if (verificationState) {
    filter.verificationState = new RegExp(escapeRegex(verificationState), 'i');
  }

  if (repairState) {
    filter.repairState = new RegExp(escapeRegex(repairState), 'i');
  }

  const dateRange = parseDateRange(query);
  if (dateRange) {
    filter[dateRange.field] = dateRange.range;
  }

  if (q) {
    const regex = new RegExp(escapeRegex(q), 'i');
    filter.$or = [
      { assetNumber: regex },
      { assetName: regex },
      { section: regex },
      { currentLocation: regex },
      { status: regex },
    ];
  }

  return filter;
};

export const listAssets = async query => {
  assertDesktopDatabaseReady();

  const filter = buildAssetFilter(query);
  const pagination = parsePagination(query);
  const sort = parseSort(query, ASSET_SORT_FIELDS);

  const [assets, total] = await Promise.all([
    DesktopAsset.find(filter)
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    DesktopAsset.countDocuments(filter),
  ]);

  const assetIds = assets.map(asset => asset.sourceAssetId);
  const identifiers = assetIds.length
    ? await DesktopAssetIdentifier.find({ sourceAssetId: { $in: assetIds } })
      .sort({ active: -1, type: 1 })
      .lean()
    : [];

  return {
    assets: toAssetListProjection(assets, identifiers),
    meta: createPageMeta({ ...pagination, total }),
  };
};

export const getAssetById = async id => {
  assertDesktopDatabaseReady();

  const filters = [{ sourceAssetId: id }];
  if (isObjectId(id)) {
    filters.push({ _id: id });
  }

  const asset = await DesktopAsset.findOne({ $or: filters }).lean();
  if (!asset) {
    const error = new Error('Asset not found');
    error.statusCode = 404;
    throw error;
  }

  if (asset.sourceDeleted) {
    const error = new Error('Asset has been deleted at source');
    error.statusCode = 404;
    throw error;
  }

  const [
    identifiers,
    history,
    transfers,
    verifications,
    rfidEvents,
  ] = await Promise.all([
    DesktopAssetIdentifier.find({ sourceAssetId: asset.sourceAssetId })
      .sort({ active: -1, type: 1 })
      .lean(),
    DesktopAssetHistory.find({ sourceAssetId: asset.sourceAssetId })
      .sort({ eventAt: -1 })
      .limit(50)
      .lean(),
    DesktopAssetTransfer.find({ sourceAssetId: asset.sourceAssetId })
      .sort({ eventAt: -1 })
      .limit(25)
      .lean(),
    DesktopAssetVerification.find({ sourceAssetId: asset.sourceAssetId })
      .sort({ verifiedAt: -1 })
      .limit(25)
      .lean(),
    DesktopRFIDEvent.find({ sourceAssetId: asset.sourceAssetId })
      .sort({ eventTimestamp: -1 })
      .limit(25)
      .lean(),
  ]);

  return {
    asset: toAssetProjection(asset, identifiers.map(toIdentifierProjection)),
    history: history.map(toHistoryProjection),
    transfers: transfers.map(toTransferProjection),
    verifications: verifications.map(toVerificationProjection),
    rfidEvents: rfidEvents.map(toRfidEventProjection),
  };
};
