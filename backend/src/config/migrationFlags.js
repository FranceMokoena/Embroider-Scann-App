"use strict";

const LEGACY_BARCODE_MODES = Object.freeze({
  READ_WRITE: "read-write",
  READ_ONLY: "read-only",
  DISABLED: "disabled",
});

const normalizeMode = (value, fallback) => {
  const normalized = String(value || "").trim().toLowerCase();
  return Object.values(LEGACY_BARCODE_MODES).includes(normalized)
    ? normalized
    : fallback;
};

const getLegacyBarcodeMode = () =>
  normalizeMode(process.env.LEGACY_BARCODE_MODE, LEGACY_BARCODE_MODES.READ_WRITE);

const getAssetSectionMode = () =>
  String(process.env.SECTION_RESOLVER_MODE || "canonical").trim().toLowerCase();

module.exports = {
  LEGACY_BARCODE_MODES,
  getAssetSectionMode,
  getLegacyBarcodeMode,
};
