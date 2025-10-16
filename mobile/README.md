# RAKSHA Ireland - Mobile App

Emergency SOS mobile application built with Expo React Native.

## Features

- **User Registration**: Signup with manual admin approval
- **Emergency SOS**: 3-second hold button to send emergency alerts
- **Location Tracking**: H3 geospatial indexing for proximity-based alerts
- **Push Notifications**: Real-time emergency notifications
- **Low Bandwidth**: Optimized for areas with poor connectivity

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env
   # Update .env with your API endpoints
   ```

3. **Start Development Server**
   ```bash
   npm start
   ```

4. **Test on Device**
   - Install Expo Go on your mobile device
   - Scan the QR code displayed in terminal
   - Test the app functionality

## Project Structure

```
src/
├── screens/
│   ├── LoginScreen.js      # User authentication
│   ├── SignupScreen.js     # User registration
│   └── HomeScreen.js       # SOS functionality
├── api/
│   └── aws.js             # API integration
├── utils/
│   └── geo.js             # H3 geospatial utilities
└── components/            # Reusable components
```

## Key Dependencies

- **expo**: React Native framework
- **@react-navigation/native**: Screen navigation
- **axios**: HTTP client for API calls
- **h3-js**: Geospatial indexing
- **expo-location**: Location services
- **expo-notifications**: Push notifications

## Development Notes

### SOS Functionality
- 3-second hold timer with visual feedback
- Vibration patterns for user feedback
- Automatic location capture and H3 indexing
- Proximity-based alert distribution

### Location Services
- Foreground and background location permissions
- H3 resolution 8 for neighborhood-level precision
- Real-time location updates for emergency services

### Security
- JWT token-based authentication
- Secure API communication with AWS backend
- User approval workflow before activation

## Testing

1. **Registration Flow**
   - Test signup form validation
   - Verify data submission to backend
   - Check pending approval status

2. **Authentication**
   - Test login with approved/pending accounts
   - Verify token storage and API integration

3. **SOS Functionality**
   - Test 3-second hold timer
   - Verify location capture
   - Test emergency alert submission

## Deployment

The app will be distributed via:
- **Development**: Expo Go app
- **Production**: Standalone builds for App Store/Google Play

## Support

For technical issues or emergency services integration:
- Email: admin@rakshaireland.org
- Emergency: 999 or 112