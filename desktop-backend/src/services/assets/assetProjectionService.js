const groupIdentifiersByAssetId = identifiers => {
  const grouped = new Map();

  for (const identifier of identifiers) {
    if (!identifier.sourceAssetId) {
      continue;
    }

    const list = grouped.get(identifier.sourceAssetId) || [];
    list.push(toIdentifierProjection(identifier));
    grouped.set(identifier.sourceAssetId, list);
  }

  return grouped;
};

export const toIdentifierProjection = identifier => ({
  type: identifier.type,
  value: identifier.value,
  valueNormalized: identifier.valueNormalized,
  active: Boolean(identifier.active),
  source: identifier.source || null,
  sourceTagId: identifier.sourceTagId || null,
  sourceMappingId: identifier.sourceMappingId || null,
  firstSeenAt: identifier.firstSeenAt || null,
  lastSeenAt: identifier.lastSeenAt || null,
  assignedAt: identifier.assignedAt || null,
  unassignedAt: identifier.unassignedAt || null,
});

export const toAssetProjection = (asset, identifiers = []) => ({
  assetId: asset.sourceAssetId,
  assetNumber: asset.assetNumber || null,
  assetName: asset.assetName || null,
  status: asset.status || null,
  currentSection: asset.currentSection || asset.section || null,
  section: asset.currentSection || asset.section || null,
  technician: asset.technician || null,
  identifiers,
  currentLocation: asset.currentLocation || null,
  verificationState: asset.verificationState || null,
  repairState: asset.repairState || null,
  transferState: asset.transferState || null,
  lastSeenAt: asset.lastSeenAt || null,
  createdAt: asset.createdAtSource || null,
  updatedAt: asset.updatedAtSource || null,
  lastSynced: asset.lastSynced || null,
  sourceDeleted: Boolean(asset.sourceDeleted),
  deletedAtSource: asset.deletedAtSource || null,
});

export const toAssetListProjection = (assets, identifiers) => {
  const grouped = groupIdentifiersByAssetId(identifiers);

  return assets.map(asset => toAssetProjection(
    asset,
    grouped.get(asset.sourceAssetId) || [],
  ));
};

export const toHistoryProjection = history => ({
  id: history.sourceHistoryId,
  assetId: history.sourceAssetId,
  type: history.historyType,
  previousStatus: history.previousStatus || null,
  newStatus: history.newStatus || null,
  fromSection: history.fromSection || null,
  toSection: history.toSection || null,
  section: history.section || null,
  result: history.result || null,
  auditId: history.auditId || null,
  transferType: history.transferType || null,
  eventAt: history.eventAt || null,
  actorId: history.actorId || null,
  source: history.source || null,
  reason: history.reason || null,
  batchId: history.batchId || null,
});

export const toTransferProjection = transfer => ({
  id: transfer.sourceTransferId,
  assetId: transfer.sourceAssetId,
  fromSection: transfer.fromSection || null,
  toSection: transfer.toSection || null,
  transferType: transfer.transferType || null,
  eventAt: transfer.eventAt || null,
  actorId: transfer.actorId || null,
  reason: transfer.reason || null,
  batchId: transfer.batchId || null,
});

export const toVerificationProjection = verification => ({
  id: verification.sourceVerificationId,
  assetId: verification.sourceAssetId,
  section: verification.section || null,
  result: verification.result || null,
  auditId: verification.auditId || null,
  verifiedAt: verification.verifiedAt || null,
  verifiedBy: verification.verifiedBy || null,
});

export const toRfidEventProjection = event => ({
  id: event.sourceEventId,
  assetId: event.sourceAssetId || null,
  tagId: event.sourceTagId || null,
  epcRaw: event.epcRaw || null,
  epcKey: event.epcKey || null,
  readerSessionId: event.readerSessionId || null,
  deviceId: event.deviceId || null,
  source: event.source || null,
  screen: event.screen || null,
  mappingStatus: event.mappingStatus || null,
  duplicateSuppressed: Boolean(event.duplicateSuppressed),
  suppressionReason: event.suppressionReason || null,
  idempotencyKey: event.idempotencyKey || null,
  userId: event.userId || null,
  readTimestamp: event.readTimestamp || null,
  eventTimestamp: event.eventTimestamp || null,
  serverReceivedAt: event.serverReceivedAt || null,
});

export const toSectionCardProjection = section => ({
  sectionId: section.currentSection || section.section || 'unassigned',
  sectionName: section.currentSection || section.section || 'Unassigned',
  assetCount: section.assetCount || 0,
  healthyCount: section.healthyCount || 0,
  repairableCount: section.repairableCount || 0,
  writtenOffCount: section.writtenOffCount || 0,
  verifiedCount: section.verifiedCount || 0,
  verificationProgress: section.assetCount
    ? Math.round((section.verifiedCount / section.assetCount) * 100)
    : 0,
});
