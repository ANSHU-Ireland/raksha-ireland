import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

import 'core/theme/app_theme.dart';
import 'core/services/navigation_service.dart';
import 'core/services/notification_service.dart';
import 'core/services/location_service.dart';
import 'core/services/auth_service.dart';
import 'features/splash/splash_screen.dart';
import 'features/auth/providers/auth_provider.dart';
import 'features/emergency/providers/emergency_provider.dart';
import 'features/profile/providers/profile_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Initialize Firebase
  await Firebase.initializeApp();
  
  // Initialize background message handler
  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  
  // Initialize local notifications
  await NotificationService.initialize();
  
  runApp(const RakshaIrelandApp());
}

/// Background message handler for Firebase Cloud Messaging
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
  await NotificationService.showEmergencyNotification(message);
}

class RakshaIrelandApp extends StatelessWidget {
  const RakshaIrelandApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        // Services
        Provider<NavigationService>(
          create: (_) => NavigationService(),
        ),
        Provider<NotificationService>(
          create: (_) => NotificationService(),
        ),
        Provider<LocationService>(
          create: (_) => LocationService(),
        ),
        Provider<AuthService>(
          create: (_) => AuthService(),
        ),
        
        // State Providers
        ChangeNotifierProvider<AuthProvider>(
          create: (context) => AuthProvider(
            authService: context.read<AuthService>(),
          ),
        ),
        ChangeNotifierProvider<EmergencyProvider>(
          create: (context) => EmergencyProvider(
            locationService: context.read<LocationService>(),
            notificationService: context.read<NotificationService>(),
          ),
        ),
        ChangeNotifierProvider<ProfileProvider>(
          create: (context) => ProfileProvider(
            authService: context.read<AuthService>(),
          ),
        ),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, authProvider, child) {
          return MaterialApp(
            title: 'Raksha Ireland',
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            darkTheme: AppTheme.darkTheme,
            themeMode: ThemeMode.system,
            navigatorKey: NavigationService.navigatorKey,
            home: const SplashScreen(),
            routes: {
              '/splash': (context) => const SplashScreen(),
              // Additional routes will be added as features are implemented
            },
          );
        },
      ),
    );
  }
}