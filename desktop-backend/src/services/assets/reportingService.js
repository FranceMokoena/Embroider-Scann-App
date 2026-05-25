import {
  DesktopAsset,
  DesktopAssetIdentifier,
} from '../../models/assetReadModels.js';
import { assertDesktopDatabaseReady } from '../../config/desktopDatabase.js';
import {
  createPageMeta,
  normalizeStatus,
  normalizeText,
  parsePagination,
} from './queryUtils.js';
import {
  toAssetProjection,
  toIdentifierProjection,
} from './assetProjectionService.js';
import {
  getAssetHistory,
  getAssetTransfers,
  getAssetVerifications,
  getRfidActivity,
} from './historyService.js';
import {
  getAssetDashboard,
  getSectionSummaryCards,
  getTechnicianSummaryCards,
} from './dashboardService.js';

const buildReportEnvelope = (type, query, payload) => ({
  type,
  generatedAt: new Date(),
  filters: query,
  ...payload,
});

const getAssetLifecycleReport = async query => {
  const history = await getAssetHistory(query);
  return buildReportEnvelope('asset_lifecycle', query, {
    history: history.records,
    meta: history.meta,
  });
};

const getSectionReport = async query => {
  const sections = await getSectionSummaryCards();
  const section = normalizeText(query.section);
  return buildReportEnvelope('sections', query, {
    sections: section
      ? sections.filter(item => item.sectionName.toLowerCase() === section.toLowerCase())
      : sections,
  });
};

const getTechnicianReport = async query => {
  const technicians = await getTechnicianSummaryCards();
  const technician = normalizeText(query.technician || query.technicianId);
  return buildReportEnvelope('technicians', query, {
    technicians: technician
      ? technicians.filter(item => item.technicianId === technician)
      : technicians,
  });
};

const getUnresolvedIdentifierReport = async query => {
  assertDesktopDatabaseReady();

  const pagination = parsePagination(query);
  const filter = {
    $or: [
      { sourceAssetId: null },
      { sourceAssetId: '' },
      { sourceAssetId: { $exists: false } },
    ],
  };

  const [identifiers, total] = await Promise.all([
    DesktopAssetIdentifier.find(filter)
      .sort({ lastSeenAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    DesktopAssetIdentifier.countDocuments(filter),
  ]);

  return buildReportEnvelope('unresolved_identifiers', query, {
    identifiers: identifiers.map(toIdentifierProjection),
    meta: createPageMeta({ ...pagination, total }),
  });
};

const getAssetSnapshotReport = async query => {
  assertDesktopDatabaseReady();

  const pagination = parsePagination(query);
  const filter = query.includeDeleted === 'true' ? {} : { sourceDeleted: { $ne: true } };
  const status = normalizeStatus(query.status);
  const section = normalizeText(query.currentSection || query.section);

  if (status) filter.status = status;
  if (section) filter.currentSection = section;

  const [assets, total] = await Promise.all([
    DesktopAsset.find(filter)
      .sort({ updatedAtSource: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    DesktopAsset.countDocuments(filter),
  ]);

  return buildReportEnvelope('asset_snapshot', query, {
    assets: assets.map(asset => toAssetProjection(asset)),
    meta: createPageMeta({ ...pagination, total }),
  });
};

export const getAssetReport = async (reportType, query = {}) => {
  const type = normalizeText(reportType) || 'dashboard';

  switch (type) {
    case 'asset_lifecycle':
    case 'lifecycle':
      return getAssetLifecycleReport(query);
    case 'sections':
    case 'section':
      return getSectionReport(query);
    case 'technicians':
    case 'technician':
      return getTechnicianReport(query);
    case 'transfers': {
      const transfers = await getAssetTransfers(query);
      return buildReportEnvelope('transfers', query, {
        transfers: transfers.records,
        meta: transfers.meta,
      });
    }
    case 'verifications': {
      const verifications = await getAssetVerifications(query);
      return buildReportEnvelope('verifications', query, {
        verifications: verifications.records,
        meta: verifications.meta,
      });
    }
    case 'rfid':
    case 'rfid_operational': {
      const rfidActivity = await getRfidActivity(query);
      return buildReportEnvelope('rfid_operational', query, {
        events: rfidActivity.records,
        meta: rfidActivity.meta,
      });
    }
    case 'unresolved_identifiers':
      return getUnresolvedIdentifierReport(query);
    case 'movement': {
      const movement = await getAssetTransfers(query);
      return buildReportEnvelope('movement', query, {
        movements: movement.records,
        meta: movement.meta,
      });
    }
    case 'snapshot':
      return getAssetSnapshotReport(query);
    case 'dashboard':
      return buildReportEnvelope('dashboard', query, {
        dashboard: await getAssetDashboard(query),
      });
    default: {
      const error = new Error(`Unsupported asset report type: ${type}`);
      error.statusCode = 400;
      throw error;
    }
  }
};
