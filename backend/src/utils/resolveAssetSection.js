"use strict";

/**
 * Canonical asset section resolver.
 * Modes: legacy (default) | strict
 *
 * legacy: section → category → location
 * strict: section only
 */

const MODES = {
  LEGACY: "legacy",
  STRICT: "strict",
};

const trimString = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeMode = (mode) => {
  const normalized = trimString(mode).toLowerCase();
  if (normalized === MODES.STRICT) {
    return MODES.STRICT;
  }
  return MODES.LEGACY;
};

const getDefaultMode = () =>
  normalizeMode(process.env.SECTION_RESOLVER_MODE || MODES.LEGACY);

const logLegacyFallback = (asset, field) => {
  const assetId = asset?._id ? String(asset._id) : "unknown";
  console.warn(
    `[resolveAssetSection] legacy fallback used: "${field}" (assetId=${assetId})`,
  );
};

/**
 * @param {object|null|undefined} asset - Mongoose document or plain object
 * @param {{ mode?: 'legacy'|'strict', logFallbacks?: boolean }} [options]
 * @returns {string|null} Resolved section name, or null when unset
 */
const resolveAssetSection = (asset, options = {}) => {
  if (!asset) {
    return null;
  }

  const mode = normalizeMode(options.mode || getDefaultMode());
  const logFallbacks = options.logFallbacks !== false;

  const section = trimString(asset.section);
  if (section) {
    return section;
  }

  if (mode === MODES.STRICT) {
    return null;
  }

  const category = trimString(asset.category);
  if (category) {
    if (logFallbacks) {
      logLegacyFallback(asset, "category");
    }
    return category;
  }

  const location = trimString(asset.location);
  if (location) {
    if (logFallbacks) {
      logLegacyFallback(asset, "location");
    }
    return location;
  }

  return null;
};

module.exports = {
  MODES,
  resolveAssetSection,
  getDefaultMode,
};
