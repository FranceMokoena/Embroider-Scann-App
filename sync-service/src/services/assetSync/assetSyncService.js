const {
  MobileAsset,
  MobileAssetTagMapping,
  MobileRFIDTag,
  MobileSection,
  MobileTagScanLog,
} = require('../../models/mobileModels');
const {
  DesktopAsset,
  DesktopAssetHistory,
  DesktopAssetIdentifier,
  DesktopAssetTransfer,
  DesktopAssetVerification,
  DesktopRFIDEvent,
  DesktopSection,
} = require('../../models/desktopModels');
const { createAssetHistoryRecords, createAssetSyncRecord } = require('./dtoMapper');
const {
  buildIdentifierKey,
  normalizeIdentifierValue,
  normalizeText,
  normalizeTimestamp,
  toSourceId,
} = require('./normalization');

const DEFAULT_RFID_EVENT_LIMIT = Number(process.env.SYNC_RFID_EVENT_LIMIT || 0);

const createStats = () => ({
  assets: { created: 0, updated: 0, errors: 0 },
  identifiers: { created: 0, updated: 0, deactivated: 0, errors: 0 },
  assetHistory: { created: 0, updated: 0, errors: 0 },
  assetVerification: { created: 0, updated: 0, errors: 0 },
  assetTransfers: { created: 0, updated: 0, errors: 0 },
  rfidEvents: { created: 0, updated: 0, errors: 0 },
  sections: { created: 0, updated: 0, errors: 0 },
  metrics: {
    duplicateRfidEvents: 0,
    unresolvedIdentifiers: 0,
    syncLagMs: 0,
  },
});

const logStructured = (event, payload = {}) => {
  console.log(JSON.stringify({
    service: 'asset-sync-service',
    event,
    timestamp: new Date().toISOString(),
    ...payload,
  }));
};

class AssetSyncService {
  constructor() {
    this.stats = createStats();
  }

  async performAssetSync() {
    const startedAt = Date.now();
    this.stats = createStats();
    logStructured('asset_sync_started');

    await this.syncSections();

    const context = await this.buildAssetContext();
    await this.syncAssets(context);
    await this.syncUnassignedRFIDTags(context);
    await this.syncRFIDEvents();

    this.stats.metrics.syncLagMs = this.calculateSyncLagMs(context.latestAssetUpdatedAt);
    logStructured('asset_sync_completed', {
      durationMs: Date.now() - startedAt,
      stats: this.stats,
    });

    return this.stats;
  }

  async buildAssetContext() {
    const [mappings, tags, scanLogs, latestAsset] = await Promise.all([
      MobileAssetTagMapping.find({}).lean(),
      MobileRFIDTag.find({}).lean(),
      MobileTagScanLog.find({}).sort({ timestamp: -1 }).lean(),
      MobileAsset.findOne({}).sort({ updatedAt: -1 }).select('updatedAt').lean(),
    ]);

    const tagsById = new Map(tags.map(tag => [toSourceId(tag), tag]));
    const mappingsByAssetId = new Map();
    const mappedTagIds = new Set();
    const latestScanByAssetId = new Map();
    const latestScanByEpc = new Map();

    for (const mapping of mappings) {
      const assetId = toSourceId(mapping.assetId);
      const tagId = toSourceId(mapping.rfidTagId);
      if (tagId) {
        mappedTagIds.add(tagId);
      }

      if (!assetId) {
        continue;
      }

      const assetMappings = mappingsByAssetId.get(assetId) || [];
      assetMappings.push(mapping);
      mappingsByAssetId.set(assetId, assetMappings);
    }

    for (const scanLog of scanLogs) {
      const assetId = toSourceId(scanLog.assetId);
      const epcKey = normalizeIdentifierValue(scanLog.epcKey || scanLog.epcRaw, 'EPC');

      if (assetId && !latestScanByAssetId.has(assetId)) {
        latestScanByAssetId.set(assetId, scanLog);
      }

      if (epcKey && !latestScanByEpc.has(epcKey)) {
        latestScanByEpc.set(epcKey, scanLog);
      }
    }

    return {
      mappingsByAssetId,
      mappedTagIds,
      tags,
      tagsById,
      latestScanByAssetId,
      latestScanByEpc,
      latestAssetUpdatedAt: normalizeTimestamp(latestAsset?.updatedAt),
    };
  }

