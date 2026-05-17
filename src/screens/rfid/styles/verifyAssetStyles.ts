import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f6fb', // ERP neutral background
    marginTop: 25,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },

  /* ================= HEADER ================= */
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 6,
  },

  headerBackButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },

  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },

  screenSubtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },

  /* ================= TOP STATUS BAR ================= */
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 12,
  },

  statusCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginRight: 10,
  },

  statusValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },

  statusLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },

  startToggleButton: {
    width: 110,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
  },

  startToggleText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  /* ================= KPI CARDS ================= */
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 6,
  },

  summaryCard: {
    width: '48%',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 10,
  },

  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },

  summaryLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },

  /* ================= LOCATION ================= */
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 6,
  },

  locationInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
  },

  /* ================= SCAN INPUT ================= */
  scanInputContainer: {
    marginTop: 14,
  },

  epcInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: '#111827',
    minHeight: 46,

    // expands feel when scanning active (UI support only)
    flexGrow: 1,
  },

  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },

  scanButton: {
    minWidth: 90,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },

  scanButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },

  /* ================= TAG DISPLAY AREA ================= */
  tagDisplayBox: {
    marginTop: 14,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 14,

    minHeight: 80,
  },

  tagDisplayText: {
    fontSize: 13,
    color: '#111827',
  },

  /* ================= BOTTOM ACTIONS ================= */
  bottomActionContainer: {
    flexDirection: 'row',
    marginTop: 18,
    marginBottom: 6,
  },

  startAuditButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#6366f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  verifyButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  startAuditText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },

  verifyText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },

  /* ================= EMPTY STATE (clean ERP style) ================= */
  emptyStateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 18,
    alignItems: 'center',
    marginTop: 16,
  },

  emptyStateTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },

  emptyStateDescription: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
    textAlign: 'center',
  },

  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
    marginTop: 12,
  },

  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  infoDescription: {
    fontSize: 13,
    color: '#475569',
    marginTop: 8,
    lineHeight: 19,
  },

  auditResultContainer: {
    marginTop: 18,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 16,
  },
  auditResultTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  auditOverviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  auditOverviewCard: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  auditOverviewValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  auditOverviewLabel: {
    marginTop: 6,
    fontSize: 12,
    color: '#6b7280',
  },
  auditSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  auditSummaryText: {
    flex: 1,
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  auditListCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 14,
    marginBottom: 10,
  },
  auditListTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  auditListItem: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 6,
  },
  auditListEmpty: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
  },
});

export default styles;