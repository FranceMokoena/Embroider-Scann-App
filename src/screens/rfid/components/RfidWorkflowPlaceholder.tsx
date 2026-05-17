import React from 'react';
import { SafeAreaView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import styles from '../styles/addAssetStyles';

interface RfidWorkflowPlaceholderProps {
  iconName: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  navigation: any;
}

export default function RfidWorkflowPlaceholder({
  iconName,
  title,
  description,
  navigation,
}: RfidWorkflowPlaceholderProps) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View style={styles.screenHeader}>
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerTextWrap}>
          <Text style={styles.screenTitle}>{title}</Text>
          <Text style={styles.screenSubtitle}>RFID workflow placeholder</Text>
        </View>
      </View>

      <View style={styles.placeholderCard}>
        <View style={styles.placeholderIconWrap}>
          <Ionicons name={iconName} size={30} color="#0f766e" />
        </View>
        <Text style={styles.placeholderTitle}>{title}</Text>
        <Text style={styles.placeholderDescription}>{description}</Text>
      </View>
    </SafeAreaView>
  );
}
