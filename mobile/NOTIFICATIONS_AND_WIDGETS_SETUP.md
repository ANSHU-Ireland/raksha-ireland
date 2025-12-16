# RAKSHA Ireland - Push Notifications & Widgets Setup Guide

## Overview
This document provides comprehensive instructions for setting up push notifications and home screen widgets for both iOS and Android platforms.

---

## 🔔 Push Notifications Setup

### Features Implemented
- ✅ Cross-platform push notification support (iOS & Android)
- ✅ Deep linking to AlertHistory screen on notification tap
- ✅ Android notification channels with high priority for emergency alerts
- ✅ Badge counting for unread alerts
- ✅ Local confirmation notifications when SOS is sent
- ✅ Background notification handling

### Configuration Files Modified
1. **app.json** - Added deep link scheme `"scheme": "raksha"`
2. **App.js** - Configured deep linking in NavigationContainer
3. **HomeScreen.js** - Enhanced notification handlers and deep link support
4. **notificationService.js** - New centralized notification service

### Testing Push Notifications

#### On Development Build:
```bash
# Make sure your development build is running
cd mobile
npx expo start --dev-client

# The app will automatically register for push notifications on launch
```

#### Send Test Notification (iOS Simulator):
```bash
# Note: Push notifications don't work in iOS Simulator
# You MUST test on a physical iOS device
```

#### Send Test Notification (Android):
```bash
# On Android, you can test with ADB
adb shell am broadcast -a android.intent.action.BOOT_COMPLETED
```

#### Testing Flow:
1. Launch the app on a physical device
2. Grant notification permissions when prompted
3. Send an SOS alert from the app
4. You should see a local confirmation notification
5. Tap the notification bell icon (🔔) on HomeScreen to view AlertHistory
6. When another user sends an SOS, you'll receive a notification
7. Tap the notification - it should navigate to AlertHistory

