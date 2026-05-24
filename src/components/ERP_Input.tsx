/**
 * Reusable Input Component with Global Sizing
 */
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { UI_SIZES, TYPOGRAPHY, UI_SPACING } from '../theme/uiConstants';
import { PRIMARY_BLUE, ERP_COLORS } from '../theme/erpTheme';

interface ERP_InputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  helperText?: string;
  errorText?: string;
  containerStyle?: ViewStyle;
  disabled?: boolean;
}

export default function ERP_Input({
  label,
  helperText,
  errorText,
  containerStyle,
  disabled = false,
  ...inputProps
}: ERP_InputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const styles = StyleSheet.create({
    container: {
      marginBottom: UI_SPACING.md,
      ...containerStyle,
    } as ViewStyle,
    label: {
      fontSize: TYPOGRAPHY.LABEL_SIZE,
      fontWeight: TYPOGRAPHY.LABEL_WEIGHT as any,
      color: ERP_COLORS.ink,
      marginBottom: UI_SPACING.sm,
    } as TextStyle,
    inputWrapper: {
      borderRadius: UI_SIZES.BORDER_RADIUS_SM,
      borderWidth: 1,
      borderColor: isFocused ? PRIMARY_BLUE : ERP_COLORS.border,
      backgroundColor: disabled ? '#f1f5f9' : ERP_COLORS.surface,
      paddingHorizontal: UI_SIZES.INPUT_PADDING_H,
      height: UI_SIZES.INPUT_HEIGHT,
      justifyContent: 'center',
    } as ViewStyle,
    input: {
      fontSize: TYPOGRAPHY.INPUT_SIZE,
      fontWeight: TYPOGRAPHY.INPUT_WEIGHT as any,
      color: ERP_COLORS.ink,
      padding: 0,
      margin: 0,
    } as TextStyle,
    helperText: {
      marginTop: UI_SPACING.sm,
      fontSize: TYPOGRAPHY.LABEL_SIZE,
      color: ERP_COLORS.muted,
    } as TextStyle,
    errorText: {
      marginTop: UI_SPACING.sm,
      fontSize: TYPOGRAPHY.LABEL_SIZE,
      color: ERP_COLORS.danger,
    } as TextStyle,
  });

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View style={styles.inputWrapper}>
        <TextInput
          {...inputProps}
          style={styles.input}
          editable={!disabled}
          onFocus={(e) => {
            setIsFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            inputProps.onBlur?.(e);
          }}
          placeholderTextColor="#94a3b8"
        />
      </View>

      {errorText ? (
        <Text style={styles.errorText}>{errorText}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}
