const SUPPORTED_IDENTIFIER_TYPES = Object.freeze(['RFID', 'EPC', 'BARCODE', 'QR', 'NFC']);

const STATUS_ALIASES = Object.freeze({
  Reparable: 'Repairable',
  repairable: 'Repairable',
  reparable: 'Repairable',
  Healthy: 'Healthy',
  healthy: 'Healthy',
  'Beyond Repair': 'Beyond Repair',
  beyond_repair: 'Beyond Repair',
  beyondRepair: 'Beyond Repair',
});

const normalizeText = value => {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

const normalizeAssetStatus = status => {
  const text = normalizeText(status);
  if (!text) {
    return null;
  }

  return STATUS_ALIASES[text] || text;
};

const normalizeIdentifierType = type => {
  const normalized = normalizeText(type)?.toUpperCase();
  return SUPPORTED_IDENTIFIER_TYPES.includes(normalized) ? normalized : null;
};

const normalizeIdentifierValue = (value, type) => {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  const identifierType = normalizeIdentifierType(type);
  if (identifierType === 'RFID' || identifierType === 'EPC') {
    return text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  return text;
};

const normalizeTimestamp = value => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toSourceId = value => {
  if (!value) {
    return null;
  }

  if (value._id) {
    return String(value._id);
  }

  return String(value);
};

const buildIdentifierKey = ({ type, valueNormalized, source }) => {
  const identifierType = normalizeIdentifierType(type);
  const normalizedValue = normalizeIdentifierValue(valueNormalized, identifierType);
  const normalizedSource = normalizeText(source) || 'unknown';

  if (!identifierType || !normalizedValue) {
    return null;
  }

  return `${identifierType}:${normalizedValue}:${normalizedSource}`;
};

module.exports = {
  SUPPORTED_IDENTIFIER_TYPES,
  buildIdentifierKey,
  normalizeAssetStatus,
  normalizeIdentifierType,
  normalizeIdentifierValue,
  normalizeText,
  normalizeTimestamp,
  toSourceId,
};
