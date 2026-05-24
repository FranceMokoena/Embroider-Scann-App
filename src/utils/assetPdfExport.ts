import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { ERP_COLORS, PRIMARY_BLUE } from '../theme/erpTheme';
import type { AssetRecord } from '../services/assetApi';
import { getAssetDisplayName } from '../services/assetApi';

type AssetPdfExportOptions = {
  title: string;
  statusLabel: string;
  assets: AssetRecord[];
};

export type AssignmentLifecycleExportRecord = {
  assetName?: string;
  assetNumber?: string;
  initialSection?: string;
  currentSection?: string;
  assignedBy?: string;
  assignmentDate?: string;
  lastUpdated?: string;
};

type LifecyclePdfExportOptions = {
  title: string;
  statusLabel: string;
  records: AssignmentLifecycleExportRecord[];
};

const escapeHtml = (value: unknown) =>
  String(value ?? '-')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatDate = (value?: string | null) => {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString();
};

const buildDocumentShell = ({
  title,
  statusLabel,
  recordCount,
  heading,
  subtitle,
  table,
}: {
  title: string;
  statusLabel: string;
  recordCount: number;
  heading: string;
  subtitle: string;
  table: string;
}) => {
  const generatedAt = new Date().toLocaleString();

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: ${ERP_COLORS.ink};
            margin: 28px;
            background: #ffffff;
          }
          .header {
            border-bottom: 4px solid ${PRIMARY_BLUE};
            padding-bottom: 16px;
            margin-bottom: 22px;
          }
          .brand {
            font-size: 22px;
            font-weight: 800;
            color: ${PRIMARY_BLUE};
          }
          .subtitle {
            margin-top: 6px;
            font-size: 12px;
            color: ${ERP_COLORS.muted};
          }
          .meta {
            margin-top: 14px;
            font-size: 11px;
            color: ${ERP_COLORS.muted};
          }
          .meta strong {
            color: ${ERP_COLORS.ink};
          }
          h2 {
            font-size: 15px;
            color: ${ERP_COLORS.primaryBlueDark};
            margin: 0 0 10px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
          }
          th, td {
            border: 1px solid ${ERP_COLORS.border};
            padding: 8px 6px;
            font-size: 10px;
            text-align: left;
          }
          th {
            background: ${ERP_COLORS.primaryBlueSoft};
            color: ${ERP_COLORS.primaryBlueDark};
            font-weight: 700;
          }
          tr:nth-child(even) td {
            background: #f8fafc;
          }
          .footer {
            margin-top: 28px;
            padding-top: 14px;
            border-top: 1px solid ${ERP_COLORS.border};
            font-size: 10px;
            color: ${ERP_COLORS.muted};
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">Amrod ERP</div>
          <div class="subtitle">${escapeHtml(subtitle)}</div>
          <div class="meta">
            <span><strong>Report:</strong> ${escapeHtml(title)}</span>
            &nbsp;-&nbsp;
            <span><strong>Status:</strong> ${escapeHtml(statusLabel)}</span>
            &nbsp;-&nbsp;
            <span><strong>Records:</strong> ${recordCount}</span>
            &nbsp;-&nbsp;
            <span><strong>Generated:</strong> ${escapeHtml(generatedAt)}</span>
          </div>
        </div>

        <h2>${escapeHtml(heading)}</h2>
        ${table}

        <div class="footer">
          Amrod Digital Asset Tracking System - Administrative export - ${escapeHtml(generatedAt)}
        </div>
      </body>
    </html>
  `;
};

const buildAssetRows = (assets: AssetRecord[]) =>
  assets
    .map(
      asset => `
        <tr>
          <td>${escapeHtml(getAssetDisplayName(asset))}</td>
          <td>${escapeHtml(asset.assetNumber)}</td>
          <td>${escapeHtml(asset.epc || asset.epcKey)}</td>
          <td>${escapeHtml(asset.section || asset.department || asset.category || asset.location)}</td>
          <td>${escapeHtml(asset.status)}</td>
          <td>${escapeHtml(asset.serialNumber)}</td>
          <td>${escapeHtml(asset.assignmentInformation?.assignedBy ? String(asset.assignmentInformation.assignedBy) : '-')}</td>
          <td>${escapeHtml(formatDate(asset.assignmentInformation?.assignedAt))}</td>
          <td>${escapeHtml(formatDate(asset.createdAt))}</td>
          <td>${escapeHtml(formatDate(asset.updatedAt))}</td>
        </tr>
      `,
    )
    .join('');

const buildLifecycleRows = (records: AssignmentLifecycleExportRecord[]) =>
  records
    .map(
      record => `
        <tr>
          <td>${escapeHtml(record.assetName)}</td>
          <td>${escapeHtml(record.assetNumber)}</td>
          <td>${escapeHtml(record.initialSection)}</td>
          <td>${escapeHtml(record.currentSection)}</td>
          <td>${escapeHtml(record.assignedBy)}</td>
          <td>${escapeHtml(formatDate(record.assignmentDate))}</td>
          <td>${escapeHtml(formatDate(record.lastUpdated))}</td>
        </tr>
      `,
    )
    .join('');

export const buildAssetExportHtml = ({
  title,
  statusLabel,
  assets,
}: AssetPdfExportOptions) =>
  buildDocumentShell({
    title,
    statusLabel,
    recordCount: assets.length,
    heading: 'Asset Register',
    subtitle: 'EmbroideryTech - Government Asset Register Export',
    table: `
      <table>
        <thead>
          <tr>
            <th>Asset Name</th>
            <th>Asset No</th>
            <th>RFID Tag (EPC)</th>
            <th>Section</th>
            <th>Status</th>
            <th>Serial No</th>
            <th>Assigned By</th>
            <th>Assignment Date</th>
            <th>Created</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          ${buildAssetRows(assets) || '<tr><td colspan="10">No asset records included.</td></tr>'}
        </tbody>
      </table>
    `,
  });

export const buildLifecycleExportHtml = ({
  title,
  statusLabel,
  records,
}: LifecyclePdfExportOptions) =>
  buildDocumentShell({
    title,
    statusLabel,
    recordCount: records.length,
    heading: 'Assignment Lifecycle',
    subtitle: 'EmbroideryTech - Asset Assignment Lifecycle Export',
    table: `
      <table>
        <thead>
          <tr>
            <th>Asset Name</th>
            <th>Asset No</th>
            <th>Initial Section</th>
            <th>Current Section</th>
            <th>Assigned By</th>
            <th>Assignment Date</th>
            <th>Last Updated</th>
          </tr>
        </thead>
        <tbody>
          ${buildLifecycleRows(records) || '<tr><td colspan="7">No lifecycle records included.</td></tr>'}
        </tbody>
      </table>
    `,
  });

const sharePdf = async (html: string, dialogTitle: string) => {
  const file = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    return file.uri;
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    dialogTitle,
    UTI: 'com.adobe.pdf',
  });

  return file.uri;
};

export const exportAssetsToPdf = async (options: AssetPdfExportOptions) =>
  sharePdf(
    buildAssetExportHtml(options),
    `${options.title} - ${options.statusLabel}`,
  );

export const exportLifecycleToPdf = async (options: LifecyclePdfExportOptions) =>
  sharePdf(
    buildLifecycleExportHtml(options),
    `${options.title} - ${options.statusLabel}`,
  );
