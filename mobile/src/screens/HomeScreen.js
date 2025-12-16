import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  Animated,
  Vibration,
  AppState,
  Platform,
  Linking,
} from 'react-native';
import { ToastAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { sendSOSAlert, registerPushToken, USE_SUPABASE, resolveMyLatestAlert } from '../api/aws';
import { ensureSupabaseUserId } from '../api/supabaseApi';
import { getH3Index } from '../utils/geo';
import { startBackgroundLocationTracking, stopBackgroundLocationTracking } from '../services/locationTask';
import { 
  registerForPushNotificationsAsync, 
  sendSOSConfirmationNotification,
  clearBadges 
} from '../services/notificationService';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

const HomeScreen = forwardRef(({ navigation, user, onLogout }, ref) => {
  const [location, setLocation] = useState(null);
  const [sosActive, setSOSActive] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [sosTimer, setSOSTimer] = useState(null);
  const [diag, setDiag] = useState({
    fgStatus: 'unknown',
    bgStatus: 'unknown',
    servicesEnabled: undefined,
    provider: undefined,
    lastError: undefined,
    lastUpdateAt: undefined,
  });
  const watchRef = useRef(null);
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const holdTimerRef = useRef(null);
  
  // Triple tap detection
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);

  // Expose triggerSOS method to parent component (for widget deep links)
  useImperativeHandle(ref, () => ({
    triggerSOS: () => {
      // Widget tap - send SOS directly without confirmation
      triggerSOS();
    }
  }));

  useEffect(() => {
    setupLocation();
    setupNotifications();
    
    // Handle deep links (from widgets)
    const handleDeepLink = (event) => {
      const url = event.url;
      console.log('Deep link received:', url);
      
      if (url && url.includes('raksha://sos')) {
        // Trigger SOS from widget - send directly without confirmation
        triggerSOS();
      }
    };
    
    // Check if app was opened from a deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });
    
    // Listen for deep links while app is running
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);
    
    // Set up notification response handler
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      
      // Extract data from notification
      const notificationData = response.notification.request.content.data;
      
      if (notificationData) {
        // Check if it's an SOS alert notification
        if (notificationData.type === 'alert_received' || notificationData.screen === 'AlertHistory') {
          // Navigate to AlertHistory screen
          navigation.navigate('AlertHistory');
          // Clear the badge
          clearBadges();
        } else if (notificationData.alert) {
          // Navigate to AlertDetail with specific alert
          navigation.navigate('AlertDetail', { alert: notificationData.alert });
        }
      }
    });
    
    // Start background location tracking
    startBackgroundLocationTracking().then(result => {
      console.log('Background tracking:', result.message);
    });
    
    // Register for push notifications
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        console.log('Push token registered:', token);
      }
    });
    
    return () => {
      linkingSubscription.remove();
      subscription.remove();
      if (holdTimerRef.current) {
        clearInterval(holdTimerRef.current);
      }
      // Stop background tracking when component unmounts
      stopBackgroundLocationTracking();
    };
  }, []);

  const updatePermissionsAndProvider = async () => {
    try {
      const fg = await Location.getForegroundPermissionsAsync();
      const bg = await Location.getBackgroundPermissionsAsync();
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      let provider;
      try {
        provider = await Location.getProviderStatusAsync();
      } catch (e) {
        provider = undefined;
      }
      setDiag(d => ({
        ...d,
        fgStatus: fg?.status || 'unknown',
        bgStatus: bg?.status || 'unknown',
        servicesEnabled,
        provider,
      }));
    } catch (e) {
      setDiag(d => ({ ...d, lastError: `perm/provider: ${e?.message || e}` }));
    }
  };

  const setupLocation = async () => {
    try {
      await updatePermissionsAndProvider();
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Location access is required for emergency services. Please enable location permissions in Settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Location.openSettings() }
          ]
        );
        return;
      }

      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) {
        Alert.alert(
          'Location Disabled',
          'Location services are turned off. Enable them in Settings to send SOS with your position.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Location.openSettings() }
          ]
        );
        return;
      }

      // Try last known position first for faster availability
      let currentLocation = await Location.getLastKnownPositionAsync();

      if (!currentLocation) {
        // Fallback to an active fetch with a timeout
        try {
          currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Platform.OS === 'android' ? Location.Accuracy.High : Location.Accuracy.Balanced,
            maximumAge: 5000,
            mayShowUserSettingsDialog: true,
          });
        } catch (e) {
          console.warn('getCurrentPositionAsync failed:', e?.message || e);
        }
      }

      if (!currentLocation) {
        // As a last resort on some Android devices, start a short watch
        try {
          const controller = { sub: null, done: false };
          const locationPromise = new Promise((resolve) => {
            controller.sub = Location.watchPositionAsync(
              { accuracy: Location.Accuracy.High, distanceInterval: 1, timeInterval: 1000 },
              (loc) => {
                if (!controller.done && loc?.coords) {
                  controller.done = true;
                  resolve(loc);
                }
              }
            );
          });

          const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 8000));
          const first = await Promise.race([locationPromise, timeoutPromise]);
          if (first) currentLocation = first;
          if (controller.sub) {
            try { (await controller.sub).remove(); } catch {}
          }
        } catch (e) {
          console.warn('watchPositionAsync fallback failed:', e?.message || e);
        }
      }

      if (!currentLocation) {
        console.warn('Location not available after checks');
        Alert.alert(
          'Location Unavailable',
          'We could not fetch your location. Please ensure GPS is on and try again.',
          [{ text: 'OK' }]
        );
        setDiag(d => ({ ...d, lastError: 'Location unavailable after attempts', lastUpdateAt: Date.now() }));
        return;
      }

      setLocation(currentLocation);
      setDiag(d => ({ ...d, lastError: undefined, lastUpdateAt: Date.now() }));

      // Start background location tracking
      await Location.requestBackgroundPermissionsAsync();
    } catch (error) {
      console.error('Location setup error:', error);
      setDiag(d => ({ ...d, lastError: error?.message || String(error), lastUpdateAt: Date.now() }));
      Alert.alert('Error', 'Failed to setup location services.');
    }
  };

  const refreshLocation = async () => {
    // Quick, non-intrusive refresh without alerts
    try {
      await updatePermissionsAndProvider();
      let fresh = await Location.getLastKnownPositionAsync();
      if (!fresh) {
        try {
          fresh = await Location.getCurrentPositionAsync({
            accuracy: Platform.OS === 'android' ? Location.Accuracy.High : Location.Accuracy.Balanced,
            maximumAge: 0,
            timeout: 7000,
            mayShowUserSettingsDialog: false,
          });
        } catch (e) {
          console.log('[Refresh] getCurrentPosition failed:', e?.message || e);
        }
      }
      if (!fresh) {
        try {
          if (watchRef.current) {
            try { (await watchRef.current).remove(); } catch {}
            watchRef.current = null;
          }
          watchRef.current = Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 1, timeInterval: 1000 },
            (loc) => {
              if (loc?.coords) {
                setLocation(loc);
                setDiag(d => ({ ...d, lastError: undefined, lastUpdateAt: Date.now() }));
                // Stop the temporary watch after first fix
                if (watchRef.current) {
                  (async () => { try { (await watchRef.current).remove(); } catch {} finally { watchRef.current = null; } })();
                }
              }
            }
          );
          // Allow up to 8s then stop if no fix
          setTimeout(async () => {
            if (watchRef.current) {
              try { (await watchRef.current).remove(); } catch {}
              watchRef.current = null;
              setDiag(d => ({ ...d, lastError: 'Watch timeout (no fix)', lastUpdateAt: Date.now() }));
            }
          }, 8000);
        } catch (e) {
          setDiag(d => ({ ...d, lastError: `watch failed: ${e?.message || e}`, lastUpdateAt: Date.now() }));
        }
        return;
      }
      setLocation(fresh);
      setDiag(d => ({ ...d, lastError: undefined, lastUpdateAt: Date.now() }));
    } catch (e) {
      setDiag(d => ({ ...d, lastError: e?.message || String(e), lastUpdateAt: Date.now() }));
    }
  };

  const setupNotifications = async () => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permission not granted');
        return;
      }

      // Try to get push token, but don't fail if projectId is missing
      try {
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: 'raksha-ireland-mobile-dev'
        });
        if (tokenData?.data) {
          await registerPushToken(tokenData.data);
          console.log('Push token registered successfully');
        }
      } catch (tokenError) {
        console.log('Push token registration skipped (development mode):', tokenError.message);
        // Continue without push token in development
      }
    } catch (error) {
      console.log('Notification setup warning:', error.message);
      // Don't throw - notifications are non-critical for testing
    }
  };

  const startSOSHold = () => {
    if (sosActive) return;

    setHoldProgress(0);
    
    // Use Haptics on iOS, Vibration on Android
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      Vibration.vibrate(100);
    }

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

  // Triple tap handler for quick SOS
  const handleSOSPress = () => {
    tapCountRef.current += 1;
    
    // Clear existing timer
    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
    }
    
    // Check if triple tap
    if (tapCountRef.current === 3) {
      tapCountRef.current = 0;
      // Trigger SOS directly without confirmation
      triggerSOS();
      return;
    }
    
    // Reset tap count after 500ms
    tapTimerRef.current = setTimeout(() => {
      tapCountRef.current = 0;
    }, 500);
  };

  const COOLDOWN_MS = 60_000;

  const triggerSOS = async () => {
    try {
      const lastAtStr = await AsyncStorage.getItem('lastSOSAt');
      const lastAt = lastAtStr ? Number(lastAtStr) : 0;
      const now = Date.now();
      const remaining = COOLDOWN_MS - (now - lastAt);
      if (lastAt && remaining > 0) {
        console.log('[SOS] Cooldown active', { lastAt, now, remaining });
        const secs = Math.ceil(remaining / 1000);
        Alert.alert('Please wait', `You can send another SOS in ${secs}s`);
        return;
      }
    } catch {}
    setSOSActive(true);
    // Failsafe: auto-reset the button if the confirmation alert isn't dismissed
    try { if (sosTimer) clearTimeout(sosTimer); } catch {}
    const autoReset = setTimeout(() => {
      setSOSActive(false);
      setHoldProgress(0);
    }, 7000);
    setSOSTimer(autoReset);
    
    // Use Haptics on iOS, Vibration on Android
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Vibration.vibrate([200, 100, 200, 100, 200]);
    }

    try {
      // Get current location with multiple fallback strategies
      let currentLocation = location;
      
      if (!currentLocation) {
        console.log('[SOS] No cached location, attempting to fetch...');
        
        // Try last known position first (fastest)
        try {
          currentLocation = await Location.getLastKnownPositionAsync();
          console.log('[SOS] Got last known position:', !!currentLocation);
        } catch (e) {
          console.log('[SOS] Last known position failed:', e.message);
        }
        
        // If still no location, try current position with short timeout
        if (!currentLocation) {
          try {
            currentLocation = await Promise.race([
              Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                maximumAge: 10000,
                timeout: 5000,
              }),
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Location timeout')), 5000)
              )
            ]);
            console.log('[SOS] Got current position:', !!currentLocation);
          } catch (e) {
            console.log('[SOS] Current position failed:', e.message);
          }
        }
        
        if (!currentLocation) {
          throw new Error('Location not available - please ensure GPS is enabled and try again');
        }
        
        // Update the state for future use
        setLocation(currentLocation);
      }

      const h3Index = getH3Index(currentLocation.coords.latitude, currentLocation.coords.longitude);

      // Only require Supabase user resolution when Supabase mode is enabled
      let resolvedUserId = null;
      if (USE_SUPABASE) {
        const supabaseId = await ensureSupabaseUserId(user);
        if (!supabaseId) {
          throw new Error('Could not resolve a valid user ID');
        }
        resolvedUserId = supabaseId;
      }
      console.log('[SOS] Mode:', USE_SUPABASE ? 'supabase' : 'backend', 'h3:', h3Index);
      console.log('[SOS] Location:', {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
      });
      
      const sosData = {
        // In Supabase mode pass UUID; otherwise let backend resolve by email/server
        userId: resolvedUserId || undefined,
        location: {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
          accuracy: currentLocation.coords.accuracy,
          timestamp: new Date().toISOString(),
        },
        h3Index,
        message: 'Emergency SOS Alert',
        name: user?.name,
        phone: user?.phone,
      };
      console.log('[SOS] userId sent:', sosData.userId || '(backend default)');

      await sendSOSAlert(sosData);
      
      // Send local confirmation notification to sender only
      await sendSOSConfirmationNotification();
      // Quick status toast on Android
      if (Platform.OS === 'android') {
        try { ToastAndroid.show('SOS sent', ToastAndroid.SHORT); } catch {}
      }
      
      // Backend will send push notifications to nearby helpers
      // (removed local sendHelperAlertNotification - it should only go to other devices)
      
      // Start cooldown only after a successful send
      const setAt = Date.now();
      await AsyncStorage.setItem('lastSOSAt', String(setAt));
      console.log('[SOS] Cooldown set at', setAt);
      Alert.alert(
        'SOS Alert Sent',
        'Your emergency alert has been sent to nearby users and emergency services.',
        [
          {
            text: 'OK',
            onPress: () => { try { if (sosTimer) clearTimeout(sosTimer); } catch {}; setSOSActive(false); setHoldProgress(0); }
          }
        ]
      );
    } catch (error) {
      console.error('SOS error:', error);
      Alert.alert(
        'SOS Failed',
        'Failed to send emergency alert. Please try again or contact emergency services directly.',
        [
          { text: 'Retry', onPress: () => { try { if (sosTimer) clearTimeout(sosTimer); } catch {}; setSOSActive(false); setHoldProgress(0); triggerSOS(); } },
          { text: 'Cancel', onPress: () => { try { if (sosTimer) clearTimeout(sosTimer); } catch {}; setSOSActive(false); setHoldProgress(0); } }
        ]
      );
    }
  };

  const markResolved = async () => {
    try {
      Alert.alert('Resolving', 'Marking your latest alert as resolved...');
      const res = await resolveMyLatestAlert();
      if (res.success) {
        Alert.alert('Resolved', 'Help received. Your alert is marked as resolved.');
      } else {
        Alert.alert('Failed', res.message || 'Could not mark alert as resolved');
      }
    } catch (e) {
      console.error('Mark resolved error:', e);
      Alert.alert('Error', e.message || 'Failed to mark resolved');
    }
  };

  const logout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Logout', 
          onPress: async () => {
            if (onLogout) {
              await onLogout();
            }
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const testNotification = () => {
    // Navigate directly to alert history to see all alerts
    navigation.navigate('AlertHistory');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>RAKSHA Ireland</Text>
        <View style={styles.headerButtons}>
          <Pressable 
            style={styles.profileButton} 
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.profileIcon}>👤</Text>
          </Pressable>
          <Pressable 
            style={styles.testButton} 
            onPress={testNotification}
          >
            <Text style={styles.testButtonText}>🔔</Text>
          </Pressable>
          <Pressable style={styles.logoutButton} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </Pressable>
        </View>
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
            Hold for 3 seconds or triple-tap to send emergency alert
          </Text>
          
          <Animated.View style={[styles.sosButtonContainer, { transform: [{ scale: pulseAnim }] }]}>
            <Pressable
              style={[
                styles.sosButton,
                sosActive && styles.sosButtonActive,
                { opacity: sosActive ? 0.7 : 1 }
              ]}
              onPress={handleSOSPress}
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

          <Pressable style={styles.resolveButton} onPress={markResolved}>
            <Text style={styles.resolveText}>Mark Resolved</Text>
          </Pressable>

          {holdProgress > 0 && !sosActive && (
            <Text style={styles.progressText}>
              Hold to send SOS... {Math.round(holdProgress)}%
            </Text>
          )}
        </View>

        <View style={styles.footer}>
          <Pressable 
            style={styles.historyButton}
            onPress={() => navigation.navigate('ActiveAlerts')}
          >
            <Text style={styles.historyIcon}>🔔</Text>
            <Text style={styles.historyButtonText}>View Active Alerts</Text>
          </Pressable>

          <Text style={styles.footerText}>
            Emergency Services: 999 or 112
          </Text>
          <Text style={styles.footerSubText}>
            For immediate life-threatening emergencies, call directly
          </Text>
        </View>
      </View>
      {__DEV__ && Platform.OS === 'android' && (
        <View style={styles.debugWrap} pointerEvents="box-none">
          <Text style={styles.debugText}>
            FG:{diag.fgStatus} BG:{diag.bgStatus} Svc:{String(diag.servicesEnabled)}
          </Text>
          {diag?.provider && (
            <Text style={styles.debugText}>
              Prov gps:{String(diag.provider.gpsAvailable)} net:{String(diag.provider.networkAvailable)} bg:{String(diag.provider.backgroundModeEnabled)}
            </Text>
          )}
          <Text style={styles.debugText}>
            Loc: {location ? `${location.coords.latitude.toFixed(5)}, ${location.coords.longitude.toFixed(5)} ±${Math.round(location.coords.accuracy||0)}m` : 'none'}
          </Text>
          <Text style={styles.debugText}>
            Updated: {diag.lastUpdateAt ? new Date(diag.lastUpdateAt).toLocaleTimeString() : '—'} {diag.lastError ? `(err: ${diag.lastError})` : ''}
          </Text>
          <View style={styles.debugRow}>
            <Text style={styles.debugText}>Android location debug</Text>
            <Pressable style={styles.refreshBtn} onPress={refreshLocation}>
              <Text style={styles.refreshBtnText}>Refresh location</Text>
            </Pressable>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
});

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
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d32f2f',
  },
  profileIcon: {
    fontSize: 20,
  },
  testButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff9800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  testButtonText: {
    fontSize: 20,
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
    aspectRatio: 1,
    borderRadius: 1000,
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
  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d32f2f',
  },
  resolveButton: {
    marginTop: 12,
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  resolveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  historyIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  historyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d32f2f',
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
  debugWrap: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 10,
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: 10,
    borderRadius: 8,
  },
  debugText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
  },
  debugRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  refreshBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#2196f3',
    borderRadius: 6,
  },
  refreshBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default HomeScreen;