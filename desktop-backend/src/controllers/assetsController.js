import {
  getAssetById,
  listAssets as listAssetsService,
} from '../services/assets/assetReadService.js';
import {
  getAssetDashboard,
  getAssetStatistics,
  getAssetSummaryCards,
  getSectionSummaryCards,
  getTechnicianSummaryCards,
} from '../services/assets/dashboardService.js';
import {
  getAssetHistory as getAssetHistoryService,
  getAssetTransfers as getAssetTransfersService,
  getAssetVerifications as getAssetVerificationsService,
  getRfidActivity,
  getSectionActivity,
  getTechnicianActivity,
} from '../services/assets/historyService.js';
import { resolveAssetByIdentifier } from '../services/assets/identifierResolutionService.js';
import { getAssetReport as getAssetReportService } from '../services/assets/reportingService.js';
import {
  createRequestTrace,
  runWithAssetApiMetrics,
} from '../services/assets/assetObservabilityService.js';

const sendAssetResponse = (res, payload, durationMs) => {
  res.setHeader('X-Asset-API-Duration-Ms', String(durationMs));
  return res.json({
    success: true,
    ...payload,
  });
};

const sendAssetError = (res, error) => {
  const status = error.statusCode || 500;
  return res.status(status).json({
    success: false,
    error: error.message || 'Asset API error',
  });
};

const handleAssetRequest = operation => async (req, res) => {
  const trace = createRequestTrace(req);

  try {
    const { result, durationMs } = await runWithAssetApiMetrics(
      operation.name,
      trace,
      () => operation.handler(req),
    );
    return sendAssetResponse(res, result, durationMs);
  } catch (error) {
    return sendAssetError(res, error);
  }
};

export const listAssets = handleAssetRequest({
  name: 'assets.list',
  handler: req => listAssetsService(req.query),
});

export const getAsset = handleAssetRequest({
  name: 'assets.detail',
  handler: req => getAssetById(req.params.id),
});

export const getAssetSummary = handleAssetRequest({
  name: 'assets.summary',
  handler: async () => ({ summary: await getAssetSummaryCards() }),
});

export const getAssetDashboardView = handleAssetRequest({
  name: 'assets.dashboard',
  handler: async req => ({ dashboard: await getAssetDashboard(req.query) }),
});

export const getAssetStatisticsView = handleAssetRequest({
  name: 'assets.statistics',
  handler: async req => ({ statistics: await getAssetStatistics(req.query) }),
});

export const getAssetHistory = handleAssetRequest({
  name: 'assets.history',
  handler: async req => {
    const result = await getAssetHistoryService(req.query);
    return { history: result.records, meta: result.meta };
  },
});

export const getAssetTransfers = handleAssetRequest({
  name: 'assets.transfers',
  handler: async req => {
    const result = await getAssetTransfersService(req.query);
    return { transfers: result.records, meta: result.meta };
  },
});

export const getAssetVerifications = handleAssetRequest({
  name: 'assets.verifications',
  handler: async req => {
    const result = await getAssetVerificationsService(req.query);
    return { verifications: result.records, meta: result.meta };
  },
});

export const getAssetRfidActivity = handleAssetRequest({
  name: 'assets.rfidActivity',
  handler: async req => {
    const result = await getRfidActivity(req.query);
    return { events: result.records, meta: result.meta };
  },
});

export const getAssetTechnicians = handleAssetRequest({
  name: 'assets.technicians',
  handler: async req => {
    if (req.query.includeActivity === 'true') {
      return { technicianActivity: await getTechnicianActivity(req.query) };
    }

    return { technicians: await getTechnicianSummaryCards() };
  },
});

export const getAssetSections = handleAssetRequest({
  name: 'assets.sections',
  handler: async req => {
    if (req.query.includeActivity === 'true') {
      return { sectionActivity: await getSectionActivity(req.query) };
    }

    return { sections: await getSectionSummaryCards() };
  },
});

export const resolveAssetIdentifier = handleAssetRequest({
  name: 'assets.resolveIdentifier',
  handler: req => resolveAssetByIdentifier({
    type: req.query.type || req.params.type,
    value: req.query.value || req.params.value,
    activeOnly: req.query.activeOnly !== 'false',
  }),
});

export const getAssetReport = handleAssetRequest({
  name: 'assets.report',
  handler: req => getAssetReportService(req.params.type, req.query),
});
