import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import styles from '../styles/addAssetStyles';

interface RfidSelectFieldProps {
  label: string;
  placeholder: string;
  value?: string;
  onPress: () => void;
}

export default function RfidSelectField({
  label,
  placeholder,
  value,
  onPress,
}: RfidSelectFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.selectField}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={value ? styles.selectValue : styles.selectPlaceholder}>
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color="#64748b" />
      </TouchableOpacity>
    </View>
  );
}
