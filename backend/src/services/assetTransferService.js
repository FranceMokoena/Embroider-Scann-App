"use strict";

const crypto = require("crypto");
const mongoose = require("mongoose");
const Asset = require("../models/Asset");
const Section = require("../models/Section");
const { resolveAssetSection } = require("../utils/resolveAssetSection");

const MAX_BATCH_SIZE = 100;
const DEFAULT_TRANSFER_TYPE = "reassignment";
const LIFECYCLE_SOURCE = "asset_rotation";
const STATUS_VALUES = ["Healthy", "Repairable", "Beyond Repair"];

const createServiceError = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const trimString = (value) => (typeof value === "string" ? value.trim() : "");

const escapeRegex = (value) =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeTransferType = (value) => {
  const normalized = trimString(value);
  return normalized || DEFAULT_TRANSFER_TYPE;
};

const normalizeNewStatus = (value) => {
  if (value === undefined || value === null) {
    return null;
  }

  const normalized = trimString(value);

  if (!normalized) {
    throw createServiceError("newStatus cannot be empty", 400);
  }

  if (!STATUS_VALUES.includes(normalized)) {
    throw createServiceError(
      `newStatus must be one of: ${STATUS_VALUES.join(", ")}`,
      400,
    );
  }

  return normalized;
};

/**
 * Verification is contextual to the current section. Historical audit records
 * stay immutable, but movement resets the current verification marker.
 *
 * @param {import('mongoose').Document} asset
 * @param {{ fromSection: string|null, toSection: string }} context
 */
const applyVerificationPolicyOnTransfer = (asset, context) => {
  const fromSection = trimString(context.fromSection || "");
  const toSection = trimString(context.toSection || "");

  if (!toSection || fromSection.toLowerCase() === toSection.toLowerCase()) {
    return;
  }

  asset.verificationStatus = "Pending";
  asset.verifiedAt = null;
  asset.verifiedBy = null;
};

const assertTargetSectionExists = async (toSection) => {
  const sectionDoc = await Section.findOne({
    section: { $regex: `^${escapeRegex(toSection)}$`, $options: "i" },
  });

  if (!sectionDoc) {
    throw createServiceError(
      "Target section does not exist. Create the section in the registry before transferring assets.",
      404,
    );
  }

  return trimString(sectionDoc.section) || toSection;
};

const normalizeAssetIds = (assetIds) => {
  if (!Array.isArray(assetIds) || assetIds.length === 0) {
    throw createServiceError("assetIds must be a non-empty array", 400);
  }

  const unique = [];
  const seen = new Set();

  for (const rawId of assetIds) {
    const id = trimString(String(rawId || ""));
    if (!id || seen.has(id)) {
      continue;
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw createServiceError(`Invalid asset id: ${id}`, 400);
    }
    seen.add(id);
    unique.push(id);
  }

  if (unique.length === 0) {
    throw createServiceError("assetIds must contain at least one valid id", 400);
  }

  if (unique.length > MAX_BATCH_SIZE) {
    throw createServiceError(
      `Cannot transfer more than ${MAX_BATCH_SIZE} assets per request`,
      400,
    );
  }

  return unique;
};

const buildTransferEntry = ({
  fromSection,
  toSection,
  assignedBy,
  transferType,
  reason,
  batchId,
}) => ({
  fromSection: fromSection || undefined,
  toSection,
  assignedAt: new Date(),
  assignedBy,
  source: LIFECYCLE_SOURCE,
  transferType: normalizeTransferType(transferType),
  reason: trimString(reason) || undefined,
  batchId,
});

const applyStatusUpdateOnTransfer = ({
  asset,
  newStatus,
  changedBy,
  reason,
  batchId,
}) => {
  if (!newStatus) {
    return false;
  }

  const previousStatus = trimString(asset.status);

  if (previousStatus === newStatus) {
    return false;
  }

  asset.statusHistory = asset.statusHistory || [];
  asset.statusHistory.push({
    previousStatus: previousStatus || undefined,
    newStatus,
    changedAt: new Date(),
    changedBy,
    source: `${LIFECYCLE_SOURCE}_status_update`,
    reason: trimString(reason) || undefined,
    batchId,
  });

  asset.status = newStatus;
  return true;
};

