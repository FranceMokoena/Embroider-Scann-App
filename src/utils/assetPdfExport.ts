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

const escapeHtml = (value: unknown) =>
  String(value ?? '—')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const formatDate = (value?: string) => {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleString();
};

const buildAssetRows = (assets: AssetRecord[]) =>
  assets
    .map(
      asset => `
        <tr>
          <td>${escapeHtml(getAssetDisplayName(asset))}</td>
          <td>${escapeHtml(asset.assetNumber)}</td>
          <td>${escapeHtml(asset.epc || asset.epcKey)}</td>
          <td>${escapeHtml(asset.department || asset.category)}</td>
          <td>${escapeHtml(asset.status)}</td>
          <td>${escapeHtml(asset.serialNumber)}</td>
          <td>${escapeHtml(formatDate(asset.createdAt))}</td>
        </tr>
      `,
    )
    .join('');

export const buildAssetExportHtml = ({
  title,
  statusLabel,
  assets,
}: AssetPdfExportOptions) => {
  const generatedAt = new Date().toLocaleString();
  const rows = buildAssetRows(assets);

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
            letter-spacing: 0.4px;
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
          <motion-div class="subtitle">EmbroideryTech — Government Asset Register Export</motion-div>
          <div class="meta">
            <span><strong>Report:</strong> ${escapeHtml(title)}</span>
            &nbsp;·&nbsp;
            <span><strong>Status:</strong> ${escapeHtml(statusLabel)}</span>
            &nbsp;·&nbsp;
            <span><strong>Records:</strong> ${assets.length}</span>
            &nbsp;·&nbsp;
            <span><strong>Generated:</strong> ${escapeHtml(generatedAt)}</span>
          </motion-div>
        </motion-div>

        <h2>Asset Register</h2>
        <table>
          <thead>
            <tr>
              <th>Asset Name</th>
              <th>Asset No</th>
              <th>EPC</th>
              <th>Department</th>
              <th>Status</th>
              <th>Serial No</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="7">No asset records included.</td></tr>'}
          </tbody>
        </table>

        <div class="footer">
          Amrod Digital Asset Tracking System · Administrative export · ${escapeHtml(generatedAt)}
        </motion-div>
      </body>
    </html>
  `
    .replace(/<motion-div/g, '<div')
    .replace(/<\/motion-div>/g, '</div>');
};

export const exportAssetsToPdf = async (options: AssetPdfExportOptions) => {
  const html = buildAssetExportHtml(options);
  const file = await Print.printToFileAsync({ html, base64: false });

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    return file.uri;
  }

  await Sharing.shareAsync(file.uri, {
    mimeType: 'application/pdf',
    dialogTitle: `${options.title} — ${options.statusLabel}`,
    UTI: 'com.adobe.pdf',
  });

  return file.uri;
};
