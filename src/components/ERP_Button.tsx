/**
 * Reusable Button Component with Global Sizing
 */
import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { UI_SIZES, TYPOGRAPHY, UI_SPACING } from '../theme/uiConstants';
import { PRIMARY_BLUE, ERP_COLORS } from '../theme/erpTheme';

export type ButtonSize = 'small' | 'compact' | 'normal';
export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ERP_ButtonProps extends Omit<TouchableOpacityProps, 'style'> {
  label: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
}

const getButtonHeight = (size: ButtonSize): number => {
  if (size === 'small') return UI_SIZES.BUTTON_HEIGHT_SMALL;
  if (size === 'compact') return UI_SIZES.BUTTON_HEIGHT_COMPACT;
  return UI_SIZES.BUTTON_HEIGHT;
};

const getButtonStyles = (variant: ButtonVariant) => {
  const baseStyle = {
    backgroundColor: PRIMARY_BLUE,
    borderColor: 'transparent',
  };

  if (variant === 'secondary') {
    return {
      ...baseStyle,
      backgroundColor: '#e2e8f0',
      borderColor: '#cbd5e1',
    };
  }

  if (variant === 'danger') {
    return {
      ...baseStyle,
      backgroundColor: ERP_COLORS.danger,
    };
  }

  if (variant === 'ghost') {
    return {
      ...baseStyle,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: PRIMARY_BLUE,
    };
  }

  return baseStyle;
};

const getTextColor = (variant: ButtonVariant): string => {
  if (variant === 'secondary' || variant === 'ghost') {
    return ERP_COLORS.ink;
  }
  return '#ffffff';
};

export default function ERP_Button({
  label,
  size = 'normal',
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  ...props
}: ERP_ButtonProps) {
  const height = getButtonHeight(size);
  const buttonStyles = getButtonStyles(variant);
  const textColor = getTextColor(variant);

  const styles = StyleSheet.create({
    button: {
      height,
      borderRadius: UI_SIZES.BORDER_RADIUS,
      paddingHorizontal: UI_SIZES.BUTTON_PADDING_H,
      justifyContent: 'center',
      alignItems: 'center',
      flexDirection: 'row',
      gap: UI_SPACING.sm,
      opacity: disabled ? 0.6 : 1,
      ...buttonStyles,
    } as ViewStyle,
    text: {
      fontSize: TYPOGRAPHY.BUTTON_SIZE,
      fontWeight: TYPOGRAPHY.BUTTON_WEIGHT as any,
      color: textColor,
    } as TextStyle,
  });

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      disabled={disabled || loading}
      activeOpacity={0.8}
      {...props}
    >
      {icon}
      <Text style={styles.text} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