/**
 * Centralized asset section transfer orchestration.
 *
 * @param {{
 *   assetIds: string[],
 *   toSection: string,
 *   assignedBy?: string,
 *   reason?: string,
 *   newStatus?: string,
 *   transferType?: string,
 *   batchId?: string,
 *   assignmentSource?: string,
 * }} params
 */
const transferAssets = async ({
  assetIds,
  toSection,
  assignedBy,
  reason,
  newStatus,
  transferType,
  batchId: providedBatchId,
  assignmentSource,
}) => {
  const normalizedTarget = trimString(toSection);
  if (!normalizedTarget) {
    throw createServiceError("toSection is required", 400);
  }

  const canonicalToSection = await assertTargetSectionExists(normalizedTarget);
  const normalizedNewStatus = normalizeNewStatus(newStatus);
  const normalizedIds = normalizeAssetIds(assetIds);
  const batchId =
    trimString(providedBatchId) || crypto.randomUUID();
  const normalizedTransferType = normalizeTransferType(transferType);

  const transferred = [];
  const skipped = [];
  const errors = [];

  console.info("[assetTransferService] transfer batch started", {
    batchId,
    toSection: canonicalToSection,
    newStatus: normalizedNewStatus || undefined,
    requested: normalizedIds.length,
    transferType: normalizedTransferType,
  });

  for (const assetId of normalizedIds) {
    try {
      const asset = await Asset.findById(assetId);

      if (!asset) {
        errors.push({
          assetId,
          message: "Asset not found",
          statusCode: 404,
        });
        continue;
      }

      const fromSection = resolveAssetSection(asset);
      const fromNormalized = fromSection ? trimString(fromSection) : null;
      const previousStatus = trimString(asset.status) || null;

      if (fromNormalized === canonicalToSection) {
        skipped.push({
          assetId: String(asset._id),
          fromSection: fromNormalized,
          toSection: canonicalToSection,
          fromStatus: previousStatus,
          toStatus: normalizedNewStatus || previousStatus,
          reason: "already_in_target_section",
        });
        continue;
      }

      applyVerificationPolicyOnTransfer(asset, {
        fromSection: fromNormalized,
        toSection: canonicalToSection,
      });

      asset.currentSection = canonicalToSection;
      asset.section = canonicalToSection;
      asset.category = undefined;
      asset.location = undefined;

      asset.assignmentLifecycleHistory = asset.assignmentLifecycleHistory || [];
      asset.assignmentLifecycleHistory.push(
        buildTransferEntry({
          fromSection: fromNormalized,
          toSection: canonicalToSection,
          assignedBy,
          transferType: normalizedTransferType,
          reason,
          batchId,
        }),
      );

      asset.assignmentInformation = {
        assignedAt: new Date(),
        assignedBy,
        source: assignmentSource || LIFECYCLE_SOURCE,
      };

      if (assignedBy) {
        asset.updatedBy = assignedBy;
      }

      const statusChanged = applyStatusUpdateOnTransfer({
        asset,
        newStatus: normalizedNewStatus,
        changedBy: assignedBy,
        reason,
        batchId,
      });

      await asset.save();

      const { mapAssetResponse } = require("./assetService");
      transferred.push({
        assetId: String(asset._id),
        fromSection: fromNormalized,
        toSection: canonicalToSection,
        fromStatus: previousStatus,
        toStatus: trimString(asset.status) || null,
        statusChanged,
        asset: mapAssetResponse(asset),
      });
    } catch (error) {
      console.error("[assetTransferService] transfer failed for asset", {
        batchId,
        assetId,
        message: error.message,
      });
      errors.push({
        assetId,
        message: error.message || "Transfer failed",
        statusCode: error.statusCode || 500,
      });
    }
  }

  const summary = {
    requested: normalizedIds.length,
    transferred: transferred.length,
    skipped: skipped.length,
    failed: errors.length,
  };

  console.info("[assetTransferService] transfer batch completed", {
    batchId,
    ...summary,
  });

  return {
    success: errors.length === 0,
    batchId,
    toSection: canonicalToSection,
    newStatus: normalizedNewStatus || undefined,
    transferType: normalizedTransferType,
    transferred,
    skipped,
    errors,
    summary,
  };
};

module.exports = {
  transferAssets,
  applyVerificationPolicyOnTransfer,
  MAX_BATCH_SIZE,
};
