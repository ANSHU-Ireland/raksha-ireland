import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/foundation.dart';
import 'dart:convert';
import './navigation_service.dart';

/// Service for handling push notifications and local notifications
class NotificationService {
  static final FlutterLocalNotificationsPlugin _localNotifications = 
      FlutterLocalNotificationsPlugin();
  
  static final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  
  /// Initialize notification service
  static Future<void> initialize() async {
    // Initialize local notifications
    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );
    
    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );
    
    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );
    
    // Create notification channels for Android
    await _createNotificationChannels();
    
    // Request permissions
    await _requestPermissions();
    
    // Set up Firebase messaging handlers
    _setupFirebaseMessaging();
  }
  
  /// Create notification channels for Android
  static Future<void> _createNotificationChannels() async {
    // Emergency alerts channel
    const emergencyChannel = AndroidNotificationChannel(
      'emergency_alerts',
      'Emergency Alerts',
      description: 'Critical emergency notifications from nearby users',
      importance: Importance.max,
      enableVibration: true,
      enableLights: true,
      playSound: true,
      sound: RawResourceAndroidNotificationSound('emergency_alert'),
    );
    
    // General notifications channel
    const generalChannel = AndroidNotificationChannel(
      'general',
      'General Notifications',
      description: 'General app notifications and updates',
      importance: Importance.high,
    );
    
    // Verification status channel
    const verificationChannel = AndroidNotificationChannel(
      'verification',
      'Verification Status',
      description: 'Updates about account verification status',
      importance: Importance.high,
    );
    
    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(emergencyChannel);
    
    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(generalChannel);
    
    await _localNotifications
        .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>()
        ?.createNotificationChannel(verificationChannel);
  }
  
  /// Request notification permissions
  static Future<void> _requestPermissions() async {
    // Request FCM permissions
    final settings = await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
      criticalAlert: true,
    );
    
    if (kDebugMode) {
      print('Notification permissions granted: ${settings.authorizationStatus}');
    }
  }
  
  /// Setup Firebase messaging handlers
  static void _setupFirebaseMessaging() {
    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      if (kDebugMode) {
        print('Received foreground message: ${message.messageId}');
      }
      
      if (message.data['type'] == 'emergency_alert') {
        showEmergencyNotification(message);
      } else {
        showGeneralNotification(message);
      }
    });
    
    // Handle notification taps when app is in background
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      if (kDebugMode) {
        print('Notification tapped: ${message.messageId}');
      }
      _handleNotificationTap(message.data);
    });
    
    // Get initial message if app was opened from terminated state
    _firebaseMessaging.getInitialMessage().then((RemoteMessage? message) {
      if (message != null) {
        if (kDebugMode) {
          print('App opened from notification: ${message.messageId}');
        }
        _handleNotificationTap(message.data);
      }
    });
  }
  
  /// Handle notification tap
  static void _onNotificationTapped(NotificationResponse response) {
    final payload = response.payload;
    if (payload != null && payload.isNotEmpty) {
      if (kDebugMode) {
        print('Local notification tapped with payload: $payload');
      }
      
      try {
        // Try to parse as JSON first
        final Map<String, dynamic> data = jsonDecode(payload);
        _handleNotificationTap(data);
      } catch (e) {
        // Fallback to string parsing if JSON fails
        if (kDebugMode) {
          print('JSON parse failed, using fallback: $e');
        }
        
        if (payload.contains('emergency_alert')) {
          String? alertId;
          final alertIdMatch = RegExp(r'alert_id[:\s]*([a-zA-Z0-9-]+)').firstMatch(payload);
          if (alertIdMatch != null) {
            alertId = alertIdMatch.group(1);
          }
          _navigateToNearbyAlerts(alertId);
        } else if (payload.contains('verification_status')) {
          _navigateToProfile();
        } else {
          _navigateToHome();
        }
      }
    }
  }
  
  /// Handle notification tap from Firebase
  static void _handleNotificationTap(Map<String, dynamic> data) {
    final type = data['type'];
    
    if (kDebugMode) {
      print('Notification tapped. Type: $type, Data: $data');
    }
    
    switch (type) {
      case 'emergency_alert':
        // Navigate to nearby alerts screen with the specific alert ID
        final alertId = data['alert_id'];
        _navigateToNearbyAlerts(alertId);
        break;
      case 'verification_status':
        // Navigate to profile or verification screen
        _navigateToProfile();
        break;
      default:
        // Navigate to home screen
        _navigateToHome();
        break;
    }
  }

  /// Navigate to nearby alerts screen
  static void _navigateToNearbyAlerts(String? alertId) {
    try {
      final navService = NavigationService();
      if (alertId != null) {
        navService.navigateTo('/nearby-alerts', arguments: {'alertId': alertId});
      } else {
        navService.navigateTo('/nearby-alerts');
      }
    } catch (e) {
      if (kDebugMode) {
        print('Navigation error: $e');
      }
    }
  }

  /// Navigate to profile screen
  static void _navigateToProfile() {
    try {
      final navService = NavigationService();
      navService.navigateTo('/profile');
    } catch (e) {
      if (kDebugMode) {
        print('Navigation error: $e');
      }
    }
  }

  /// Navigate to home screen
  static void _navigateToHome() {
    try {
      final navService = NavigationService();
      navService.navigateTo('/home');
    } catch (e) {
      if (kDebugMode) {
        print('Navigation error: $e');
      }
    }
  }
  
  /// Show emergency alert notification
  static Future<void> showEmergencyNotification(RemoteMessage message) async {
    const androidDetails = AndroidNotificationDetails(
      'emergency_alerts',
      'Emergency Alerts',
      importance: Importance.max,
      enableVibration: true,
      enableLights: true,
      fullScreenIntent: true,
      category: AndroidNotificationCategory.alarm,
      ticker: 'Emergency Alert',
    );
    
    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
      sound: 'emergency_alert.wav',
      interruptionLevel: InterruptionLevel.critical,
    );
    
    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );
    
    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      message.notification?.title ?? 'Emergency Alert!',
      message.notification?.body ?? 'Someone nearby needs help',
      details,
      payload: jsonEncode(message.data), // Encode as JSON for proper parsing
    );
  }
  
  /// Show general notification
  static Future<void> showGeneralNotification(RemoteMessage message) async {
    const androidDetails = AndroidNotificationDetails(
      'general',
      'General Notifications',
      importance: Importance.high,
      priority: Priority.high,
    );
    
    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );
    
    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );
    
    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      message.notification?.title ?? 'Raksha Ireland',
      message.notification?.body ?? '',
      details,
      payload: message.data.toString(),
    );
  }
  
  /// Show verification status notification
  static Future<void> showVerificationNotification({
    required String title,
    required String body,
    Map<String, dynamic>? data,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'verification',
      'Verification Status',
      importance: Importance.high,
      priority: Priority.high,
    );
    
    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );
    
    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );
    
    await _localNotifications.show(
      DateTime.now().millisecondsSinceEpoch ~/ 1000,
      title,
      body,
      details,
      payload: data?.toString(),
    );
  }
  
  /// Get FCM token for this device
  static Future<String?> getFCMToken() async {
    try {
      final token = await _firebaseMessaging.getToken();
      if (kDebugMode) {
        print('FCM Token: $token');
      }
      return token;
    } catch (e) {
      if (kDebugMode) {
        print('Error getting FCM token: $e');
      }
      return null;
    }
  }
  
  /// Subscribe to a topic
  static Future<void> subscribeToTopic(String topic) async {
    try {
      await _firebaseMessaging.subscribeToTopic(topic);
      if (kDebugMode) {
        print('Subscribed to topic: $topic');
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error subscribing to topic $topic: $e');
      }
    }
  }
  
  /// Unsubscribe from a topic
  static Future<void> unsubscribeFromTopic(String topic) async {
    try {
      await _firebaseMessaging.unsubscribeFromTopic(topic);
      if (kDebugMode) {
        print('Unsubscribed from topic: $topic');
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error unsubscribing from topic $topic: $e');
      }
    }
  }
  
  /// Cancel all notifications
  static Future<void> cancelAllNotifications() async {
    await _localNotifications.cancelAll();
  }
  
  /// Cancel specific notification
  static Future<void> cancelNotification(int id) async {
    await _localNotifications.cancel(id);
  }
}