import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import { ERP_COLORS, PRIMARY_BLUE } from '../theme/erpTheme';
import type { AssetRecord, SectionSummary } from '../services/assetApi';
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

type SectionsPdfExportOptions = {
  title: string;
  statusLabel: string;
  sections: SectionSummary[];
};

export type SectionDetailPdfExportOptions = {
  title: string;
  sectionName: string;
  summary: SectionSummary;
  assets: AssetRecord[];
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

const erpPdfStyles = `
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
  .panel {
    border: 1px solid ${ERP_COLORS.border};
    border-radius: 8px;
    background: #f8fafc;
    padding: 14px;
    margin-bottom: 18px;
  }
  .panel-title {
    font-size: 11px;
    font-weight: 700;
    color: ${ERP_COLORS.primaryBlueDark};
    text-transform: uppercase;
    letter-spacing: 0.4px;
    margin-bottom: 10px;
  }
  .kpi-grid {
    width: 100%;
    border-collapse: separate;
    border-spacing: 8px 0;
  }
  .kpi-grid td {
    border: 1px solid ${ERP_COLORS.border};
    border-radius: 8px;
    padding: 10px 8px;
    text-align: center;
    background: #ffffff;
  }
  .kpi-value {
    font-size: 18px;
    font-weight: 800;
    color: ${ERP_COLORS.ink};
  }
  .kpi-label {
    margin-top: 4px;
    font-size: 10px;
    color: ${ERP_COLORS.muted};
    font-weight: 600;
    text-transform: uppercase;
  }
  .kpi-total .kpi-value { color: ${ERP_COLORS.ink}; }
  .kpi-healthy .kpi-value { color: ${ERP_COLORS.success}; }
  .kpi-repairable .kpi-value { color: ${ERP_COLORS.warning}; }
  .kpi-beyond .kpi-value { color: ${ERP_COLORS.danger}; }
  .info-grid {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
  }
  .info-grid td {
    border: none;
    padding: 6px 8px 6px 0;
    font-size: 11px;
    vertical-align: top;
  }
  .info-label {
    color: ${ERP_COLORS.muted};
    font-weight: 700;
    text-transform: uppercase;
    font-size: 10px;
    width: 120px;
  }
  .info-value {
    color: ${ERP_COLORS.ink};
    font-weight: 600;
  }
  table.register {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
  }
  table.register th,
  table.register td {
    border: 1px solid ${ERP_COLORS.border};
    padding: 8px 6px;
    font-size: 10px;
    text-align: left;
  }
  table.register th {
    background: ${ERP_COLORS.primaryBlueSoft};
    color: ${ERP_COLORS.primaryBlueDark};
    font-weight: 700;
  }
  table.register tr:nth-child(even) td {
    background: #f8fafc;
  }
  table.register tr.totals-row td {
    background: ${ERP_COLORS.primaryBlueSoft};
    font-weight: 700;
    color: ${ERP_COLORS.primaryBlueDark};
  }
  .section-name {
    font-weight: 700;
    color: ${PRIMARY_BLUE};
  }
  .count-total { font-weight: 700; color: ${ERP_COLORS.ink}; }
  .count-healthy { font-weight: 700; color: ${ERP_COLORS.success}; }
  .count-repairable { font-weight: 700; color: ${ERP_COLORS.warning}; }
  .count-beyond { font-weight: 700; color: ${ERP_COLORS.danger}; }
  .status-badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 999px;
    font-size: 9px;
    font-weight: 700;
    border: 1px solid ${ERP_COLORS.border};
  }
  .status-healthy {
    color: ${ERP_COLORS.success};
    background: #ecfdf5;
    border-color: #bbf7d0;
  }
  .status-repairable {
    color: ${ERP_COLORS.warning};
    background: #fffbeb;
    border-color: #fde68a;
  }
  .status-beyond {
    color: ${ERP_COLORS.danger};
    background: #fef2f2;
    border-color: #fecaca;
  }
  .status-neutral {
    color: ${ERP_COLORS.muted};
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
`;

const buildDocumentShell = ({
  title,
  statusLabel,
  recordCount,
  heading,
  subtitle,
  table,
  summaryHtml = '',
}: {
  title: string;
  statusLabel: string;
  recordCount: number;
  heading: string;
  subtitle: string;
  table: string;
  summaryHtml?: string;
}) => {
  const generatedAt = new Date().toLocaleString();

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <style>${erpPdfStyles}</style>
      </head>
      <body>
        <div class="header">
          <div class="brand">Amrod ERP</div>
          <div class="subtitle">${escapeHtml(subtitle)}</div>
          <div class="meta">
            <span><strong>Report:</strong> ${escapeHtml(title)}</span>
            &nbsp;-&nbsp;
            <span><strong>Filter:</strong> ${escapeHtml(statusLabel)}</span>
            &nbsp;-&nbsp;
            <span><strong>Records:</strong> ${recordCount}</span>
            &nbsp;-&nbsp;
            <span><strong>Generated:</strong> ${escapeHtml(generatedAt)}</span>
          </div>
        </div>

        ${summaryHtml}

        <h2>${escapeHtml(heading)}</h2>
        ${table}

        <div class="footer">
          Amrod Digital Asset Tracking System - Administrative export - ${escapeHtml(generatedAt)}
        </div>
      </body>
    </html>
  `;
};

const statusBadgeClass = (status?: string | null) => {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'healthy') return 'status-healthy';
  if (normalized === 'repairable') return 'status-repairable';
  if (normalized === 'beyond repair') return 'status-beyond';
  return 'status-neutral';
};

const buildStatusBadge = (status?: string | null) =>
  `<span class="status-badge ${statusBadgeClass(status)}">${escapeHtml(status || '-')}</span>`;

const sumSectionTotals = (sections: SectionSummary[]) =>
  sections.reduce(
    (totals, section) => ({
      sections: totals.sections + 1,
      totalAssets: totals.totalAssets + (section.totalAssets || 0),
      healthyAssets: totals.healthyAssets + (section.healthyAssets || 0),
      repairableAssets: totals.repairableAssets + (section.repairableAssets || 0),
      beyondRepairAssets: totals.beyondRepairAssets + (section.beyondRepairAssets || 0),
    }),
    {
      sections: 0,
      totalAssets: 0,
      healthyAssets: 0,
      repairableAssets: 0,
      beyondRepairAssets: 0,
    },
  );

const buildKpiPanel = (title: string, items: { label: string; value: number | string; tone?: string }[]) => `
  <div class="panel">
    <div class="panel-title">${escapeHtml(title)}</div>
    <table class="kpi-grid"><tr>
      ${items
        .map(
          item => `
            <td class="kpi-${item.tone || 'total'}">
              <div class="kpi-value">${escapeHtml(item.value)}</div>
              <div class="kpi-label">${escapeHtml(item.label)}</div>
            </td>
          `,
        )
        .join('')}
    </tr></table>
  </div>
`;

const buildInfoPanel = (
  title: string,
  rows: { label: string; value: string }[],
) => `
  <div class="panel">
    <div class="panel-title">${escapeHtml(title)}</div>
    <table class="info-grid">
      ${rows
        .map(
          row => `
            <tr>
              <td class="info-label">${escapeHtml(row.label)}</td>
              <td class="info-value">${escapeHtml(row.value)}</td>
            </tr>
          `,
        )
        .join('')}
    </table>
  </div>
`;

const buildAssetRows = (assets: AssetRecord[]) =>
  assets
    .map(
      asset => `
        <tr>
          <td>${escapeHtml(getAssetDisplayName(asset))}</td>
          <td>${escapeHtml(asset.assetNumber)}</td>
          <td>${escapeHtml(asset.epc || asset.epcKey)}</td>
          <td>${escapeHtml(asset.section || asset.department || asset.category || asset.location)}</td>
          <td>${buildStatusBadge(asset.status)}</td>
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
      <table class="register">
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

const buildSectionRows = (sections: SectionSummary[]) =>
  sections
    .map(
      section => `
        <tr>
          <td class="section-name">${escapeHtml(section.section)}</td>
          <td>${escapeHtml(section.manager?.trim() || '-')}</td>
          <td>${escapeHtml(formatDate(section.createdAt))}</td>
          <td class="count-total">${escapeHtml(section.totalAssets)}</td>
          <td class="count-healthy">${escapeHtml(section.healthyAssets)}</td>
          <td class="count-repairable">${escapeHtml(section.repairableAssets)}</td>
          <td class="count-beyond">${escapeHtml(section.beyondRepairAssets)}</td>
        </tr>
      `,
    )
    .join('');

const buildSectionTotalsRow = (totals: ReturnType<typeof sumSectionTotals>) => `
  <tr class="totals-row">
    <td colspan="3">Portfolio Totals</td>
    <td class="count-total">${escapeHtml(totals.totalAssets)}</td>
    <td class="count-healthy">${escapeHtml(totals.healthyAssets)}</td>
    <td class="count-repairable">${escapeHtml(totals.repairableAssets)}</td>
    <td class="count-beyond">${escapeHtml(totals.beyondRepairAssets)}</td>
  </tr>
`;

const buildSectionDetailAssetRows = (assets: AssetRecord[]) =>
  assets
    .map(
      asset => `
        <tr>
          <td>${escapeHtml(getAssetDisplayName(asset))}</td>
          <td>${escapeHtml(asset.assetNumber)}</td>
          <td>${escapeHtml(asset.epc || asset.epcKey)}</td>
          <td>${buildStatusBadge(asset.status)}</td>
          <td>${escapeHtml(asset.serialNumber)}</td>
          <td>${escapeHtml(formatDate(asset.createdAt))}</td>
          <td>${escapeHtml(formatDate(asset.updatedAt))}</td>
        </tr>
      `,
    )
    .join('');

export const buildSectionsExportHtml = ({
  title,
  statusLabel,
  sections,
}: SectionsPdfExportOptions) => {
  const totals = sumSectionTotals(sections);

  return buildDocumentShell({
    title,
    statusLabel,
    recordCount: sections.length,
    heading: 'Organizational Sections Register',
    subtitle: 'EmbroideryTech - Government Asset Register Export',
    summaryHtml: buildKpiPanel('Portfolio Overview', [
      { label: 'Sections', value: totals.sections, tone: 'total' },
      { label: 'Total Assets', value: totals.totalAssets, tone: 'total' },
      { label: 'Healthy', value: totals.healthyAssets, tone: 'healthy' },
      { label: 'Repairable', value: totals.repairableAssets, tone: 'repairable' },
      { label: 'Beyond Repair', value: totals.beyondRepairAssets, tone: 'beyond' },
    ]),
    table: `
      <table class="register">
        <thead>
          <tr>
            <th>Section</th>
            <th>Section Manager</th>
            <th>Created</th>
            <th>Total Assets</th>
            <th>Healthy</th>
            <th>Repairable</th>
            <th>Beyond Repair</th>
          </tr>
        </thead>
        <tbody>
          ${buildSectionRows(sections) || '<tr><td colspan="7">No sections included.</td></tr>'}
          ${sections.length > 0 ? buildSectionTotalsRow(totals) : ''}
        </tbody>
      </table>
    `,
  });
};

export const buildSectionDetailExportHtml = ({
  title,
  sectionName,
  summary,
  assets,
}: SectionDetailPdfExportOptions) =>
  buildDocumentShell({
    title,
    statusLabel: sectionName,
    recordCount: assets.length,
    heading: 'Section Asset Register',
    subtitle: 'EmbroideryTech - Government Asset Register Export',
    summaryHtml: `
      ${buildInfoPanel('Section Profile', [
        { label: 'Section', value: sectionName },
        { label: 'Section Manager', value: summary.manager?.trim() || '-' },
        { label: 'Created', value: formatDate(summary.createdAt) },
      ])}
      ${buildKpiPanel('Section Status Overview', [
        { label: 'Total Assets', value: summary.totalAssets, tone: 'total' },
        { label: 'Healthy', value: summary.healthyAssets, tone: 'healthy' },
        { label: 'Repairable', value: summary.repairableAssets, tone: 'repairable' },
        { label: 'Beyond Repair', value: summary.beyondRepairAssets, tone: 'beyond' },
      ])}
    `,
    table: `
      <table class="register">
        <thead>
          <tr>
            <th>Asset Name</th>
            <th>Asset No</th>
            <th>RFID Tag (EPC)</th>
            <th>Status</th>
            <th>Serial No</th>
            <th>Created</th>
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          ${buildSectionDetailAssetRows(assets) || '<tr><td colspan="7">No assets assigned to this section.</td></tr>'}
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
      <table class="register">
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

export const exportSectionsToPdf = async (options: SectionsPdfExportOptions) =>
  sharePdf(
    buildSectionsExportHtml(options),
    `${options.title} - ${options.statusLabel}`,
  );

export const exportSectionDetailToPdf = async (options: SectionDetailPdfExportOptions) =>
  sharePdf(
    buildSectionDetailExportHtml(options),
    `${options.title} - ${options.sectionName}`,
  );
