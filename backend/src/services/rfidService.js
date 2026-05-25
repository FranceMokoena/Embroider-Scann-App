"use strict";

const mongoose = require('mongoose');
const Asset = require('../models/Asset');
const RFIDTag = require('../models/RFIDTag');
const AssetTagMapping = require('../models/AssetTagMapping');
const TagScanLog = require('../models/TagScanLog');
const { resolveAssetSection } = require('../utils/resolveAssetSection');

const ASSIGNABLE_TAG_STATUSES = ['unassigned', 'assigned'];
const VALID_MAPPING_STATUSES = ['assigned', 'unassigned', 'unknown'];
const VALID_SCAN_SOURCES = ['deviceApi', 'broadcast', 'manual', 'unknown'];
const DEFAULT_DUPLICATE_SUPPRESSION_WINDOW_MS = Number(
  process.env.RFID_DUPLICATE_SUPPRESSION_WINDOW_MS || 1500,
);

const createServiceError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const requireString = (value, fieldName) => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw createServiceError(`${fieldName} is required`, 400);
  }

  return value;
};

const normalizeEpcKey = value => {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
};

const normalizeOptionalString = value => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeEventTimestamp = value => {
  if (!value) {
    return new Date();
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
};

const normalizeDuplicateWindowMs = value => {
  const raw = Number(value);
  const fallback = Number.isFinite(DEFAULT_DUPLICATE_SUPPRESSION_WINDOW_MS)
    ? DEFAULT_DUPLICATE_SUPPRESSION_WINDOW_MS
    : 1500;
  const windowMs = Number.isFinite(raw) ? raw : fallback;
  return Math.max(0, Math.min(windowMs, 60000));
};

const findDuplicateScanLog = async ({
  epcKey,
  readerSessionId,
  deviceId,
  userId,
  eventTimestamp,
  duplicateWindowMs,
}) => {
  if (!duplicateWindowMs) {
    return null;
  }

  const filter = {
    epcKey,
    timestamp: {
      $gte: new Date(eventTimestamp.getTime() - duplicateWindowMs),
      $lte: eventTimestamp,
    },
  };

  if (readerSessionId) {
    filter.readerSessionId = readerSessionId;
  } else if (deviceId) {
    filter.deviceId = deviceId;
  } else if (userId) {
    filter.userId = userId;
  } else {
    return null;
  }

  return TagScanLog.findOne(filter).sort({ timestamp: -1 });
};

const mapScanLog = (log, extra = {}) => ({
  id: log._id,
  epcRaw: log.epcRaw,
  epcKey: log.epcKey,
  mappingStatus: log.mappingStatus,
  duplicateSuppressed: log.duplicateSuppressed,
  suppressionReason: log.suppressionReason || null,
  idempotencyKey: log.idempotencyKey || null,
  readerSessionId: log.readerSessionId || null,
  deviceId: log.deviceId || null,
  readTimestamp: log.readTimestamp || null,
  serverReceivedAt: log.serverReceivedAt || null,
  timestamp: log.timestamp,
  ...extra,
});

const getAssetSection = asset => resolveAssetSection(asset);

const withSession = (query, session) => (session ? query.session(session) : query);

const isDuplicateKeyError = error => error && error.code === 11000;

const isUnsupportedTransactionError = error => {
  const message = String(error?.message || '').toLowerCase();

  return (
    message.includes('transaction numbers are only allowed') ||
    message.includes('replica set member or mongos') ||
    message.includes('transactions are not supported') ||
    message.includes('this mongodb deployment does not support retryable writes') ||
    message.includes('cannot use a session that has ended')
  );
};

const mapAsset = asset => {
  if (!asset) {
    return null;
  }
  const currentSection = getAssetSection(asset) || null;

  return {
    id: asset._id,
    assetName: asset.assetName,
    assetNumber: asset.assetNumber,
    serialNumber: asset.serialNumber || null,
    status: asset.status || null,
    currentSection,
    section: currentSection,
    verificationStatus: asset.verificationStatus || null,
    verifiedAt: asset.verifiedAt || null,
    verifiedBy: asset.verifiedBy ? String(asset.verifiedBy) : null,
  };
};

const mapTag = tag => {
  if (!tag) {
    return null;
  }

  return {
    id: tag._id,
    epcRaw: tag.epcRaw,
    epcKey: tag.epcKey,
    tid: tag.tid || null,
    status: tag.status,
    firstSeenAt: tag.firstSeenAt,
    lastSeenAt: tag.lastSeenAt,
    createdAt: tag.createdAt,
    updatedAt: tag.updatedAt,
  };
};

const mapMapping = mapping => {
  if (!mapping) {
    return null;
  }

  return {
    id: mapping._id,
    assetId: mapping.assetId,
    rfidTagId: mapping.rfidTagId,
    epcRawSnapshot: mapping.epcRawSnapshot,
    status: mapping.status,
    assignedAt: mapping.assignedAt,
    assignedBy: mapping.assignedBy || null,
    unassignedAt: mapping.unassignedAt || null,
    unassignedBy: mapping.unassignedBy || null,
    reason: mapping.reason || null,
  };
};

const getEpcInput = epcRaw => {
  const raw = requireString(epcRaw, 'epcRaw');
  const epcKey = normalizeEpcKey(raw);

  if (!epcKey) {
    throw createServiceError('epcRaw does not contain a usable EPC lookup key', 400);
  }

  return { epcRaw: raw, epcKey };
};

const registerTag = async ({
  epcRaw,
  tid,
  userId,
  session,
}) => {
  const { epcRaw: raw, epcKey } = getEpcInput(epcRaw);
  const seenAt = new Date();
  const normalizedTid = normalizeOptionalString(tid);

  const tag = await RFIDTag.findOneAndUpdate(
    { epcKey },
    {
      $set: {
        lastSeenAt: seenAt,
        updatedBy: userId,
      },
      $setOnInsert: {
        epcRaw: raw,
        epcKey,
        tid: normalizedTid,
        status: 'unassigned',
        firstSeenAt: seenAt,
        createdBy: userId,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      session,
    },
  );

  if (normalizedTid && !tag.tid) {
    tag.tid = normalizedTid;
    await tag.save({ session });
  }

  return tag;
};

const resolveEpc = async (epcRaw, options = {}) => {
  const { epcRaw: raw, epcKey } = getEpcInput(epcRaw);
  const session = options.session;
  const tag = await withSession(RFIDTag.findOne({ epcKey }), session);

  if (!tag) {
    const assetByEpc = await withSession(Asset.findOne({ epc: epcKey }), session);
    if (assetByEpc) {
      return {
        epcRaw: raw,
        epcKey,
        status: 'assigned',
        tag: null,
        mapping: null,
        asset: mapAsset(assetByEpc),
      };
    }

    return {
      epcRaw: raw,
      epcKey,
      status: 'unknown',
      tag: null,
      mapping: null,
      asset: null,
    };
  }

  const mapping = await withSession(
    AssetTagMapping.findOne({
      rfidTagId: tag._id,
      status: 'active',
    }),
    session,
  );

  if (!mapping) {
    return {
      epcRaw: raw,
      epcKey,
      status: 'unassigned',
      tag: mapTag(tag),
      mapping: null,
      asset: null,
    };
  }

  const asset = await withSession(Asset.findById(mapping.assetId), session);

  return {
    epcRaw: raw,
    epcKey,
    status: 'assigned',
    tag: mapTag(tag),
    mapping: mapMapping(mapping),
    asset: mapAsset(asset),
  };
};

const assignTagToAssetInTransaction = async ({
  epcRaw,
  assetId,
  userId,
  reason,
  notes,
}, session) => {
  const raw = requireString(epcRaw, 'epcRaw');

  if (!mongoose.Types.ObjectId.isValid(assetId)) {
    throw createServiceError('assetId must be a valid asset id', 400);
  }

  const asset = await withSession(Asset.findById(assetId), session);
  if (!asset) {
    throw createServiceError('Asset not found', 404);
  }

  const tag = await registerTag({ epcRaw: raw, userId, session });

  if (!ASSIGNABLE_TAG_STATUSES.includes(tag.status)) {
    throw createServiceError(`RFID tag cannot be assigned while status is ${tag.status}`, 409);
  }

  const activeMapping = await withSession(
    AssetTagMapping.findOne({
      rfidTagId: tag._id,
      status: 'active',
    }),
    session,
  );

  if (activeMapping && activeMapping.assetId.toString() === assetId) {
    return resolveEpc(raw, { session });
  }

  if (activeMapping) {
    activeMapping.status = 'replaced';
    activeMapping.unassignedAt = new Date();
    activeMapping.unassignedBy = userId;
    activeMapping.reason = normalizeOptionalString(reason) || activeMapping.reason;
    await activeMapping.save({ session });
  }

  await AssetTagMapping.create([{
    assetId,
    rfidTagId: tag._id,
    epcRawSnapshot: tag.epcRaw,
    status: 'active',
    assignedAt: new Date(),
    assignedBy: userId,
    reason: normalizeOptionalString(reason),
    notes: normalizeOptionalString(notes),
  }], { session });

  tag.status = 'assigned';
  tag.updatedBy = userId;
  await tag.save({ session });

  return resolveEpc(raw, { session });
};

const assignTagToAsset = async payload => {
  const session = await mongoose.startSession();
  let result;

  try {
    await session.withTransaction(async () => {
      result = await assignTagToAssetInTransaction(payload, session);
    });

    return result;
  } catch (error) {
    if (isUnsupportedTransactionError(error)) {
      throw createServiceError(
        'RFID assignment requires MongoDB transactions. Use Mongo Atlas or run MongoDB as a replica set before enabling RFID assignment in production.',
        503,
      );
    }

    if (isDuplicateKeyError(error)) {
      throw createServiceError(
        'RFID assignment conflict: this EPC already has an active assignment',
        409,
      );
    }

    throw error;
  } finally {
    await session.endSession();
  }
};

const writeScanLog = async ({
  epcRaw,
  deviceId,
  readerSessionId,
  idempotencyKey,
  source,
  screen,
  mappingStatus,
  duplicateSuppressed,
  timestamp,
  readTimestamp,
  duplicateWindowMs,
  userId,
}) => {
  const { epcRaw: raw, epcKey } = getEpcInput(epcRaw);
  const normalizedIdempotencyKey = normalizeOptionalString(idempotencyKey);
  if (normalizedIdempotencyKey) {
    const existingLog = await TagScanLog.findOne({ idempotencyKey: normalizedIdempotencyKey });
    if (existingLog) {
      return mapScanLog(existingLog, {
        idempotentReplay: true,
        serverDuplicateSuppressed: false,
      });
    }
  }

  const eventTimestamp = normalizeEventTimestamp(readTimestamp || timestamp);
  const serverReceivedAt = new Date();
  const normalizedDeviceId = normalizeOptionalString(deviceId);
  const normalizedReaderSessionId = normalizeOptionalString(readerSessionId);
  const resolvedDuplicateWindowMs = normalizeDuplicateWindowMs(duplicateWindowMs);
  const duplicateLog = await findDuplicateScanLog({
    epcKey,
    readerSessionId: normalizedReaderSessionId,
    deviceId: normalizedDeviceId,
    userId,
    eventTimestamp,
    duplicateWindowMs: resolvedDuplicateWindowMs,
  });
  const serverDuplicateSuppressed = Boolean(duplicateLog);
  const resolved = await resolveEpc(raw);
  const resolvedStatus = VALID_MAPPING_STATUSES.includes(mappingStatus)
    ? mappingStatus
    : resolved.status;

  try {
    const log = await TagScanLog.create({
      epcRaw: raw,
      epcKey,
      rfidTagId: resolved.tag?.id,
      assetId: resolved.asset?.id,
      deviceId: normalizedDeviceId,
      readerSessionId: normalizedReaderSessionId,
      source: VALID_SCAN_SOURCES.includes(source) ? source : 'unknown',
      screen: normalizeOptionalString(screen),
      mappingStatus: VALID_MAPPING_STATUSES.includes(resolvedStatus)
        ? resolvedStatus
        : 'unknown',
      duplicateSuppressed: Boolean(duplicateSuppressed) || serverDuplicateSuppressed,
      suppressionReason: serverDuplicateSuppressed
        ? 'server_duplicate_window'
        : (duplicateSuppressed ? 'client_duplicate' : undefined),
      idempotencyKey: normalizedIdempotencyKey,
      userId,
      readTimestamp: eventTimestamp,
      serverReceivedAt,
      timestamp: eventTimestamp,
    });

    return mapScanLog(log, {
      idempotentReplay: false,
      serverDuplicateSuppressed,
      duplicateWindowMs: resolvedDuplicateWindowMs,
    });
  } catch (error) {
    if (isDuplicateKeyError(error) && normalizedIdempotencyKey) {
      const existingLog = await TagScanLog.findOne({ idempotencyKey: normalizedIdempotencyKey });
      if (existingLog) {
        return mapScanLog(existingLog, {
          idempotentReplay: true,
          serverDuplicateSuppressed: false,
        });
      }
    }

    throw error;
  }
};

module.exports = {
  assignTagToAsset,
  registerTag,
  resolveEpc,
  writeScanLog,
  normalizeEpcKey,
};
