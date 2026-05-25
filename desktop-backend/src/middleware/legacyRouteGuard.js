import {
  getLegacyDesktopMode,
  LEGACY_DESKTOP_MODES,
} from '../config/legacyMode.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const legacyRouteGuard = (req, res, next) => {
  const mode = getLegacyDesktopMode();

  res.setHeader('X-Desktop-Legacy-Mode', mode);
  res.setHeader('X-Migration-Path', '/api/assets');

  if (mode === LEGACY_DESKTOP_MODES.DISABLED) {
    return res.status(410).json({
      success: false,
      error: 'Legacy desktop compatibility routes are disabled.',
      migrationPath: '/api/assets',
    });
  }

  if (mode === LEGACY_DESKTOP_MODES.READ_ONLY && WRITE_METHODS.has(req.method)) {
    return res.status(423).json({
      success: false,
      error: 'Legacy desktop compatibility routes are read-only.',
      migrationPath: '/api/assets',
    });
  }

  return next();
};
