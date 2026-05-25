import mongoose from 'mongoose';

export const IDENTIFIER_TYPES = Object.freeze(['RFID', 'EPC', 'BARCODE', 'QR', 'NFC']);

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

export const normalizeText = value => {
  if (value === null || value === undefined) {
    return null;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : null;
};

export const normalizeStatus = value => {
  const text = normalizeText(value);
  if (!text) {
    return null;
  }

  return STATUS_ALIASES[text] || text;
};

export const normalizeIdentifierType = value => {
  const type = normalizeText(value)?.toUpperCase();
  return IDENTIFIER_TYPES.includes(type) ? type : null;
};

export const normalizeIdentifierValue = (value, type) => {
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

export const escapeRegex = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const toCaseInsensitiveExactRegex = value => new RegExp(`^${escapeRegex(value)}$`, 'i');

export const parsePagination = query => {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const requestedLimit = Number.parseInt(query.limit, 10) || 50;
  const limit = Math.min(Math.max(requestedLimit, 1), 200);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
  };
};

export const createPageMeta = ({ page, limit, total }) => ({
  page,
  limit,
  total,
  totalPages: Math.max(Math.ceil(total / limit), 1),
  hasNextPage: page * limit < total,
  hasPreviousPage: page > 1,
});

const DATE_FILTER_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'createdAtSource',
  'updatedAtSource',
  'lastSeenAt',
  'eventAt',
  'verifiedAt',
  'eventTimestamp',
  'readTimestamp',
  'serverReceivedAt',
  'lastSynced',
]);

export const parseDateRange = (query, defaultField = 'updatedAtSource') => {
  const requestedField = normalizeText(query.dateField) || defaultField;
  const field = DATE_FILTER_FIELDS.has(requestedField) ? requestedField : defaultField;
  const range = {};
  const from = normalizeText(query.from || query.startDate);
  const to = normalizeText(query.to || query.endDate);

  if (from) {
    const fromDate = new Date(from);
    if (!Number.isNaN(fromDate.getTime())) {
      range.$gte = fromDate;
    }
  }

  if (to) {
    const toDate = new Date(to);
    if (!Number.isNaN(toDate.getTime())) {
      range.$lte = toDate;
    }
  }

  return Object.keys(range).length > 0 ? { field, range } : null;
};

export const parseSort = (query, allowedFields, fallback = '-updatedAtSource') => {
  const raw = normalizeText(query.sort) || fallback;
  const descending = raw.startsWith('-');
  const field = descending ? raw.slice(1) : raw;

  if (!allowedFields.includes(field)) {
    const fallbackDescending = fallback.startsWith('-');
    const fallbackField = fallbackDescending ? fallback.slice(1) : fallback;
    return { [fallbackField]: fallbackDescending ? -1 : 1 };
  }

  return { [field]: descending ? -1 : 1 };
};

export const isObjectId = value => mongoose.Types.ObjectId.isValid(value);

export const toNumber = value => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};