  async syncSections() {
    logStructured('sections_sync_started');

    const sections = await MobileSection.find({}).lean();
    for (const section of sections) {
      try {
        const sourceSectionId = toSourceId(section);
        const sectionName = normalizeText(section.section);
        if (!sourceSectionId || !sectionName) {
          this.stats.sections.errors += 1;
          continue;
        }

        const result = await this.upsertWithVersion(
          DesktopSection,
          { sourceSectionId },
          {
            sourceSectionId,
            section: sectionName,
            manager: normalizeText(section.manager),
            description: normalizeText(section.description),
            createdBy: toSourceId(section.createdBy),
            createdAtSource: normalizeTimestamp(section.createdAt),
            updatedAtSource: normalizeTimestamp(section.updatedAt),
            lastSynced: new Date(),
          },
        );
        this.increment('sections', result);
      } catch (error) {
        this.stats.sections.errors += 1;
        logStructured('section_sync_failed', {
          sectionId: toSourceId(section),
          error: error.message,
        });
      }
    }

    logStructured('sections_sync_completed', { stats: this.stats.sections });
  }

  async syncAssets(context) {
    logStructured('assets_sync_started');

    const assets = await MobileAsset.find({}).lean();
    const activeAssetIds = [];
    for (const asset of assets) {
      try {
        const dto = createAssetSyncRecord(asset, context);
        if (!dto.assetId) {
          this.stats.assets.errors += 1;
          continue;
        }
        activeAssetIds.push(dto.assetId);

        await this.syncDesktopAsset(dto);
        await this.syncIdentifiers(dto);
        await this.syncHistories(asset);
      } catch (error) {
        this.stats.assets.errors += 1;
        logStructured('asset_sync_failed', {
          assetId: toSourceId(asset),
          assetNumber: asset.assetNumber,
          error: error.message,
        });
      }
    }

    await this.markDeletedAssets(activeAssetIds);

    logStructured('assets_sync_completed', {
      assets: this.stats.assets,
      identifiers: this.stats.identifiers,
      histories: this.stats.assetHistory,
      verifications: this.stats.assetVerification,
      transfers: this.stats.assetTransfers,
    });
  }

  async syncUnassignedRFIDTags(context) {
    for (const tag of context.tags || []) {
      const tagId = toSourceId(tag);
      if (!tagId || context.mappedTagIds.has(tagId)) {
        continue;
      }

      const value = normalizeText(tag.epcRaw) || normalizeText(tag.epcKey);
      const valueNormalized = normalizeIdentifierValue(tag.epcKey || tag.epcRaw, 'RFID');
      const sourceIdentifierKey = buildIdentifierKey({
        type: 'RFID',
        valueNormalized,
        source: 'rfid.tag.unassigned',
      });

      if (!value || !valueNormalized || !sourceIdentifierKey) {
        this.stats.metrics.unresolvedIdentifiers += 1;
        continue;
      }

      try {
        const result = await this.upsertWithVersion(
          DesktopAssetIdentifier,
          { sourceIdentifierKey },
          {
            sourceIdentifierKey,
            sourceAssetId: null,
            type: 'RFID',
            value,
            valueNormalized,
            active: false,
            source: 'rfid.tag.unassigned',
            sourceTagId: tagId,
            sourceMappingId: null,
            firstSeenAt: normalizeTimestamp(tag.firstSeenAt),
            lastSeenAt: normalizeTimestamp(tag.lastSeenAt),
            managedBy: 'asset-sync-service',
            lastSynced: new Date(),
          },
        );
        this.increment('identifiers', result);
      } catch (error) {
        this.stats.identifiers.errors += 1;
        logStructured('unassigned_rfid_tag_sync_failed', {
          tagId,
          epcKey: tag.epcKey,
          error: error.message,
        });
      }
    }
  }

  async syncDesktopAsset(dto) {
    const result = await this.upsertWithVersion(
      DesktopAsset,
      { sourceAssetId: dto.assetId },
      {
        sourceAssetId: dto.assetId,
        assetNumber: dto.assetNumber,
        assetName: dto.assetName,
        status: dto.status,
        sourceStatus: dto.sourceStatus,
        currentSection: dto.currentSection,
        section: dto.section,
        technician: dto.technician,
        currentLocation: dto.currentLocation,
        verificationState: dto.verificationState,
        repairState: dto.repairState,
        transferState: dto.transferState,
        lastSeenAt: dto.lastSeenAt,
        sourceDeleted: false,
        deletedAtSource: null,
        createdAtSource: dto.createdAt,
        updatedAtSource: dto.updatedAt,
        lastSynced: new Date(),
      },
    );
    this.increment('assets', result);
  }

