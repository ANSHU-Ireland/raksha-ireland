import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  SafeAreaView,
  Image,
} from 'react-native';
import { loginUser } from '../api/aws';

export default function LoginScreen({ navigation }) {
  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);

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
      const result = await loginUser(credentials);
      if (result.success) {
        // Store user session and navigate to home
        navigation.replace('Home');
      } else {
        Alert.alert('Login Failed', result.message || 'Invalid credentials');
      }
    } catch (error) {
      if (error.message.includes('not approved')) {
        Alert.alert(
          'Account Pending',
          'Your account is still pending approval. Please wait for admin approval and activation email.'
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
});