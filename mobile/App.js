import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Alert, ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AlertDetailScreen from './src/screens/AlertDetailScreen';
import AlertHistoryScreen from './src/screens/AlertHistoryScreen';

// Import API functions
import { testConnection, setUserEmail } from './src/api/aws';
// Initialize Firebase early (web analytics auto-guards inside)
import './src/lib/firebase';

const Stack = createStackNavigator();

export default function App() {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Test API connection
      const connectionTest = await testConnection();
      console.log('API Connection:', connectionTest);
      
      // Check for existing user session
      const savedUser = await AsyncStorage.getItem('user');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        // Ensure API requests are associated with the restored user
        if (parsed?.email) setUserEmail(parsed.email);
        console.log('Restored user session:', parsed.email);
      }
      
    } catch (error) {
      console.log('App initialization warning:', error.message);
      // Don't block app startup for API connection issues
    } finally {
      setIsReady(true);
    }
  };

  const handleLogin = async (userData) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      if (userData?.email) setUserEmail(userData.email);
      console.log('User session saved');
    } catch (error) {
      console.error('Failed to save user session:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
      setUserEmail(null);
      console.log('User session cleared');
    } catch (error) {
      console.error('Failed to clear user session:', error);
    }
  };

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#d32f2f" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Login"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#d32f2f',
            },
            headerTintColor: '#fff',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
          }}
        >
          <Stack.Screen 
            name="Login" 
            options={{ 
              title: 'RAKSHA Ireland',
              headerLeft: null 
            }}
          >
            {(props) => <LoginScreen {...props} onLogin={handleLogin} />}
          </Stack.Screen>
          <Stack.Screen 
            name="Signup" 
            component={SignupScreen}
            options={{ title: 'Register' }}
          />
          <Stack.Screen 
            name="Home" 
            options={{ 
              title: 'Emergency Alert',
              headerLeft: null,
              gestureEnabled: false
            }}
          >
            {(props) => <HomeScreen {...props} user={user} onLogout={handleLogout} />}
          </Stack.Screen>
          <Stack.Screen 
            name="Profile" 
            options={{ 
              title: 'My Profile',
              headerStyle: {
                backgroundColor: '#d32f2f',
              },
              headerTintColor: '#fff',
            }}
          >
            {(props) => <ProfileScreen {...props} user={user} onLogout={handleLogout} />}
          </Stack.Screen>
          <Stack.Screen 
            name="AlertDetail" 
            component={AlertDetailScreen}
            options={{ 
              title: 'Emergency Alert',
              headerStyle: { backgroundColor: '#d32f2f' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' }
            }} 
          />
          <Stack.Screen 
            name="AlertHistory" 
            component={AlertHistoryScreen}
            options={{ 
              title: 'Alert History',
              headerStyle: { backgroundColor: '#d32f2f' },
              headerTintColor: '#fff',
              headerTitleStyle: { fontWeight: 'bold' }
            }} 
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
