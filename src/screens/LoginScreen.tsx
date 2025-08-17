import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
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
import { SafeAreaView } from 'react-native-safe-area-context';  


const { height } = Dimensions.get('window');

const BACKEND_URL = 'https://embroider-scann-app.onrender.com';

export default function LoginScreen({ navigation }: any) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const passwordRef = useRef(null);
 const [termsVisible, setTermsVisible] = useState(false);
 const [ForgotPassVisible,setForgotPassVisible] =useState(false);

  

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;

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
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please enter both username and password'
      });
      return;
    }

    if (password.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Password Too Short',
        text2: 'Password must be at least 6 characters'
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const contentType = res.headers.get('content-type');
      let data: any;

      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        data = { error: text || 'Server returned non-JSON response' };
      }

      if (res.ok) {
        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('user', JSON.stringify(data.user || { username }));

        Toast.show({
          type: 'success',
          text1: 'Welcome Back!',
          text2: 'Successfully signed in'
        });
console.log("🚀 LoginScreen UPDATED VERSION is running!");

        navigation.replace('Home', { token: data.token });
      } else {
        const errorMessage = data.error || `Login failed (${res.status})`;
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: errorMessage
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Connection Error',
        text2: 'Please check your internet connection and try again'
        
      });
      console.log("🚀 LoginScreen UPDATED VERSION is running!");

    } finally {
      setIsLoading(false);
    }
  };



  const handleForgotPassword = () => {
    setForgotPassVisible(true);
    console.log("🚀 LoginScreen UPDATED VERSION is running!");

  };

  const handleTermsPress = () => {//const [termsVisible, setTermsVisible] = useState(false);
  setTermsVisible(true);
  console.log("🚀 LoginScreen UPDATED VERSION is running!");
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
                <Text style={styles.logoText}>Embroidery-Tech</Text>
                <Text style={styles.logoSubtitle}>Professional Screen Management</Text>
              </View>
            </Animated.View>

            {/* Form */}
            <View style={styles.formContainer}>
                             <View style={styles.formHeader}>
                 <Text style={styles.lockEmoji}>🔒</Text>
                 
                 
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
                     autoCorrect={false}
                     returnKeyType="done"
                     blurOnSubmit={true}
                   />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                                 <View style={[styles.inputContainer, password.trim() ? styles.inputFocused : null]}>
                  <Ionicons name="lock-closed-outline" size={20} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    ref={passwordRef}
  style={styles.input}
  placeholder="Enter your password"
  placeholderTextColor="#94a3b8"
  secureTextEntry={!showPassword}
  onChangeText={setPassword}
  value={password}
  autoCorrect={false}
  autoCapitalize="none"
  returnKeyType="done"
  onSubmitEditing={handleLogin}
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

              {/* Forgot Password */}
              <TouchableOpacity
                style={styles.forgotPassword}
                onPress={handleForgotPassword}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Sign In */}
              <TouchableOpacity
                style={[styles.loginButton, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text style={styles.loadingText}>Signing In...</Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Ionicons name="log-in" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Sign In</Text>
                  </View>
                )}
              </TouchableOpacity>


<Modal
  visible={termsVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setTermsVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>Terms of Service</Text>
      <Text style={styles.modalMessage}>
        By using this application, you agree to our Terms of Service and Privacy Policy.
      </Text>
      <TouchableOpacity style={styles.modalButton} onPress={() => setTermsVisible(false)}>
        <Text style={styles.modalButtonText}>OK</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>


<Modal
  visible={ForgotPassVisible}
  transparent
  animationType="fade"
  onRequestClose={() => setForgotPassVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>❌ Forgot Password!</Text>
      <Text style={styles.modalMessage}>
        Please Contact Your Administrator to request a new password or enter correct crenditials
      </Text>
      <TouchableOpacity style={styles.modalButton} onPress={() => setForgotPassVisible(false)}>
        <Text style={styles.modalButtonText}>OK</Text>
      </TouchableOpacity>
    </View>
  </View>
</Modal>




              {/* Register link */}
              <View style={styles.registerRow}>
                <Text style={styles.registerPrompt}>Don't have an account? </Text>
                <Text
                  style={styles.registerLink}
                  onPress={() => navigation.navigate('Register')}
                  suppressHighlighting
                >
                  Sign up
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
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},
modalContent: {
  width: '80%',
  backgroundColor: '#fff',
  borderRadius: 16,
  padding: 24,
  elevation: 10,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.25,
  shadowRadius: 4,
},
modalTitle: {
  fontSize: 22,
  fontWeight: '700',
  color: '#1e293b',
  marginBottom: 12,
  textAlign: 'center',
},
modalMessage: {
  fontSize: 16,
  color: '#475569',
  marginBottom: 24,
  lineHeight: 22,
  textAlign: 'center',
},
modalButton: {
  backgroundColor: '#6366f1',
  borderRadius: 12,
  paddingVertical: 12,
  alignItems: 'center',
},
modalButtonText: {
  color: '#fff',
  fontSize: 16,
  fontWeight: '600',
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
  header: {
    alignItems: 'center',
    marginBottom: 40,
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
    shadowOffset: { width: 0, height: 0},
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  logoText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#1e293b',
    marginBottom: 1,
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
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 30,
    shadowRadius: 30,
    elevation: 10,
  },
     formHeader: {
     alignItems: 'center',
     marginBottom: 4,
   },
   lockEmoji: {
     fontSize: 50,
     marginBottom: 3,
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
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    
  },
  inputFocused: {
    borderColor: '#6366f1',
    backgroundColor: '#fefefe',
    shadowColor: '#6366f1',
   
   
    shadowRadius: 22,
    elevation: 9,
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 5,
  },
  forgotPasswordText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '300',
  },
  loginButton: {
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
  // Register link row
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
