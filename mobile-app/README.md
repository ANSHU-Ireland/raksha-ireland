# Raksha Ireland Mobile App

Flutter cross-platform mobile application for the Raksha Ireland emergency alert system.

## Overview

The Raksha Ireland mobile app provides emergency SOS broadcasting, location-based alerts, and community safety features for immigrants and residents in Ireland.

## Features

- **Emergency SOS Button**: Hold-to-trigger emergency alerts
- **Location-Based Alerts**: Receive notifications from users within 3km
- **User Verification**: Manual verification system with admin approval
- **Secure Authentication**: Firebase Auth with email verification
- **Push Notifications**: Real-time emergency alerts via FCM
- **Multilingual Support**: English + 5 immigrant languages
- **Widget Support**: Quick SOS access from home screen
- **GDPR Compliance**: Privacy-focused data handling

## Project Structure

```
lib/
├── core/                   # Core functionality
│   ├── services/          # Core services (auth, location, notifications)
│   └── theme/             # App theme and design system
├── features/              # Feature modules
│   ├── auth/             # Authentication & registration
│   ├── emergency/        # SOS alerts and emergency features
│   ├── profile/          # User profile and settings
│   └── splash/           # Splash screen
├── shared/               # Shared widgets and utilities
│   └── widgets/          # Reusable UI components
└── main.dart             # Application entry point
```

## Key Dependencies

### Core
- `flutter` - Cross-platform framework
- `provider` - State management
- `firebase_core` - Firebase integration
- `firebase_auth` - Authentication
- `firebase_messaging` - Push notifications

### Location & Maps
- `geolocator` - Location services
- `google_maps_flutter` - Map integration
- `geocoding` - Address lookup

### UI & Animation
- `flutter_svg` - SVG support
- `lottie` - Animations
- `cached_network_image` - Image caching

### Storage & Networking
- `dio` - HTTP client
- `shared_preferences` - Local storage
- `flutter_secure_storage` - Secure storage

## Design System

### Colors (Brand Guidelines)
```dart
// Primary Colors
crisisRed: #E63946      // Emergency actions
offWhite: #F1FAEE       // Background

// Areiva Integration
areivaTeal: #005F73     // Headers, navigation
areivaLight: #94D2BD    // Secondary buttons

// Status Colors
successGreen: #2D6A4F   // Verification, success
warningOrange: #F77F00  // Alerts, pending
errorRed: #D62828       // Errors, rejections
```

### Typography
- **Headings**: Montserrat (Bold)
- **Body Text**: Inter (Regular, Medium, SemiBold)
- **Accessibility**: Dynamic Type support, WCAG AA compliance

## Getting Started

### Prerequisites
- Flutter SDK 3.10+
- Dart 3.0+
- Firebase project setup
- Google Maps API key
- iOS: Xcode 14+
- Android: SDK 33+

### Setup

1. **Install dependencies**:
   ```bash
   flutter pub get
   ```

2. **Configure Firebase**:
   - Add `google-services.json` (Android)
   - Add `GoogleService-Info.plist` (iOS)
   - Enable Authentication, Firestore, and FCM

3. **Configure environment**:
   ```bash
   # Create environment files
   cp .env.example .env.dev
   cp .env.example .env.prod
   ```

4. **Add API keys**:
   - Google Maps API key
   - Firebase configuration
   - Backend API endpoints

### Development

```bash
# Run in debug mode
flutter run

# Run with specific environment
flutter run --dart-define-from-file=.env.dev

# Generate code (for models, APIs)
dart run build_runner build

# Run tests
flutter test
```

### Building

```bash
# Build for Android
flutter build apk --release

# Build for iOS
flutter build ios --release

# Build App Bundle (for Play Store)
flutter build appbundle --release
```

## Architecture

### State Management
- **Provider** for global state management
- **ChangeNotifier** for feature-specific state
- **Service classes** for business logic

### Core Services

#### AuthService
- Firebase Authentication integration
- User registration and login
- Email verification
- Password management

#### LocationService  
- GPS location access
- Geofencing calculations
- Address geocoding
- Permission handling

#### NotificationService
- Push notification setup
- Local notifications
- Emergency alert routing
- Channel management

### Emergency System

#### SOS Trigger Flow
1. User holds SOS button (2 seconds)
2. Location permission check
3. GPS coordinates captured
4. Backend API call with location
5. Server finds users within 3km
6. Push notifications sent to nearby users
7. 60-second cooldown period

#### Alert Reception
1. Push notification received
2. Local notification displayed
3. User can respond or ignore
4. Response tracked for analytics

## Security & Privacy

### Data Protection
- AES-256 encryption at rest
- TLS 1.3 for API communication
- Location data hashed after 24 hours
- GDPR-compliant data handling

### Authentication
- Email verification required
- JWT tokens with expiration
- Secure password requirements
- Account deletion support

### Permissions
- Location: Only when needed for emergency
- Notifications: Required for alerts
- Camera: Only for document upload
- Storage: Minimal, encrypted

## Testing

### Unit Tests
```bash
# Run all unit tests
flutter test

# Run with coverage
flutter test --coverage
```

### Integration Tests
```bash
# Run integration tests
flutter drive --target=test_driver/app.dart
```

### Widget Tests
- Component-level testing
- UI interaction testing
- State management testing

## Deployment

### Android (Google Play)
1. Build signed AAB
2. Upload to Play Console
3. Configure store listing
4. Submit for review

### iOS (App Store)
1. Build and archive in Xcode
2. Upload to App Store Connect
3. Configure app metadata
4. Submit for review

## Contributing

### Code Style
- Follow Dart/Flutter conventions
- Use effective_dart lints
- 80-character line limit
- Meaningful variable names

### Git Workflow
- Feature branches from `develop`
- Pull requests for all changes
- Code review required
- Automated testing on PR

### Documentation
- Update README for new features
- Document public APIs
- Include code examples
- Maintain changelog

## Support

### Development
- Flutter documentation: https://flutter.dev/docs
- Firebase guides: https://firebase.google.com/docs
- Provider state management: https://pub.dev/packages/provider

### Community
- GitHub Issues: Bug reports and feature requests
- Discussions: Community support and questions
- Wiki: Additional documentation and guides

## License

This project is licensed under the MIT License - see the LICENSE file for details.