"use strict";

const assetService = require('../services/assetService');

const sendAssetError = (res, error, fallbackMessage) => {
  const statusCode = error.statusCode || 500;
  const message = statusCode >= 500 ? fallbackMessage : 'Validation error';

  console.error(`Asset controller error: ${fallbackMessage}`, error);

  return res.status(statusCode).json({
    success: false,
    message,
    error: error.message || 'Unknown error',
  });
};

const createAsset = async (req, res) => {
  try {
    const asset = await assetService.createAsset({
      ...req.body,
      userId: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: 'Asset created successfully',
      data: asset,
    });
  } catch (error) {
    return sendAssetError(res, error, 'Failed to create asset');
  }
};

const createBulkAssets = async (req, res) => {
  try {
    const result = await assetService.createBulkAssets({
      ...req.body,
      userId: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: `${result.createdCount} asset(s) created`,
      ...result,
    });
  } catch (error) {
    return sendAssetError(res, error, 'Failed to create bulk assets');
  }
};

const createSection = async (req, res) => {
  try {
    const section = await assetService.createSection({
      ...req.body,
      userId: req.userId,
    });

    return res.status(201).json({
      success: true,
      message: 'Section created successfully',
      data: section,
    });
  } catch (error) {
    return sendAssetError(res, error, 'Failed to create section');
  }
};

const listAssets = async (req, res) => {
  try {
    const assets = await assetService.getAllAssets(req.query);

    return res.status(200).json({
      success: true,
      assets,
    });
  } catch (error) {
    return sendAssetError(res, error, 'Failed to list assets');
  }
};

const getAssetById = async (req, res) => {
  try {
    const asset = await assetService.getAssetById(req.params.id);

    return res.status(200).json({
      success: true,
      data: asset,
    });
  } catch (error) {
    return sendAssetError(res, error, 'Failed to load asset');
  }
};

const getAssetSummary = async (_req, res) => {
  try {
    const summary = await assetService.getAssetSummary();

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    return sendAssetError(res, error, 'Failed to load asset summary');
  }
};

const deleteAsset = async (req, res) => {
  try {
    const asset = await assetService.deleteAsset(req.params.id);

    return res.status(200).json({
      success: true,
      message: 'Asset deleted successfully',
      data: asset,
    });
  } catch (error) {
    return sendAssetError(res, error, 'Failed to delete asset');
  }
};

const updateAsset = async (req, res) => {
  try {
    const asset = await assetService.updateAsset(req.params.id, {
      ...req.body,
      userId: req.userId,
    });

    return res.status(200).json({
      success: true,
      message: 'Asset updated successfully',
      data: asset,
    });
  } catch (error) {
    return sendAssetError(res, error, 'Failed to update asset');
  }
};

const getAssignmentLifecycle = async (req, res) => {
  try {
    const lifecycle = await assetService.getAssignmentLifecycle();

    return res.status(200).json({
      success: true,
      lifecycle,
    });
  } catch (error) {
    return sendAssetError(res, error, 'Failed to load assignment lifecycle');
  }
};

const getSectionOptions = async (_req, res) => {
  try {
    const sections = await assetService.getAvailableSections();

    return res.status(200).json({
      success: true,
      sections,
    });
  } catch (error) {
    return sendAssetError(res, error, 'Failed to load section options');
  }
};

const getSectionsSummary = async (_req, res) => {
  try {
    const summary = await assetService.getSectionSummary();

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    return sendAssetError(res, error, 'Failed to load section summary');
  }
};

const exportSectionsPdf = async (req, res) => {
  try {
    const sectionFilter = req.query && req.query.section ? String(req.query.section) : null;
    const summary = await assetService.getSectionSummary();

    // Optionally filter to a single section
    const rows = sectionFilter
      ? summary.filter(s => s.section === sectionFilter)
      : summary;

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const base64 = buffer.toString('base64');
      return res.status(200).json({ success: true, pdfBase64: base64 });
    });

    doc.fontSize(18).text('Sections Summary', { align: 'center' });
    doc.moveDown(0.5);

    // Header row
    doc.fontSize(11).text('Section', { continued: true, width: 220 });
    doc.text('Manager', { continued: true, width: 140 });
    doc.text('Created', { continued: true, width: 120 });
    doc.text('Total', { align: 'right' });
    doc.moveDown(0.3);

    // Rows
    rows.forEach(row => {
      doc.fontSize(10).text(row.section || '—', { continued: true, width: 220 });
      doc.text(row.manager?.trim() || '—', { continued: true, width: 140 });
      doc.text(row.createdAt ? new Date(row.createdAt).toLocaleString() : '—', { continued: true, width: 120 });
      doc.text(String(row.totalAssets || 0), { align: 'right' });
      doc.moveDown(0.2);
    });

    doc.end();
  } catch (error) {
    return sendAssetError(res, error, 'Failed to export sections');
  }
};

module.exports = {
  createBulkAssets,
  createAsset,
  createSection,
  deleteAsset,
  getAssetById,
  getSectionOptions,
  getSectionsSummary,
  exportSectionsPdf,
  getAssetSummary,
  getAssignmentLifecycle,
  listAssets,
  updateAsset,
};
