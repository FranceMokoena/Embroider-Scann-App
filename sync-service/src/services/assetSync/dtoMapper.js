const {
  buildIdentifierKey,
  normalizeAssetStatus,
  normalizeIdentifierType,
  normalizeIdentifierValue,
  normalizeText,
  normalizeTimestamp,
  toSourceId,
} = require('./normalization');

const getSection = asset =>
  normalizeText(asset.currentSection) ||
  normalizeText(asset.section);

const getLatestByDate = (items, dateFields) => {
  if (!Array.isArray(items) || items.length === 0) {
    return null;
  }

  return items.reduce((latest, item) => {
    const itemDate = dateFields
      .map(field => normalizeTimestamp(item[field]))
      .find(Boolean);
    const latestDate = latest
      ? dateFields.map(field => normalizeTimestamp(latest[field])).find(Boolean)
      : null;

    if (!latestDate) {
      return item;
    }

    if (!itemDate) {
      return latest;
    }

    return itemDate.getTime() >= latestDate.getTime() ? item : latest;
  }, null);
};

const deriveVerificationState = asset => {
  const directState = normalizeText(asset.verificationStatus);
  if (directState) {
    return directState;
  }

  const latestVerification = getLatestByDate(asset.verificationHistory, ['verifiedAt', 'createdAt']);
  return normalizeText(latestVerification?.result) || 'Pending';
};

const deriveRepairState = normalizedStatus => {
  if (normalizedStatus === 'Repairable') {
    return 'Repair Required';
  }

  if (normalizedStatus === 'Beyond Repair') {
    return 'Beyond Repair';
  }

  if (normalizedStatus === 'Healthy') {
    return 'Operational';
  }

  return 'Unknown';
};

const deriveTransferState = asset => {
  const latestTransfer = getLatestByDate(asset.assignmentLifecycleHistory, ['assignedAt', 'createdAt']);
  if (!latestTransfer) {
    return getSection(asset) ? 'Assigned' : 'Unassigned';
  }

  return normalizeText(latestTransfer.toSection)
    ? `Assigned to ${normalizeText(latestTransfer.toSection)}`
    : 'Assigned';
};

const addIdentifier = (identifiers, identifier) => {
  const type = normalizeIdentifierType(identifier.type);
  const valueNormalized = normalizeIdentifierValue(identifier.value, type);
  const value = normalizeText(identifier.value);

  if (!type || !value || !valueNormalized) {
    return;
  }

  const source = normalizeText(identifier.source) || 'asset-sync';
  const sourceIdentifierKey = buildIdentifierKey({ type, valueNormalized, source });
  if (!sourceIdentifierKey) {
    return;
  }

  const existingIndex = identifiers.findIndex(item => item.sourceIdentifierKey === sourceIdentifierKey);
  const record = {
    type,
    value,
    valueNormalized,
    active: Boolean(identifier.active),
    source,
    sourceIdentifierKey,
    sourceTagId: identifier.sourceTagId || null,
    sourceMappingId: identifier.sourceMappingId || null,
    firstSeenAt: normalizeTimestamp(identifier.firstSeenAt),
    lastSeenAt: normalizeTimestamp(identifier.lastSeenAt),
    assignedAt: normalizeTimestamp(identifier.assignedAt),
    unassignedAt: normalizeTimestamp(identifier.unassignedAt),
  };

  if (existingIndex >= 0) {
    identifiers[existingIndex] = {
      ...identifiers[existingIndex],
      ...record,
      active: identifiers[existingIndex].active || record.active,
      lastSeenAt: record.lastSeenAt || identifiers[existingIndex].lastSeenAt,
    };
    return;
  }

  identifiers.push(record);
};

const buildIdentifiers = (asset, mappings, tagsById) => {
  const identifiers = [];

  addIdentifier(identifiers, {
    type: 'EPC',
    value: asset.epc,
    active: Boolean(asset.epc),
    source: 'asset.epc',
  });

  for (const mapping of mappings) {
    const tag = tagsById.get(toSourceId(mapping.rfidTagId));
    const value = tag?.epcRaw || mapping.epcRawSnapshot;

    addIdentifier(identifiers, {
      type: 'RFID',
      value,
      active: mapping.status === 'active',
      source: 'rfid.mapping',
      sourceTagId: toSourceId(mapping.rfidTagId),
      sourceMappingId: toSourceId(mapping),
      firstSeenAt: tag?.firstSeenAt,
      lastSeenAt: tag?.lastSeenAt,
      assignedAt: mapping.assignedAt,
      unassignedAt: mapping.unassignedAt,
    });

    if (tag?.epcKey && tag.epcKey !== value) {
      addIdentifier(identifiers, {
        type: 'EPC',
        value: tag.epcKey,
        active: mapping.status === 'active',
        source: 'rfid.tag.epcKey',
        sourceTagId: toSourceId(mapping.rfidTagId),
        sourceMappingId: toSourceId(mapping),
        firstSeenAt: tag.firstSeenAt,
        lastSeenAt: tag.lastSeenAt,
        assignedAt: mapping.assignedAt,
        unassignedAt: mapping.unassignedAt,
      });
    }
  }

  return identifiers;
};