  async markDeletedAssets(activeAssetIds) {
    if (process.env.SYNC_MARK_DELETED_ASSETS === 'false') {
      logStructured('deleted_asset_mark_skipped', { reason: 'disabled_by_flag' });
      return;
    }

    if (activeAssetIds.length === 0 && process.env.SYNC_ALLOW_EMPTY_SOURCE_DELETION !== 'true') {
      logStructured('deleted_asset_mark_skipped', {
        reason: 'empty_source_asset_set',
        mitigation: 'set SYNC_ALLOW_EMPTY_SOURCE_DELETION=true to mark all desktop assets deleted',
      });
      return;
    }

    const filter = activeAssetIds.length > 0
      ? { sourceAssetId: { $nin: activeAssetIds }, sourceDeleted: { $ne: true } }
      : { sourceDeleted: { $ne: true } };

    const deletedAt = new Date();
    const result = await DesktopAsset.updateMany(
      filter,
      {
        $set: {
          sourceDeleted: true,
          deletedAtSource: deletedAt,
          lastSynced: deletedAt,
        },
      },
    );

    if (result.modifiedCount > 0) {
      await DesktopAssetIdentifier.updateMany(
        {
          sourceAssetId: activeAssetIds.length > 0 ? { $nin: activeAssetIds } : { $exists: true },
          managedBy: 'asset-sync-service',
        },
        {
          $set: {
            active: false,
            lastSynced: deletedAt,
          },
        },
      );
    }

    logStructured('deleted_asset_mark_completed', {
      activeAssetIds: activeAssetIds.length,
      markedDeleted: result.modifiedCount || 0,
    });
  }

  async syncIdentifiers(dto) {
    const activeKeys = [];

    for (const identifier of dto.identifierDetails) {
      try {
        activeKeys.push(identifier.sourceIdentifierKey);
        const result = await this.upsertWithVersion(
          DesktopAssetIdentifier,
          { sourceIdentifierKey: identifier.sourceIdentifierKey },
          {
            sourceIdentifierKey: identifier.sourceIdentifierKey,
            sourceAssetId: dto.assetId,
            type: identifier.type,
            value: identifier.value,
            valueNormalized: identifier.valueNormalized,
            active: identifier.active,
            source: identifier.source,
            sourceTagId: identifier.sourceTagId,
            sourceMappingId: identifier.sourceMappingId,
            firstSeenAt: identifier.firstSeenAt,
            lastSeenAt: identifier.lastSeenAt,
            assignedAt: identifier.assignedAt,
            unassignedAt: identifier.unassignedAt,
            managedBy: 'asset-sync-service',
            lastSynced: new Date(),
          },
        );
        this.increment('identifiers', result);
      } catch (error) {
        this.stats.identifiers.errors += 1;
        logStructured('identifier_sync_failed', {
          assetId: dto.assetId,
          identifierKey: identifier.sourceIdentifierKey,
          error: error.message,
        });
      }
    }

    const deactivationFilter = {
      sourceAssetId: dto.assetId,
      managedBy: 'asset-sync-service',
    };

    if (activeKeys.length > 0) {
      deactivationFilter.sourceIdentifierKey = { $nin: activeKeys };
    }

    const deactivated = await DesktopAssetIdentifier.updateMany(
      deactivationFilter,
      {
        $set: {
          active: false,
          lastSynced: new Date(),
        },
      },
    );

    this.stats.identifiers.deactivated += deactivated.modifiedCount || 0;
  }

  async syncHistories(asset) {
    const { records, transfers, verifications } = createAssetHistoryRecords(asset);

    for (const record of records) {
      try {
        const result = await this.upsertWithVersion(
          DesktopAssetHistory,
          { sourceHistoryId: record.sourceHistoryId },
          {
            ...record,
            lastSynced: new Date(),
          },
        );
        this.increment('assetHistory', result);
      } catch (error) {
        this.stats.assetHistory.errors += 1;
        logStructured('asset_history_sync_failed', {
          assetId: toSourceId(asset),
          sourceHistoryId: record.sourceHistoryId,
          error: error.message,
        });
      }
    }

    for (const verification of verifications) {
      try {
        const result = await this.upsertWithVersion(
          DesktopAssetVerification,
          { sourceVerificationId: verification.sourceVerificationId },
          {
            sourceVerificationId: verification.sourceVerificationId,
            sourceAssetId: verification.sourceAssetId,
            section: verification.section,
            result: verification.result,
            auditId: verification.auditId,
            verifiedAt: verification.verifiedAt,
            verifiedBy: verification.verifiedBy,
            payload: verification.payload,
            lastSynced: new Date(),
          },
        );
        this.increment('assetVerification', result);
      } catch (error) {
        this.stats.assetVerification.errors += 1;
        logStructured('asset_verification_sync_failed', {
          assetId: toSourceId(asset),
          sourceVerificationId: verification.sourceVerificationId,
          error: error.message,
        });
      }
    }

    for (const transfer of transfers) {
      try {
        const result = await this.upsertWithVersion(
          DesktopAssetTransfer,
          { sourceTransferId: transfer.sourceTransferId },
          {
            sourceTransferId: transfer.sourceTransferId,
            sourceAssetId: transfer.sourceAssetId,
            fromSection: transfer.fromSection,
            toSection: transfer.toSection,
            transferType: transfer.transferType,
            eventAt: transfer.eventAt,
            actorId: transfer.actorId,
            reason: transfer.reason,
            batchId: transfer.batchId,
            payload: transfer.payload,
            lastSynced: new Date(),
          },
        );
        this.increment('assetTransfers', result);
      } catch (error) {
        this.stats.assetTransfers.errors += 1;
        logStructured('asset_transfer_sync_failed', {
          assetId: toSourceId(asset),
          sourceTransferId: transfer.sourceTransferId,
          error: error.message,
        });
      }
    }
  }

