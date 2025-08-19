import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  ScrollView,
  Alert,
  Animated,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const BACKEND_URL = 'https://embroider-scann-app.onrender.com';

export default function RegisterScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [department, setDepartment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsVisible, setTermsVisible] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

  // Add version logging for update verification
  console.log('📝 RegisterScreen Version: 1.0.1 - Added warning message about screen removal');

  useEffect(() => {
    // Start animations when component mounts
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Keyboard listeners
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {});
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {});

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const validateForm = () => {
    if (!username.trim()) {
      Toast.show({ 
        type: 'error', 
        text1: 'Validation Error', 
        text2: 'Username is required' 
      });
      return false;
    }

    if (username.trim().length < 3) {
      Toast.show({ 
        type: 'error', 
        text1: 'Validation Error', 
        text2: 'Username must be at least 3 characters' 
      });
      return false;
    }

    if (!email.trim()) {
      Toast.show({ 
        type: 'error', 
        text1: 'Validation Error', 
        text2: 'Email is required' 
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Toast.show({ 
        type: 'error', 
        text1: 'Validation Error', 
        text2: 'Please enter a valid email address' 
      });
      return false;
    }

    if (!password) {
      Toast.show({ 
        type: 'error', 
        text1: 'Validation Error', 
        text2: 'Password is required' 
      });
      return false;
    }

    if (password.length < 6) {
      Toast.show({ 
        type: 'error', 
        text1: 'Validation Error', 
        text2: 'Password must be at least 6 characters' 
      });
      return false;
    }

    if (password !== confirmPassword) {
      Toast.show({ 
        type: 'error', 
        text1: 'Validation Error', 
        text2: 'Passwords do not match' 
      });
      return false;
    }

    if (!department.trim()) {
      Toast.show({ 
        type: 'error', 
        text1: 'Validation Error', 
        text2: 'Department is required' 
      });
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    console.log('🔄 Registration attempt started');
    console.log('Username:', username);
    console.log('Email:', email);
    console.log('Department:', department);
    
    setIsLoading(true);

    try {
      console.log('🌐 Making fetch request to:', `${BACKEND_URL}/api/auth/register`);
      
      const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim(), 
          email: email.trim(),
          password,
          department: department.trim()
        }),
      });

      console.log('📡 Response received:', res.status, res.statusText);

      const contentType = res.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        console.log('✅ Parsing JSON response');
        data = await res.json();
        console.log('📦 Parsed data:', data);
      } else {
        console.log('❌ Non-JSON response detected');
        const text = await res.text();
        console.log('Non-JSON response:', text);
        data = { error: 'Server returned non-JSON response' };
      }

      if (res.ok) {
        console.log('✅ Registration successful');
        Toast.show({ 
          type: 'success', 
          text1: 'Registration Successful!', 
          text2: 'Your account has been created. Please sign in.' 
        });
        
        // Clear form
        setUsername('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setDepartment('');
        
        // Navigate back to login
        setTimeout(() => {
          navigation.navigate('Login');
        }, 1500);
      } else {
        console.log('❌ Registration failed:', data.error);
        const errorMessage = data.error || `Registration failed (${res.status})`;
        Toast.show({ 
          type: 'error', 
          text1: 'Registration Failed', 
          text2: errorMessage 
        });
      }
    } catch (error) {
      console.error('💥 Registration error:', error);
      Toast.show({ 
        type: 'error', 
        text1: 'Connection Error', 
        text2: 'Please check your internet connection and try again' 
      });
    } finally {
      console.log('🏁 Setting loading to false');
      setIsLoading(false);
    }
  };

  const handleTermsPress = () => {
  setTermsVisible(true);
  
};

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={true}
        >
          <Animated.View 
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* Header */}
            <Animated.View
              style={[
                styles.header,
                { transform: [{ scale: logoScale }] }
              ]}
            >
              <View style={styles.logoContainer}>
                <View style={styles.logoIconContainer}>
                  <Ionicons name="scan-circle" size={48} color="#6366f1" />
                </View>
                <Text style={styles.logoText}>Embroidery-Tech</Text>
                <Text style={styles.logoSubtitle}>Professional Screen Management</Text>
              </View>
            </Animated.View>

            {/* Enhanced Form Container */}
            <View style={styles.formContainer}>
              {/* Warning Message */}
              <View style={styles.warningContainer}>
                <Ionicons name="warning" size={24} color="#f59e0b" style={styles.warningIcon} />
                <View style={styles.warningContent}>
                  <Text style={styles.warningTitle}>⚠️ Important Notice</Text>
                  <Text style={styles.warningText}>
                    This registration screen will be removed soon by the administrator. 
                    If you lose your credentials, please contact the admin or IT support immediately.
                  </Text>
                </View>
              </View>

              <View style={styles.formHeader}>
                <Ionicons name="log-in-outline" size={32} color="#6366f1" />
                <Text style={styles.formTitle}>Create Account</Text>
                <Text style={styles.formSubtitle}>Sign up to your account to continue</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Username</Text>
                <View style={[styles.inputContainer, username.trim() ? styles.inputFocused : null]}>
                  <Ionicons name="person-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your username"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    onChangeText={setUsername}
                    value={username}
                    autoCorrect={true}
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <View style={[styles.inputContainer, email.trim() ? styles.inputFocused : null]}>
                  <Ionicons name="mail-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="none"
                    onChangeText={setEmail}
                    value={email}
                    autoCorrect={true}
                    returnKeyType="next"
                    blurOnSubmit={false}
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Department</Text>
                <View style={[styles.inputContainer, department.trim() ? styles.inputFocused : null]}>
                  <Ionicons name="business-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your department"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="words"
                    onChangeText={setDepartment}
                    value={department}
                    autoCorrect={false}
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View style={[styles.inputContainer, password ? styles.inputFocused : null]}>
                  <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    onChangeText={setPassword}
                    value={password}
                    autoCorrect={false}
                    returnKeyType="next"
                    blurOnSubmit={false}
                  />
                  <TouchableOpacity 
                    style={styles.passwordToggle}
                    onPress={() => setShowPassword(!showPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#64748b" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={[styles.inputContainer, confirmPassword ? styles.inputFocused : null]}>
                  <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your password"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showConfirmPassword}
                    onChangeText={setConfirmPassword}
                    value={confirmPassword}
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleRegister}
                  />
                  <TouchableOpacity 
                    style={styles.passwordToggle}
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons 
                      name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                      size={20} 
                      color="#64748b" 
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.registerButton, isLoading && styles.buttonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.loadingText}>Creating Account...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons name="person-add" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Create Account</Text>
                  </View>
                )}
              </TouchableOpacity>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Register link */}
                           <View style={styles.registerRow}>
                             <Text style={styles.loginButtonText}>Already have an account? </Text>
                             <Text
                               style={styles.loginButtonContent}
                               onPress={() => navigation.navigate('Login')}
                               suppressHighlighting
                             >
                               Sign in
                             </Text>
                           </View>

             
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}































const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    minHeight: height * 0.8,
  },
  headerContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 40,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 8,
    letterSpacing: -1,
  },
  logoSubtitle: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.08,
    shadowRadius: 25,
    elevation: 10,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 12,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputFocused: {
    borderColor: '#6366f1',
    backgroundColor: '#fefefe',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
    paddingVertical: 16,
    fontWeight: '500',
  },
  passwordToggle: {
    padding: 8,
    borderRadius: 8,
  },
  registerButton: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 10,
    marginBottom: 10,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  buttonDisabled: {
    backgroundColor: '#94a3b8',
    shadowOpacity: 0.1,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: '#94a3b8',
    fontWeight: '500',
  },
  loginButton: {
    color: '#6366f1',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 24,
    backgroundColor: '#fff',
  },
  loginButtonContent: {
    color: '#6366f1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButtonText: {
    color: '#6366f1',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 3,
    paddingVertical: 0,
  },
  registerPrompt: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '400',
  },
  registerLink: {
    fontSize: 15,
    color: '#6366f1',
    fontWeight: '600',
    marginLeft: 4,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  warningIcon: {
    marginRight: 12,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },










  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: {
    color: '#6366f1',
    fontWeight: '600',
  },
});