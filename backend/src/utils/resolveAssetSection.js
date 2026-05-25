"use strict";

/**
 * Canonical asset section resolver.
 *
 * Modes:
 * - canonical (default): currentSection -> section
 * - legacy: currentSection -> section -> category -> location
 * - strict: currentSection only
 */

const MODES = {
  CANONICAL: "canonical",
  LEGACY: "legacy",
  STRICT: "strict",
};

const trimString = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeMode = (mode) => {
  const normalized = trimString(mode).toLowerCase();
  if (normalized === MODES.STRICT) {
    return MODES.STRICT;
  }
  if (normalized === MODES.LEGACY) {
    return MODES.LEGACY;
  }
  return MODES.CANONICAL;
};

const getDefaultMode = () =>
  normalizeMode(process.env.SECTION_RESOLVER_MODE || MODES.CANONICAL);

const logLegacyFallback = (asset, field) => {
  const assetId = asset?._id ? String(asset._id) : "unknown";
  console.warn(
    `[resolveAssetSection] compatibility fallback used: "${field}" (assetId=${assetId})`,
  );
};

/**
 * @param {object|null|undefined} asset - Mongoose document or plain object
 * @param {{ mode?: 'canonical'|'legacy'|'strict', logFallbacks?: boolean }} [options]
 * @returns {string|null} Resolved section name, or null when unset
 */
const resolveAssetSection = (asset, options = {}) => {
  if (!asset) {
    return null;
  }

  const mode = normalizeMode(options.mode || getDefaultMode());
  const logFallbacks = options.logFallbacks !== false;

  const currentSection = trimString(asset.currentSection);
  if (currentSection) {
    return currentSection;
  }

  if (mode === MODES.STRICT) {
    return null;
  }

  const section = trimString(asset.section);
  if (section) {
    if (logFallbacks) {
      logLegacyFallback(asset, "section");
    }
    return section;
  }

  if (mode === MODES.CANONICAL) {
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