const createAssetSyncRecord = (asset, context = {}) => {
  const assetId = toSourceId(asset);
  const mappings = context.mappingsByAssetId?.get(assetId) || [];
  const identifiers = buildIdentifiers(asset, mappings, context.tagsById || new Map());
  const normalizedStatus = normalizeAssetStatus(asset.status);
  const latestScan = context.latestScanByAssetId?.get(assetId) ||
    context.latestScanByEpc?.get(normalizeIdentifierValue(asset.epc, 'EPC'));

  return {
    assetId,
    assetNumber: normalizeText(asset.assetNumber),
    assetName: normalizeText(asset.assetName),
    status: normalizedStatus,
    sourceStatus: normalizeText(asset.status),
    currentSection: getSection(asset),
    section: getSection(asset),
    technician: toSourceId(asset.assignmentInformation?.assignedBy),
    identifiers: identifiers.map(({ type, value, active }) => ({ type, value, active })),
    identifierDetails: identifiers,
    currentLocation: getSection(asset),
    verificationState: deriveVerificationState(asset),
    repairState: deriveRepairState(normalizedStatus),
    transferState: deriveTransferState(asset),
    lastSeenAt: normalizeTimestamp(latestScan?.timestamp) || normalizeTimestamp(latestScan?.createdAt),
    createdAt: normalizeTimestamp(asset.createdAt),
    updatedAt: normalizeTimestamp(asset.updatedAt),
  };
};

const createHistoryId = (assetId, type, entry, index) => {
  const timestamp =
    normalizeTimestamp(entry.changedAt) ||
    normalizeTimestamp(entry.assignedAt) ||
    normalizeTimestamp(entry.verifiedAt) ||
    normalizeTimestamp(entry.createdAt);
  const stamp = timestamp ? timestamp.toISOString() : `index-${index}`;
  const batch = normalizeText(entry.batchId) || normalizeText(entry.auditId) || 'none';
  return `${assetId}:${type}:${stamp}:${batch}:${index}`;
};

const createAssetHistoryRecords = asset => {
  const assetId = toSourceId(asset);
  const records = [];
  const verifications = [];
  const transfers = [];

  (asset.statusHistory || []).forEach((entry, index) => {
    const record = {
      sourceHistoryId: createHistoryId(assetId, 'status', entry, index),
      sourceAssetId: assetId,
      historyType: 'status',
      previousStatus: normalizeAssetStatus(entry.previousStatus),
      newStatus: normalizeAssetStatus(entry.newStatus),
      eventAt: normalizeTimestamp(entry.changedAt) || normalizeTimestamp(asset.updatedAt),
      actorId: toSourceId(entry.changedBy),
      source: normalizeText(entry.source) || 'asset.statusHistory',
      reason: normalizeText(entry.reason),
      batchId: normalizeText(entry.batchId),
      payload: entry,
    };
    records.push(record);
  });

  (asset.assignmentLifecycleHistory || []).forEach((entry, index) => {
    const record = {
      sourceHistoryId: createHistoryId(assetId, 'transfer', entry, index),
      sourceAssetId: assetId,
      historyType: 'transfer',
      fromSection: normalizeText(entry.fromSection),
      toSection: normalizeText(entry.toSection),
      eventAt: normalizeTimestamp(entry.assignedAt) || normalizeTimestamp(asset.updatedAt),
      actorId: toSourceId(entry.assignedBy),
      source: normalizeText(entry.source) || 'asset.assignmentLifecycleHistory',
      transferType: normalizeText(entry.transferType),
      reason: normalizeText(entry.reason),
      batchId: normalizeText(entry.batchId),
      payload: entry,
    };
    records.push(record);
    transfers.push({
      ...record,
      sourceTransferId: record.sourceHistoryId,
    });
  });

  (asset.verificationHistory || []).forEach((entry, index) => {
    const record = {
      sourceHistoryId: createHistoryId(assetId, 'verification', entry, index),
      sourceAssetId: assetId,
      historyType: 'verification',
      section: normalizeText(entry.section),
      result: normalizeText(entry.result),
      auditId: normalizeText(entry.auditId),
      eventAt: normalizeTimestamp(entry.verifiedAt) || normalizeTimestamp(asset.updatedAt),
      actorId: toSourceId(entry.verifiedBy),
      source: 'asset.verificationHistory',
      payload: entry,
    };
    records.push(record);
    verifications.push({
      ...record,
      sourceVerificationId: record.sourceHistoryId,
      verifiedAt: record.eventAt,
      verifiedBy: record.actorId,
    });
  });

  return { records, transfers, verifications };
};

module.exports = {
  createAssetHistoryRecords,
  createAssetSyncRecord,
};
