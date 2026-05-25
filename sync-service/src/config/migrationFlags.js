const LEGACY_SCREEN_SYNC_MODES = Object.freeze({
  ENABLED: 'enabled',
  DISABLED: 'disabled',
});

const getLegacyScreenSyncMode = () => {
  const mode = String(process.env.LEGACY_SCREEN_SYNC_MODE || LEGACY_SCREEN_SYNC_MODES.ENABLED)
    .trim()
    .toLowerCase();
  return Object.values(LEGACY_SCREEN_SYNC_MODES).includes(mode)
    ? mode
    : LEGACY_SCREEN_SYNC_MODES.ENABLED;
};

const shouldSyncLegacyScreens = () =>
  getLegacyScreenSyncMode() === LEGACY_SCREEN_SYNC_MODES.ENABLED;

module.exports = {
  LEGACY_SCREEN_SYNC_MODES,
  getLegacyScreenSyncMode,
  shouldSyncLegacyScreens,
};
