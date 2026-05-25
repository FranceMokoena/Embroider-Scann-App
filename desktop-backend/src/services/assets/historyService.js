import {
  DesktopAssetHistory,
  DesktopAssetTransfer,
  DesktopAssetVerification,
  DesktopRFIDEvent,
} from '../../models/assetReadModels.js';
import { assertDesktopDatabaseReady } from '../../config/desktopDatabase.js';
import {
  createPageMeta,
  normalizeStatus,
  normalizeText,
  parseDateRange,
  parsePagination,
} from './queryUtils.js';
import {
  toHistoryProjection,
  toRfidEventProjection,
  toTransferProjection,
  toVerificationProjection,
} from './assetProjectionService.js';

const appendDateRange = (filter, query, field) => {
  const range = parseDateRange(query, field);
  if (range) {
    filter[range.field] = range.range;
  }
};

const addAndClause = (filter, clause) => {
  filter.$and = filter.$and || [];
  filter.$and.push(clause);
};

const pagedFind = async ({ Model, filter, sort, query, projector }) => {
  const pagination = parsePagination(query);
  const [records, total] = await Promise.all([
    Model.find(filter)
      .sort(sort)
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    Model.countDocuments(filter),
  ]);

  return {
    records: records.map(projector),
    meta: createPageMeta({ ...pagination, total }),
  };
};

export const getAssetHistory = async query => {
  assertDesktopDatabaseReady();

  const filter = {};
  const assetId = normalizeText(query.assetId);
  const type = normalizeText(query.type || query.historyType);
  const status = normalizeStatus(query.status);
  const section = normalizeText(query.section);
  const technician = normalizeText(query.technician);

  if (assetId) filter.sourceAssetId = assetId;
  if (type) filter.historyType = type;
  if (status) addAndClause(filter, { $or: [{ previousStatus: status }, { newStatus: status }] });
  if (section) addAndClause(filter, { $or: [{ section }, { fromSection: section }, { toSection: section }] });
  if (technician) filter.actorId = technician;
  appendDateRange(filter, query, 'eventAt');

  return pagedFind({
    Model: DesktopAssetHistory,
    filter,
    sort: { eventAt: -1 },
    query,
    projector: toHistoryProjection,
  });
};

export const getAssetTransfers = async query => {
  assertDesktopDatabaseReady();

  const filter = {};
  const assetId = normalizeText(query.assetId);
  const section = normalizeText(query.section);
  const technician = normalizeText(query.technician);
  const transferType = normalizeText(query.transferType);

  if (assetId) filter.sourceAssetId = assetId;
  if (section) filter.$or = [{ fromSection: section }, { toSection: section }];
  if (technician) filter.actorId = technician;
  if (transferType) filter.transferType = transferType;
  appendDateRange(filter, query, 'eventAt');

  return pagedFind({
    Model: DesktopAssetTransfer,
    filter,
    sort: { eventAt: -1 },
    query,
    projector: toTransferProjection,
  });
};

export const getAssetVerifications = async query => {
  assertDesktopDatabaseReady();

  const filter = {};
  const assetId = normalizeText(query.assetId);
  const section = normalizeText(query.section);
  const technician = normalizeText(query.technician);
  const result = normalizeText(query.result);

  if (assetId) filter.sourceAssetId = assetId;
  if (section) filter.section = section;
  if (technician) filter.verifiedBy = technician;
  if (result) filter.result = result;
  appendDateRange(filter, query, 'verifiedAt');

  return pagedFind({
    Model: DesktopAssetVerification,
    filter,
    sort: { verifiedAt: -1 },
    query,
    projector: toVerificationProjection,
  });
};

export const getRfidActivity = async query => {
  assertDesktopDatabaseReady();

  const filter = {};
  const assetId = normalizeText(query.assetId);
  const technician = normalizeText(query.technician);
  const deviceId = normalizeText(query.deviceId);
  const readerSessionId = normalizeText(query.readerSessionId);
  const mappingStatus = normalizeText(query.mappingStatus);
  const duplicateSuppressed = normalizeText(query.duplicateSuppressed);

  if (assetId) filter.sourceAssetId = assetId;
  if (technician) filter.userId = technician;
  if (deviceId) filter.deviceId = deviceId;
  if (readerSessionId) filter.readerSessionId = readerSessionId;
  if (mappingStatus) filter.mappingStatus = mappingStatus;
  if (duplicateSuppressed === 'true' || duplicateSuppressed === 'false') {
    filter.duplicateSuppressed = duplicateSuppressed === 'true';
  }
  appendDateRange(filter, query, 'eventTimestamp');

  return pagedFind({
    Model: DesktopRFIDEvent,
    filter,
    sort: { eventTimestamp: -1 },
    query,
    projector: toRfidEventProjection,
  });
};

export const getTechnicianActivity = async query => {
  const technician = normalizeText(query.technician || query.technicianId);
  return {
    history: await getAssetHistory({ ...query, technician }),
    transfers: await getAssetTransfers({ ...query, technician }),
    verifications: await getAssetVerifications({ ...query, technician }),
    rfidActivity: await getRfidActivity({ ...query, technician }),
  };
};

export const getSectionActivity = async query => {
  const section = normalizeText(query.section || query.sectionName);
  return {
    history: await getAssetHistory({ ...query, section }),
    transfers: await getAssetTransfers({ ...query, section }),
    verifications: await getAssetVerifications({ ...query, section }),
  };
};
