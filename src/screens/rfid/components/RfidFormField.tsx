import React from 'react';
import { Text, TextInput, TextInputProps, View } from 'react-native';

import { ERP_FORM } from '../../../theme/erpFormStyles';
import styles from '../styles/addAssetStyles';

interface RfidFormFieldProps extends TextInputProps {
  label: string;
  helperText?: string;
}

export default function RfidFormField({
  label,
  helperText,
  ...inputProps
}: RfidFormFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...inputProps}
        style={[ERP_FORM.input, styles.textInput]}
        placeholderTextColor="#94a3b8"
      />
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
    </View>
  );
}
