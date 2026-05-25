import { getDesktopFeatureFlags } from '../config/featureFlags.js';

export const getFeatureFlags = (_req, res) => res.json({
  success: true,
  features: getDesktopFeatureFlags(),
});

export const recordFeatureUsage = (req, res) => {
  console.log(JSON.stringify({
    service: 'desktop-ui',
    event: 'feature_usage',
    timestamp: new Date().toISOString(),
    user: req.user?.username || null,
    payload: req.body || {},
  }));

  return res.status(202).json({ success: true });
};

export const recordUiMetric = (req, res) => {
  console.log(JSON.stringify({
    service: 'desktop-ui',
    event: 'ui_metric',
    timestamp: new Date().toISOString(),
    user: req.user?.username || null,
    payload: req.body || {},
  }));

  return res.status(202).json({ success: true });
};
