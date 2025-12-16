import React, { useState, useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Alert, ActivityIndicator, View, Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import HomeScreen from './src/screens/HomeScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AlertDetailScreen from './src/screens/AlertDetailScreen';
import AlertHistoryScreen from './src/screens/AlertHistoryScreen';
import ActiveAlertsScreen from './src/screens/ActiveAlertsScreen';

// Import API functions
import { testConnection, setUserEmail } from './src/api/aws';
import { logoutUser } from './src/api/aws';
// Initialize Firebase early (web analytics auto-guards inside)
import './src/lib/firebase';

const Stack = createStackNavigator();
export const navigationRef = createNavigationContainerRef();

export default function App() {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const sosButtonRef = useRef(null);

  useEffect(() => {
    initializeApp();
    
    // Handle deep links from widgets
    const handleDeepLink = (event) => {
      const url = event?.url;
      if (url) {
        console.log('📱 Deep link received:', url);
        
        // Check if it's an SOS widget link
        if (url.includes('raksha://sos') || url.includes('org.rakshaireland.mobile://sos')) {
          // Navigate to Home screen and trigger SOS
          if (navigationRef.isReady()) {
            navigationRef.navigate('Home');
            // Trigger SOS button after navigation
            setTimeout(() => {
              if (sosButtonRef.current?.triggerSOS) {
                sosButtonRef.current.triggerSOS();
              }
            }, 500);
          }
        }
      }
    };

    // Listen for deep links when app is already open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Check if app was opened with a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });
    
    // Listen for notifications received while app is in foreground
    const notificationListener = Notifications.addNotificationReceivedListener((notification) => {
      console.log('📬 Notification received in foreground:', notification);
      const data = notification?.request?.content?.data || {};
      
      // Show an alert for emergency SOS notifications
      if (data.type === 'emergency_sos') {
        Alert.alert(
          '🚨 Emergency Alert',
          notification?.request?.content?.body || 'Emergency SOS nearby',
          [
            {
              text: 'View Details',
              onPress: () => {
                if (navigationRef.isReady() && data.alertId) {
                  navigationRef.navigate('AlertDetail', { 
                    alertId: data.alertId,
                    latitude: data.latitude,
                    longitude: data.longitude
                  });
                }
              }
            },
            { text: 'Dismiss', style: 'cancel' }
          ],
          { cancelable: false }
        );
      }
    });
    
    // Listen for notification taps to route to AlertDetail
    const responseListener = Notifications.addNotificationResponseReceivedListener((response) => {
      try {
        const data = response?.notification?.request?.content?.data || {};
        const route = data?.route || data?.screen;
        const params = data?.params || {};
        const alertId = params?.alertId || data?.alert?.alertId || data?.alertId;
        if (route === 'Alert' || route === 'AlertDetail' || data.type === 'emergency_sos') {
          if (navigationRef.isReady() && alertId) {
            navigationRef.navigate('AlertDetail', { 
              alertId,
              latitude: data.latitude || params.latitude,
              longitude: data.longitude || params.longitude
            });
          }
        } else if (route === 'AlertHistory') {
          if (navigationRef.isReady()) navigationRef.navigate('AlertHistory');
        }
      } catch (e) {
        console.log('Notification tap handling error', e);
      }
    });
    
    return () => {
      subscription?.remove();
      notificationListener.remove();
      responseListener.remove();
    };
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
      // Call server to clear device ID
      if (user?.email) {
        await logoutUser(user.email);
      }
      
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
      <NavigationContainer
        ref={navigationRef}
        linking={{
          prefixes: ['raksha://', 'org.rakshaireland.mobile://'],
          config: {
            screens: {
              Login: 'login',
              Signup: 'signup',
              Home: {
                path: 'home',
                parse: {
                  sos: () => true,
                }
              },
              Profile: 'profile',
              AlertDetail: 'alert/:alertId',
              AlertHistory: 'history',
              ActiveAlerts: 'active-alerts',
            },
          },
        }}
      >
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
            {(props) => <HomeScreen {...props} user={user} onLogout={handleLogout} ref={sosButtonRef} />}
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
          <Stack.Screen 
            name="ActiveAlerts" 
            component={ActiveAlertsScreen}
            options={{ 
              title: 'Active Alerts',
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
