import {
  getLegacyDesktopMode,
  LEGACY_DESKTOP_MODES,
} from './legacyMode.js';

const parseFlag = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const defaultAssetUiEnabled = () => parseFlag(process.env.ASSET_UI_DEFAULT_ENABLED, true);

export const getDesktopFeatureFlags = () => {
  const assetUiEnabled = parseFlag(process.env.ASSET_UI_ENABLED, defaultAssetUiEnabled());
  const legacyMode = getLegacyDesktopMode();

  return {
    assetUi: {
      enabled: assetUiEnabled,
      dashboard: assetUiEnabled && parseFlag(process.env.ASSET_UI_DASHBOARD_ENABLED, true),
      lists: assetUiEnabled && parseFlag(process.env.ASSET_UI_LISTS_ENABLED, true),
      detail: assetUiEnabled && parseFlag(process.env.ASSET_UI_DETAIL_ENABLED, true),
      reporting: assetUiEnabled && parseFlag(process.env.ASSET_UI_REPORTING_ENABLED, true),
      rfidOperations: assetUiEnabled && parseFlag(process.env.ASSET_UI_RFID_OPERATIONS_ENABLED, true),
      verification: assetUiEnabled && parseFlag(process.env.ASSET_UI_VERIFICATION_ENABLED, true),
      transfers: assetUiEnabled && parseFlag(process.env.ASSET_UI_TRANSFERS_ENABLED, true),
      sections: assetUiEnabled && parseFlag(process.env.ASSET_UI_SECTIONS_ENABLED, true),
      technicians: assetUiEnabled && parseFlag(process.env.ASSET_UI_TECHNICIANS_ENABLED, true),
    },
    legacyUi: {
      enabled: legacyMode !== LEGACY_DESKTOP_MODES.DISABLED,
      mode: legacyMode,
      barcodeAdmin: false,
      barcodeReports: false,
      screenWorkflows: false,
    },
  };
};
