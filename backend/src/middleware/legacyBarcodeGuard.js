"use strict";

const {
  LEGACY_BARCODE_MODES,
  getLegacyBarcodeMode,
} = require("../config/migrationFlags");

const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const legacyBarcodeGuard = (req, res, next) => {
  const mode = getLegacyBarcodeMode();

  res.setHeader("X-Legacy-Barcode-Mode", mode);
  res.setHeader("X-Migration-Path", "/api/assets and /api/rfid");

  if (mode === LEGACY_BARCODE_MODES.DISABLED) {
    return res.status(410).json({
      success: false,
      error: "Legacy barcode endpoints are disabled. Use RFID asset APIs.",
      migrationPath: "/api/assets and /api/rfid",
    });
  }

  if (mode === LEGACY_BARCODE_MODES.READ_ONLY && WRITE_METHODS.has(req.method)) {
    return res.status(423).json({
      success: false,
      error: "Legacy barcode endpoints are in read-only compatibility mode.",
      migrationPath: "/api/assets and /api/rfid",
    });
  }

  return next();
};

module.exports = {
  legacyBarcodeGuard,
};
