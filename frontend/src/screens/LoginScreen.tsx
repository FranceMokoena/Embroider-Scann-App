// src/screens/LoginScreen.tsx

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const colorPalette = {
  primary: '#6C63FF',
  background: '#F9F9FF',
  muted: '#A1A1B5',
  light: '#FFFFFF',
};

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Toast.show({ type: 'error', text1: 'Enter both username & password' });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('https://YOUR_VERCEL_URL/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (res.ok) {
        await AsyncStorage.setItem('token', data.token);
        Toast.show({ type: 'success', text1: 'Welcome Back!' });
        navigation.replace('Home', { token: data.token });
      } else {
        Toast.show({ type: 'error', text1: data.error || 'Login failed' });
      }
    } catch {
      Toast.show({ type: 'error', text1: 'Network error' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Ionicons name="construct" size={60} color={colorPalette.primary} />
            <Text style={styles.title}>Embroidery Tech Hub</Text>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter username"
              autoCapitalize="none"
              onChangeText={setUsername}
              value={username}
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter password"
              secureTextEntry
              onChangeText={setPassword}
              value={password}
            />

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading
                ? <ActivityIndicator color={colorPalette.light} />
                : <Text style={styles.buttonText}>Sign In</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.registerLink}
              onPress={() => navigation.navigate('Register')}
            >
              <Text style={styles.registerText}>
                Don't have an account? <Text style={styles.registerTextBold}>Register</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colorPalette.background },
  keyboardView: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 8 },
  formContainer: { backgroundColor: colorPalette.light, borderRadius: 12, padding: 24 },
  label: { marginTop: 12, marginBottom: 4, color: colorPalette.muted },
  input: {
    borderWidth: 1, borderColor: '#e9ecef',
    borderRadius: 8, padding: 12, backgroundColor: '#fff'
  },
  button: {
    backgroundColor: colorPalette.primary,
    padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24
  },
  buttonDisabled: { backgroundColor: colorPalette.muted },
  buttonText: { color: colorPalette.light, fontSize: 16, fontWeight: 'bold' },
  registerLink: { marginTop: 16, alignItems: 'center' },
  registerText: { color: colorPalette.muted },
  registerTextBold: { color: colorPalette.primary, fontWeight: 'bold' },
});