  async syncRFIDEvents() {
    logStructured('rfid_event_sync_started');

    const query = MobileTagScanLog.find({}).sort({ timestamp: 1 }).lean();
    if (DEFAULT_RFID_EVENT_LIMIT > 0) {
      query.limit(DEFAULT_RFID_EVENT_LIMIT);
    }

    const scanLogs = await query;
    for (const scanLog of scanLogs) {
      try {
        const sourceEventId = toSourceId(scanLog);
        if (!sourceEventId) {
          this.stats.rfidEvents.errors += 1;
          continue;
        }

        if (scanLog.duplicateSuppressed) {
          this.stats.metrics.duplicateRfidEvents += 1;
        }

        if (!scanLog.assetId) {
          this.stats.metrics.unresolvedIdentifiers += 1;
        }

        const result = await this.upsertWithVersion(
          DesktopRFIDEvent,
          { sourceEventId },
          {
            sourceEventId,
            sourceAssetId: toSourceId(scanLog.assetId),
            sourceTagId: toSourceId(scanLog.rfidTagId),
            epcRaw: normalizeText(scanLog.epcRaw),
            epcKey: normalizeIdentifierValue(scanLog.epcKey || scanLog.epcRaw, 'EPC'),
            readerSessionId: normalizeText(scanLog.readerSessionId),
            deviceId: normalizeText(scanLog.deviceId),
            source: normalizeText(scanLog.source),
            screen: normalizeText(scanLog.screen),
            mappingStatus: normalizeText(scanLog.mappingStatus),
            duplicateSuppressed: Boolean(scanLog.duplicateSuppressed),
            suppressionReason: normalizeText(scanLog.suppressionReason),
            idempotencyKey: normalizeText(scanLog.idempotencyKey),
            userId: normalizeText(scanLog.userId),
            readTimestamp: normalizeTimestamp(scanLog.readTimestamp),
            eventTimestamp: normalizeTimestamp(scanLog.timestamp) || normalizeTimestamp(scanLog.createdAt),
            serverReceivedAt: normalizeTimestamp(scanLog.serverReceivedAt),
            lastSynced: new Date(),
          },
        );
        this.increment('rfidEvents', result);
      } catch (error) {
        this.stats.rfidEvents.errors += 1;
        logStructured('rfid_event_sync_failed', {
          scanLogId: toSourceId(scanLog),
          epcKey: scanLog.epcKey,
          error: error.message,
        });
      }
    }

    logStructured('rfid_event_sync_completed', {
      rfidEvents: this.stats.rfidEvents,
      duplicateRfidEvents: this.stats.metrics.duplicateRfidEvents,
      unresolvedIdentifiers: this.stats.metrics.unresolvedIdentifiers,
    });
  }

  async upsertWithVersion(Model, filter, data) {
    const existing = await Model.findOne(filter);
    if (existing) {
      await Model.findOneAndUpdate(
        filter,
        {
          ...data,
          syncVersion: (existing.syncVersion || 1) + 1,
        },
      );
      return 'updated';
    }

    await Model.create({
      ...data,
      syncVersion: 1,
    });
    return 'created';
  }

  increment(category, result) {
    if (result === 'created') {
      this.stats[category].created += 1;
      return;
    }

    if (result === 'updated') {
      this.stats[category].updated += 1;
    }
  }

  calculateSyncLagMs(latestUpdatedAt) {
    if (!latestUpdatedAt) {
      return 0;
    }

    return Math.max(0, Date.now() - latestUpdatedAt.getTime());
  }
}

module.exports = AssetSyncService;
