import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Alert } from 'react-native';

// Import screens
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import HomeScreen from './src/screens/HomeScreen';

// Import API functions
import { testConnection } from './src/api/aws';

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
      
      // Check for existing user session (implement as needed)
      // const savedUser = await AsyncStorage.getItem('user');
      // if (savedUser) {
      //   setUser(JSON.parse(savedUser));
      // }
      
    } catch (error) {
      console.log('App initialization warning:', error.message);
      // Don't block app startup for API connection issues
    } finally {
      setIsReady(true);
    }
  };

  if (!isReady) {
    // You can add a splash screen component here
    return null;
  }

  return (
    <>
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
            component={LoginScreen}
            options={{ 
              title: 'RAKSHA Ireland',
              headerLeft: null 
            }}
          />
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
            {(props) => <HomeScreen {...props} user={user} />}
          </Stack.Screen>
        </Stack.Navigator>
      </NavigationContainer>
    </>
  );
}
