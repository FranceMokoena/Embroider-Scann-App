import {
  DesktopAsset,
  DesktopAssetIdentifier,
} from '../../models/assetReadModels.js';
import { assertDesktopDatabaseReady } from '../../config/desktopDatabase.js';
import {
  normalizeIdentifierType,
  normalizeIdentifierValue,
} from './queryUtils.js';
import {
  toAssetProjection,
  toIdentifierProjection,
} from './assetProjectionService.js';

export const resolveAssetByIdentifier = async ({ type, value, activeOnly = true }) => {
  assertDesktopDatabaseReady();

  const identifierType = normalizeIdentifierType(type);
  const valueNormalized = normalizeIdentifierValue(value, identifierType);

  if (!identifierType || !valueNormalized) {
    const error = new Error('type and value are required and must use a supported identifier type');
    error.statusCode = 400;
    throw error;
  }

  const identifierFilter = {
    type: identifierType,
    valueNormalized,
  };

  if (activeOnly) {
    identifierFilter.active = true;
  }

  const identifiers = await DesktopAssetIdentifier.find(identifierFilter)
    .sort({ active: -1, lastSeenAt: -1 })
    .lean();

  const assetIds = [...new Set(identifiers.map(item => item.sourceAssetId).filter(Boolean))];
  const assets = assetIds.length
    ? await DesktopAsset.find({
      sourceAssetId: { $in: assetIds },
      sourceDeleted: { $ne: true },
    }).lean()
    : [];
  const assetsById = new Map(assets.map(asset => [asset.sourceAssetId, asset]));

  const resolved = identifiers.map(identifier => ({
    identifier: toIdentifierProjection(identifier),
    asset: identifier.sourceAssetId && assetsById.has(identifier.sourceAssetId)
      ? toAssetProjection(assetsById.get(identifier.sourceAssetId), [toIdentifierProjection(identifier)])
      : null,
  }));

  return {
    type: identifierType,
    value: valueNormalized,
    resolved,
    unresolvedCount: resolved.filter(item => !item.asset).length,
  };
};
