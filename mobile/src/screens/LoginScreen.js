import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  Image,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { loginUser } from '../api/aws';
import { ensureSupabaseUserId } from '../api/supabaseApi';

export default function LoginScreen({ navigation, onLogin }) {
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    loadSavedCredentials();
  }, []);

  const loadSavedCredentials = async () => {
    try {
      const saved = await AsyncStorage.getItem('rememberedCredentials');
      if (saved) {
        const { email, password } = JSON.parse(saved);
        setCredentials({ email, password });
        setRememberMe(true);
        
        // Auto-login if Remember Me was previously enabled
        await performAutoLogin(email, password);
      }
    } catch (error) {
      console.error('Failed to load saved credentials:', error);
    }
  };

  const performAutoLogin = async (email, password) => {
    try {
      setLoading(true);
      
      // Get unique device identifier (with fallback)
      let deviceId = null;
      try {
        deviceId = await Device.getDeviceIdAsync();
        console.log('[Auto-Login] Device ID:', deviceId);
      } catch (deviceError) {
        console.warn('[Auto-Login] Failed to get device ID:', deviceError);
      }
      
      const result = await loginUser({ email, password, deviceId });
      if (result.success) {
        // Fetch Supabase user UUID and attach to user object
        const supabaseUserId = await ensureSupabaseUserId(result.user);
        const userWithSupabaseId = {
          ...result.user,
          supabaseUserId,
        };
        console.log('[Auto-Login] Success, navigating to Home');
        
        // Store user session
        if (onLogin) {
          await onLogin(userWithSupabaseId);
        }
        // Navigate to home
        navigation.replace('Home');
      } else {
        // Auto-login failed, clear saved credentials
        await AsyncStorage.removeItem('rememberedCredentials');
        setRememberMe(false);
        console.log('[Auto-Login] Failed, credentials may be invalid');
      }
    } catch (error) {
      console.error('[Auto-Login] Error:', error);
      // Don't show alert for auto-login failures, just stay on login screen
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setCredentials(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLogin = async () => {
    if (!credentials.email || !credentials.password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    try {
      // Get unique device identifier (with fallback)
      let deviceId = null;
      try {
        deviceId = await Device.getDeviceIdAsync();
        console.log('[Login] Device ID:', deviceId);
      } catch (deviceError) {
        console.warn('[Login] Failed to get device ID:', deviceError);
        // Continue without device ID - single device enforcement will be skipped
      }
      
      const result = await loginUser({ ...credentials, deviceId });
      if (result.success) {
        // Save credentials if Remember Me is checked
        if (rememberMe) {
          await AsyncStorage.setItem('rememberedCredentials', JSON.stringify(credentials));
        } else {
          await AsyncStorage.removeItem('rememberedCredentials');
        }
        
        // Fetch Supabase user UUID and attach to user object
        const supabaseUserId = await ensureSupabaseUserId(result.user);
        const userWithSupabaseId = {
          ...result.user,
          supabaseUserId,
        };
        console.log('[Login] Supabase user ID obtained:', supabaseUserId);
        
        // Store user session
        if (onLogin) {
          await onLogin(userWithSupabaseId);
        }
        // Navigate to home
        navigation.replace('Home');
      } else {
        Alert.alert('Login Failed', result.message || 'Invalid credentials');
      }
    } catch (error) {
      const msg = (error?.message || '').toLowerCase();
      if (msg.includes('pending') || msg.includes('under process') || msg.includes('verification')) {
        Alert.alert(
          'Under Verification',
          'This email is under process of verification. Please wait for admin approval.'
        );
      } else if (msg.includes('approved') || msg.includes('activation')) {
        Alert.alert(
          'Activation Required',
          'Your account is approved but not activated. Please check your email for the activation link.'
        );
      } else if (msg.includes('already logged in') || msg.includes('another device')) {
        Alert.alert(
          'Device Limit Reached',
          'This account is already logged in on another device. Please log out from the other device first.',
          [
            { text: 'OK', style: 'cancel' }
          ]
        );
      } else {
        Alert.alert('Error', 'Login failed. Please check your credentials.');
      }
      console.error('Login error:', error);
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>RAKSHA Ireland</Text>
          <Text style={styles.subtitle}>Emergency Response Login</Text>
        </View>

        <View style={styles.loginForm}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={credentials.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={credentials.password}
            onChangeText={(value) => handleInputChange('password', value)}
            placeholder="Enter your password"
            secureTextEntry
            autoCapitalize="none"
          />

          <Pressable
            style={styles.rememberMeContainer}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.rememberMeText}>Remember Me</Text>
          </Pressable>

          <Pressable
            style={[styles.loginButton, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </Pressable>

          <View style={styles.divider} />

          <Pressable
            style={styles.signupButton}
            onPress={() => navigation.navigate('Signup')}
          >
            <Text style={styles.signupText}>
              Don't have an account? Register here
            </Text>
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Need help? Contact admin@rakshaireland.org
          </Text>
        </View>
        </View>
      </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#d32f2f',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
  },
  loginForm: {
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: '#fafafa',
  },
  loginButton: {
    backgroundColor: '#d32f2f',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 25,
  },
  signupButton: {
    alignItems: 'center',
    padding: 10,
  },
  signupText: {
    color: '#d32f2f',
    fontSize: 16,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    marginTop: 30,
  },
  footerText: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#d32f2f',
    borderRadius: 5,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#d32f2f',
  },
  checkmark: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rememberMeText: {
    fontSize: 16,
    color: '#333',
  },
});