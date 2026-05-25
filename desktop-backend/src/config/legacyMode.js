const LEGACY_DESKTOP_MODES = Object.freeze({
  READ_ONLY: 'read-only',
  READ_WRITE: 'read-write',
  DISABLED: 'disabled',
});

const normalizeLegacyMode = value => {
  const normalized = String(value || '').trim().toLowerCase();
  return Object.values(LEGACY_DESKTOP_MODES).includes(normalized)
    ? normalized
    : LEGACY_DESKTOP_MODES.READ_ONLY;
};

export const getLegacyDesktopMode = () =>
  normalizeLegacyMode(process.env.DESKTOP_LEGACY_MODE);

export { LEGACY_DESKTOP_MODES };
