import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerPushToken } from '../api/aws';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

/**
 * Register for push notifications and get Expo push token
 */
export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sos-alerts', {
      name: 'Emergency SOS Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      lightColor: '#d32f2f',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }
    
    try {
      token = (await Notifications.getExpoPushTokenAsync({
        projectId: 'c5847c5c-d0fd-4ee2-afd0-c0d7f2f853c3',
      })).data;
      console.log('Expo Push Token:', token);
      
      // Save token to AsyncStorage
      await AsyncStorage.setItem('pushToken', token);
      
      // Register token with backend
      try {
        await registerPushToken(token);
        console.log('Push token registered with backend');
      } catch (error) {
        console.error('Failed to register push token with backend:', error);
      }
    } catch (error) {
      console.error('Error getting push token:', error);
      return null;
    }
  } else {
    console.warn('Must use physical device for Push Notifications');
  }

  return token;
}

/**
 * Send a local notification for SOS confirmation
 */
export async function sendSOSConfirmationNotification() {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚨 SOS Alert Sent',
      body: 'Your emergency alert has been broadcast to nearby responders',
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
      badge: 1,
      data: {
        type: 'sos_confirmation',
      },
    },
    trigger: null, // Show immediately
  });
}

/**
 * Send notification when alert is received from others
 */
export async function sendAlertReceivedNotification(alertData) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚨 Emergency Alert Nearby',
      body: alertData.message || 'Someone nearby needs help!',
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      badge: 1,
      data: {
        type: 'alert_received',
        alert: alertData,
        screen: 'Alert',
        params: { alertId: alertData?.alertId, latitude: alertData?.latitude, longitude: alertData?.longitude },
        link: `raksha://alert/${alertData?.alertId}`,
      },
      categoryIdentifier: 'sos-alert',
    },
    trigger: null,
  });
}

/**
 * Notify helpers locally about SOS so tap opens alert page
 */
export async function sendHelperAlertNotification({ alertId, name, latitude, longitude, message }) {
  const body = message || `${name || 'A community member'} needs help nearby.`;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🚨 Emergency Alert',
      body,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      badge: 1,
      data: {
        type: 'alert_received',
        alert: { alertId, name, latitude, longitude },
        screen: 'Alert',
        params: { alertId, latitude, longitude },
        link: `raksha://alert/${alertId}`,
      },
      categoryIdentifier: 'sos-alert',
    },
    trigger: null,
  });
}

/**
 * Cancel all notifications
 */
export async function cancelAllNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Get current notification badge count
 */
export async function getBadgeCount() {
  return await Notifications.getBadgeCountAsync();
}

/**
 * Set notification badge count
 */
export async function setBadgeCount(count) {
  await Notifications.setBadgeCountAsync(count);
}

/**
 * Clear all badges
 */
export async function clearBadges() {
  await Notifications.setBadgeCountAsync(0);
}
