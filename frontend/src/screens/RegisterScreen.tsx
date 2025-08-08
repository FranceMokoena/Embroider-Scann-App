// src/screens/RegisterScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const colorPalette = {
  primary: '#6C63FF',
  background: '#F9F9FF',
  muted: '#A1A1B5',
  light: '#FFFFFF',
  dark: '#1E1E2D'
};

export default function RegisterScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username.trim() || !password.trim() || !department.trim()) {
      Alert.alert('Missing Info', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('https://YOUR_VERCEL_URL/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim().toLowerCase(),
          password,
          department: department.trim()
        }),
      });
      const data = await res.json();

      if (res.ok) {
        // Optionally auto-login:
        if (data.token) {
          await AsyncStorage.setItem('token', data.token);
        }
        Alert.alert('Success', 'Account created!', [
          { text: 'OK', onPress: () => navigation.replace('Login') }
        ]);
      } else {
        Alert.alert('Registration Failed', data.error || 'Unknown error');
      }
    } catch {
      Alert.alert('Network Error', 'Please check your connection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="person-add" size={60} color={colorPalette.primary} />
            </View>
            <Text style={styles.appTitle}>Embroidery Tech Hub</Text>
            <Text style={styles.appSubtitle}>Create your account</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.registerTitle}>Create Account</Text>

            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={colorPalette.muted} />
              <TextInput
                style={styles.input}
                placeholder="Username *"
                placeholderTextColor="#999"
                autoCapitalize="none"
                onChangeText={setUsername}
                value={username}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="business-outline" size={20} color={colorPalette.muted} />
              <TextInput
                style={styles.input}
                placeholder="Department *"
                placeholderTextColor="#999"
                onChangeText={setDepartment}
                value={department}
                editable={!loading}
              />
            </View>

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colorPalette.muted} />
              <TextInput
                style={styles.input}
                placeholder="Password *"
                placeholderTextColor="#999"
                secureTextEntry={!showPassword}
                onChangeText={setPassword}
                value={password}
                editable={!loading}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={colorPalette.muted}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.registerButton, loading && styles.registerButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colorPalette.light} />
              ) : (
                <Text style={styles.registerButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.loginLink}
              onPress={() => navigation.navigate('Login')}
              disabled={loading}
            >
              <Text style={styles.loginText}>
                Already have an account?{' '}
                <Text style={styles.loginTextBold}>Sign in here</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colorPalette.background },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logoCircle: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: colorPalette.light, justifyContent: 'center', alignItems: 'center'
  },
  appTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  appSubtitle: { fontSize: 16, color: colorPalette.muted },
  formContainer: {
    backgroundColor: colorPalette.light, borderRadius: 20,
    padding: 24, elevation: 4
  },
  registerTitle: { fontSize: 24, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colorPalette.background,
    borderRadius: 12, marginBottom: 16,
    paddingHorizontal: 16, borderWidth: 1, borderColor: '#e9ecef'
  },
  input: { flex: 1, paddingVertical: 12 },
  registerButton: {
    backgroundColor: colorPalette.primary,
    borderRadius: 12, paddingVertical: 16, alignItems: 'center'
  },
  registerButtonDisabled: { backgroundColor: colorPalette.muted },
  registerButtonText: { color: colorPalette.light, fontSize: 16, fontWeight: 'bold' },
  loginLink: { marginTop: 16, alignItems: 'center' },
  loginText: { color: colorPalette.muted },
  loginTextBold: { color: colorPalette.primary, fontWeight: 'bold' },
});
