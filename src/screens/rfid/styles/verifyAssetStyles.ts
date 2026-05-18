import { StyleSheet } from 'react-native';
import { PRIMARY_BLUE } from '../../../theme/erpTheme';

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
    backgroundColor: PRIMARY_BLUE,
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
    backgroundColor: PRIMARY_BLUE,
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
    backgroundColor: PRIMARY_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },

  verifyButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: PRIMARY_BLUE,
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

  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  dropdownButtonText: {
    flex: 1,
    marginRight: 8,
    color: '#111827',
    fontSize: 14,
  },
  dropdownList: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    maxHeight: 260,
  },
  dropdownSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8fafc',
  },
  dropdownSearchInput: {
    flex: 1,
    marginLeft: 8,
    paddingVertical: 10,
    color: '#111827',
    fontSize: 13,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  dropdownItemText: {
    color: '#111827',
    fontSize: 14,
  },
  dropdownEmptyText: {
    color: '#6b7280',
    fontSize: 13,
    padding: 16,
  },
  manualActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  addChipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
  },
  addChipText: {
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '700',
    color: PRIMARY_BLUE,
  },
  clearLinkText: {
    color: PRIMARY_BLUE,
    fontSize: 13,
    fontWeight: '600',
  },
  tagHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  tagDisplayTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  tagCountText: {
    fontSize: 12,
    color: PRIMARY_BLUE,
    fontWeight: '700',
  },
  tagCountBadge: {
    borderRadius: 999,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagScrollBox: {
    maxHeight: 118,
  },
  tagChipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 2,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 10,
    marginBottom: 10,
    borderRadius: 14,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    minWidth: 128,
    maxWidth: 260,
  },
  tagChipText: {
    color: '#111827',
    fontSize: 13,
    flex: 1,
  },
  tagRemoveButton: {
    marginLeft: 10,
  },
  tableWrap: {
    marginTop: 18,
  },
  table: {
    minWidth: 924,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dbe2ea',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#edf2f7',
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
  },
  tableCell: {
    width: 132,
    paddingVertical: 10,
    paddingHorizontal: 8,
    color: '#111827',
    fontSize: 11,
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    overflow: 'hidden',
  },
  tableHeaderCell: {
    fontWeight: '700',
    color: '#0f172a',
    fontSize: 11,
    backgroundColor: '#f8fafc',
  },
  statusBadge: {
    marginTop: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignSelf: 'flex-start',
  },
  statusBadgePositive: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeWarning: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeDanger: {
    backgroundColor: '#fee2e2',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusTextPositive: {
    color: '#166534',
  },
  statusTextWarning: {
    color: '#92400e',
  },
  statusTextDanger: {
    color: '#991b1b',
  },
  tableRowAlternate: {
    backgroundColor: '#f8fafc',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
  },
  modalIconCircle: {
    width: 92,
    height: 92,
    borderRadius: 46,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  modalIconCircleSuccess: {
    backgroundColor: '#dcfce7',
  },
  modalIconCircleFailure: {
    backgroundColor: '#fee2e2',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  modalStatRow: {
    width: '100%',
    marginTop: 12,
  },
  modalStatItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalStatLabel: {
    color: '#64748b',
    fontSize: 12,
  },
  modalStatValue: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '700',
  },
  modalCloseButton: {
    marginTop: 18,
    width: '100%',
    height: 52,
    borderRadius: 14,
    backgroundColor: PRIMARY_BLUE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default styles;
