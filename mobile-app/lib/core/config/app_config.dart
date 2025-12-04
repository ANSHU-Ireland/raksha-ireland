class AppConfig {
  // API Configuration
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://backend-api-production-06de.up.railway.app/api',
  );

  // App Information
  static const String appName = 'Raksha Ireland';
  static const String appVersion = '1.0.0';
  static const String buildNumber = '1';

  // Emergency Settings
  static const double emergencyRadius = 3.0; // km
  static const int sosHoldDuration = 3; // seconds
  static const int locationUpdateInterval = 30; // seconds

  // Firebase Configuration
  static const String firebaseProjectId = 'raksha-ireland-app';

  // Support
  static const String supportEmail = 'support@raksha-ireland.org';
  static const String emergencyHelpline = '999';

  // Feature Flags
  static const bool enableBiometric = true;
  static const bool enablePushNotifications = true;
  static const bool enableLocationTracking = true;

  // API Endpoints
  static String get authRegister => '$apiBaseUrl/auth/register';
  static String get authLogin => '$apiBaseUrl/auth/login';
  static String get authRefresh => '$apiBaseUrl/auth/refresh';
  static String get emergencyTrigger => '$apiBaseUrl/emergency/trigger';
  static String get emergencyNearby => '$apiBaseUrl/emergency/nearby';
  static String get emergencyRespond => '$apiBaseUrl/emergency/respond';
  static String get profileMe => '$apiBaseUrl/profile/me';

  // Environment helpers
  static bool get isProduction => const String.fromEnvironment(
    'ENVIRONMENT',
    defaultValue: 'development',
  ) == 'production';

  static bool get isDevelopment => !isProduction;
}
