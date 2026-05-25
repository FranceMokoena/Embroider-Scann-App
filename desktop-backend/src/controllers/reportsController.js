
const legacyReportUnavailable = (req, res) => res.status(501).json({
  success: false,
  error: 'Legacy desktop report generation is not configured in this build.',
  migrationPath: '/api/assets/reports/:type',
});

export const generateCsvReport = legacyReportUnavailable;
export const generateExcelReport = legacyReportUnavailable;
export const generatePdfReport = legacyReportUnavailable;
