import { StyleSheet } from 'react-native';

import { ERP_COLORS, PRIMARY_BLUE } from './erpTheme';

/** Standard ERP text field — matches LocateAsset search input. */
export const ERP_FORM = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: ERP_COLORS.ink,
  },
  inputFocused: {
    borderColor: PRIMARY_BLUE,
  },
  helperText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
