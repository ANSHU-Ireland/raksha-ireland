import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  SafeAreaView,
  Animated,
  Vibration,
  AppState,
} from 'react-native';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { sendSOSAlert, registerPushToken } from '../api/aws';
import { getH3Index } from '../utils/geo';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function HomeScreen({ navigation, user }) {
  const [location, setLocation] = useState(null);
  const [sosActive, setSOSActive] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [sosTimer, setSOSTimer] = useState(null);
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const holdTimerRef = useRef(null);

  useEffect(() => {
    setupLocation();
    setupNotifications();
    
    return () => {
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
      }
    };
  }, []);

  const setupLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Location access is required for emergency services.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      
      setLocation(currentLocation);
      
      // Start background location tracking
      await Location.requestBackgroundPermissionsAsync();
    } catch (error) {
      console.error('Location setup error:', error);
      Alert.alert('Error', 'Failed to setup location services.');
    }
  };

  const setupNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Notification access is required for emergency alerts.');
        return;
      }

      const token = (await Notifications.getExpoPushTokenAsync()).data;
      await registerPushToken(token);
    } catch (error) {
      console.error('Notification setup error:', error);
    }
  };

  const startSOSHold = () => {
    if (sosActive) return;

    setHoldProgress(0);
    Vibration.vibrate(100);

    // Start progress animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 3000,
      useNativeDriver: false,
    }).start();

    // Start pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();

    // Progress timer
    let progress = 0;
    holdTimerRef.current = setInterval(() => {
      progress += 33.33; // 3 seconds = 3000ms, update every 100ms
      setHoldProgress(progress);
      
      if (progress >= 100) {
        clearInterval(holdTimerRef.current);
        triggerSOS();
      }
    }, 100);
  };

  const cancelSOSHold = () => {
    if (holdTimerRef.current) {
      clearInterval(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    
    setHoldProgress(0);
    progressAnim.setValue(0);
    pulseAnim.setValue(1);
    Vibration.cancel();
  };

  const triggerSOS = async () => {
    setSOSActive(true);
    Vibration.vibrate([200, 100, 200, 100, 200]);

    try {
      if (!location) {
        throw new Error('Location not available');
      }

      const h3Index = getH3Index(location.coords.latitude, location.coords.longitude);
      
      const sosData = {
        userId: user?.id || 'anonymous',
        location: {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          accuracy: location.coords.accuracy,
          timestamp: new Date().toISOString(),
        },
        h3Index,
        message: 'Emergency SOS Alert',
      };

      await sendSOSAlert(sosData);
      
      Alert.alert(
        'SOS Alert Sent',
        'Your emergency alert has been sent to nearby users and emergency services.',
        [
          {
            text: 'OK',
            onPress: () => setSOSActive(false)
          }
        ]
      );
    } catch (error) {
      console.error('SOS error:', error);
      Alert.alert(
        'SOS Failed',
        'Failed to send emergency alert. Please try again or contact emergency services directly.',
        [
          { text: 'Retry', onPress: () => { setSOSActive(false); triggerSOS(); } },
          { text: 'Cancel', onPress: () => setSOSActive(false) }
        ]
      );
    }
  };

  const logout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', onPress: () => navigation.replace('Login') }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>RAKSHA Ireland</Text>
        <Pressable style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <Text style={styles.welcomeText}>
          Welcome, {user?.name || 'User'}
        </Text>
        
        <View style={styles.locationInfo}>
          <Text style={styles.locationText}>
            📍 {location ? `Located in ${user?.county || 'Ireland'}` : 'Getting location...'}
          </Text>
        </View>

        <View style={styles.sosContainer}>
          <Text style={styles.instructionText}>
            Hold the button below for 3 seconds to send emergency alert
          </Text>
          
          <Animated.View style={[styles.sosButtonContainer, { transform: [{ scale: pulseAnim }] }]}>
            <Pressable
              style={[
                styles.sosButton,
                sosActive && styles.sosButtonActive,
                { opacity: sosActive ? 0.7 : 1 }
              ]}
              onPressIn={startSOSHold}
              onPressOut={cancelSOSHold}
              disabled={sosActive}
            >
              <Text style={styles.sosButtonText}>
                {sosActive ? 'ALERT SENT' : 'SOS'}
              </Text>
              
              {holdProgress > 0 && !sosActive && (
                <View style={styles.progressContainer}>
                  <Animated.View 
                    style={[
                      styles.progressBar,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        })
                      }
                    ]} 
                  />
                </View>
              )}
            </Pressable>
          </Animated.View>

          {holdProgress > 0 && !sosActive && (
            <Text style={styles.progressText}>
              Hold to send SOS... {Math.round(holdProgress)}%
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Emergency Services: 999 or 112
          </Text>
          <Text style={styles.footerSubText}>
            For immediate life-threatening emergencies, call directly
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#d32f2f',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#666',
    fontSize: 16,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    color: '#333',
    marginBottom: 10,
  },
  locationInfo: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 20,
  },
  locationText: {
    fontSize: 16,
    color: '#666',
  },
  sosContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  sosButtonContainer: {
    marginBottom: 20,
  },
  sosButton: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#d32f2f',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  sosButtonActive: {
    backgroundColor: '#4caf50',
  },
  sosButtonText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: 'white',
  },
  progressText: {
    fontSize: 16,
    color: '#d32f2f',
    fontWeight: '600',
  },
  footer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#d32f2f',
    marginBottom: 5,
  },
  footerSubText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});