### Notification Channels (Android)
The app creates a high-priority notification channel:
- **Channel ID**: `sos-alerts`
- **Name**: Emergency SOS Alerts
- **Importance**: MAX
- **Features**: 
  - Vibration pattern: [0, 250, 250, 250]
  - Sound: default
  - Light: red (#d32f2f)
  - Bypasses Do Not Disturb
  - Shows on lockscreen

### Deep Link URLs
- `raksha://sos` - Trigger SOS confirmation dialog
- `raksha://history` - Navigate to Alert History
- `raksha://alert/:alertId` - View specific alert details

---

## 📱 Home Screen Widgets

### iOS Widget Setup

#### Prerequisites
- Xcode 14.0 or later
- iOS 14.0+ device or simulator
- Active Apple Developer account (for physical device testing)

#### Setup Steps:

1. **Open Xcode Project**
   ```bash
   cd mobile/ios
   open mobile.xcworkspace
   ```

2. **Add Widget Extension Target**
   - In Xcode, click File → New → Target
   - Select "Widget Extension"
   - Product Name: `SOSWidget`
   - Bundle Identifier: `org.rakshaireland.mobile.SOSWidget`
   - Click "Finish"
   - When prompted "Activate SOSWidget scheme?", click "Activate"

3. **Replace Widget Code**
   - Delete the default `SOSWidget.swift` file Xcode created
   - Copy our `SOSWidget.swift` from the project structure
   - Ensure `Info.plist` is correctly configured

4. **Configure App Groups (Optional but Recommended)**
   - Select the main app target
   - Go to "Signing & Capabilities"
   - Click "+ Capability" → "App Groups"
   - Add group: `group.org.rakshaireland.mobile`
   - Repeat for the SOSWidget target

5. **Build and Run**
   - Select the SOSWidget scheme
   - Build and run on device/simulator
   - This will install the widget

6. **Add Widget to Home Screen**
   - Long press on home screen
   - Tap the "+" button in top left
   - Search for "Emergency SOS"
   - Select widget size (Small or Medium)
   - Tap "Add Widget"

#### Widget Behavior (iOS):
- Tapping the widget opens the app with URL: `raksha://sos`
- The app shows a confirmation dialog
- On confirmation, triggers the emergency SOS alert

### Android Widget Setup

#### Prerequisites
- Android Studio Arctic Fox or later
- Android 5.0 (API 21) or higher

#### Files Created:
```
android/app/src/main/
├── java/org/rakshaireland/mobile/
│   └── SOSWidgetProvider.kt
└── res/
    ├── layout/
    │   └── sos_widget.xml
    ├── drawable/
    │   ├── widget_background.xml
    │   └── ic_sos.xml
    ├── xml/
    │   └── sos_widget_info.xml
    └── values/
        └── strings.xml (updated)
```

#### Setup Steps:

1. **Verify Files Are in Place**
   ```bash
   cd mobile/android/app/src/main
   ls -la java/org/rakshaireland/mobile/SOSWidgetProvider.kt
   ls -la res/layout/sos_widget.xml
   ls -la res/drawable/widget_background.xml
   ls -la res/drawable/ic_sos.xml
   ls -la res/xml/sos_widget_info.xml
   ```

2. **Build the App**
   ```bash
   cd mobile
   npx expo run:android
   ```

3. **Add Widget to Home Screen**
   - Long press on home screen
   - Tap "Widgets"
   - Find "RAKSHA Ireland" or "Emergency SOS"
   - Drag widget to home screen

#### Widget Behavior (Android):
- Tapping the widget opens the app with Intent: `raksha://sos`
- Shows confirmation dialog
- On confirmation, triggers emergency SOS

### Widget Customization

#### Change Widget Colors:
**iOS** - Edit `SOSWidget.swift`:
```swift
LinearGradient(
    gradient: Gradient(colors: [
        Color(red: 0.82, green: 0.18, blue: 0.18),  // Start color
        Color(red: 0.95, green: 0.26, blue: 0.21)   // End color
    ]),
    startPoint: .topLeading,
    endPoint: .bottomTrailing
)
```

**Android** - Edit `widget_background.xml`:
```xml
<gradient
    android:angle="135"
    android:endColor="#F24236"    <!-- End color -->
    android:startColor="#D32F2F"  <!-- Start color -->
    android:type="linear" />
```

#### Change Widget Text:
**iOS** - Edit `SOSWidget.swift` line ~51:
```swift
Text("Emergency Alert")  // Change this text
```

**Android** - Edit `sos_widget.xml`:
```xml
<TextView
    android:text="Emergency Alert"  <!-- Change this text -->
    ...
/>
```

---

## 🧪 Testing Checklist

### Push Notifications
- [ ] App requests notification permissions on first launch
- [ ] Push token is registered with backend
- [ ] Sending SOS shows local confirmation notification
- [ ] Tapping bell icon (🔔) opens Alert History
- [ ] Receiving alert from another user shows notification
- [ ] Tapping received alert notification navigates to Alert History
- [ ] Badge count increments with new alerts
- [ ] Badge clears when viewing Alert History
- [ ] Notifications work when app is in background
- [ ] Notifications work when app is closed

### iOS Widget
- [ ] Widget appears in widget gallery
- [ ] Widget displays correctly in Small size
- [ ] Widget displays correctly in Medium size
- [ ] Tapping widget opens app
- [ ] App shows SOS confirmation dialog
- [ ] Confirming sends SOS alert
- [ ] Canceling closes dialog without sending

### Android Widget
- [ ] Widget appears in widget list
- [ ] Widget displays with correct colors and icon
- [ ] Widget is resizable
- [ ] Tapping widget opens app
- [ ] App shows SOS confirmation dialog
- [ ] Confirming sends SOS alert
- [ ] Widget works after device restart

---

## 🔧 Troubleshooting

### Notifications Not Working

#### iOS:
1. Check notification permissions: Settings → RAKSHA Ireland → Notifications
2. Ensure you're testing on a physical device (not simulator)
3. Check console for push token registration logs
4. Verify app.json has correct `scheme` configuration

#### Android:
1. Check notification permissions: Settings → Apps → RAKSHA Ireland → Notifications
2. Verify notification channel is created (check logcat)
3. Ensure AndroidManifest.xml has POST_NOTIFICATIONS permission
4. Check if battery optimization is disabled for the app

### Widget Not Appearing

#### iOS:
1. Ensure Widget Extension was properly added in Xcode
2. Check Bundle Identifier: `org.rakshaireland.mobile.SOSWidget`
3. Verify code signing is configured for both targets
4. Try rebuilding the app
5. Delete app and reinstall

#### Android:
1. Check if SOSWidgetProvider.kt is in correct package
2. Verify AndroidManifest.xml has widget receiver registered
3. Ensure all drawable resources exist
4. Check logcat for errors during widget creation
5. Try uninstalling and reinstalling the app

### Deep Links Not Working

1. **Check app.json**: Ensure `"scheme": "raksha"` is present
2. **Check App.js**: Verify NavigationContainer has linking config
3. **Test deep link manually**:
   ```bash
   # iOS
   xcrun simctl openurl booted raksha://sos
   
   # Android
   adb shell am start -W -a android.intent.action.VIEW -d "raksha://sos" org.rakshaireland.mobile
   ```
4. **Check logs**: Look for "Deep link received:" in console

---

## 📚 Additional Resources

### Expo Notifications
- [Expo Notifications Documentation](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [Push Notification Setup Guide](https://docs.expo.dev/push-notifications/overview/)

### iOS Widgets
- [Apple WidgetKit Documentation](https://developer.apple.com/documentation/widgetkit)
- [SwiftUI Widget Tutorial](https://developer.apple.com/tutorials/swiftui/creating-a-watchos-app)

### Android Widgets
- [Android App Widgets Documentation](https://developer.android.com/guide/topics/appwidgets/overview)
- [Widget Design Guidelines](https://developer.android.com/develop/ui/views/appwidgets)

### Deep Linking
- [React Navigation Deep Linking](https://reactnavigation.org/docs/deep-linking/)
- [Expo Linking Documentation](https://docs.expo.dev/versions/latest/sdk/linking/)

---

## 🚀 Deployment Notes

### Before Publishing to App Store / Play Store:

1. **Update Push Notification Credentials**
   - iOS: Upload APNs key in Expo dashboard
   - Android: Configure FCM credentials in Expo dashboard

2. **Test on Physical Devices**
   - Test all notification scenarios
   - Test widgets on different screen sizes
   - Test deep linking from various entry points

3. **Update Privacy Policies**
   - Mention push notification usage
   - Explain location tracking for emergency services

4. **App Store Screenshots**
   - Include widget in screenshots
   - Show notification examples

---

## 📝 Code Structure

```
mobile/
├── src/
│   ├── services/
│   │   └── notificationService.js     # Centralized notification logic
│   └── screens/
│       └── HomeScreen.js              # Deep link handler + SOS trigger
├── App.js                             # Deep linking configuration
├── app.json                           # Scheme configuration
├── ios/
│   └── SOSWidget/
│       ├── SOSWidget.swift            # iOS widget implementation
│       └── Info.plist                 # Widget configuration
└── android/
    └── app/src/main/
        ├── java/.../SOSWidgetProvider.kt  # Android widget provider
        ├── res/
        │   ├── layout/sos_widget.xml      # Widget layout
        │   ├── drawable/                   # Widget assets
        │   └── xml/sos_widget_info.xml    # Widget metadata
        └── AndroidManifest.xml            # Widget registration
```

---

## ✅ Summary

You now have a complete implementation of:
1. **Cross-platform push notifications** that navigate to Alert History
2. **iOS home screen widget** using WidgetKit and SwiftUI
3. **Android home screen widget** using AppWidget
4. **Deep linking** to handle widget taps and notification navigation
5. **High-priority notification channels** for emergency alerts

All components are ready for testing. Follow the testing checklist above to verify everything works correctly!
