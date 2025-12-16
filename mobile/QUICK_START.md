# RAKSHA Ireland - Quick Start Guide

## 🚀 What Was Implemented

### 1. Push Notifications ✅
- **Cross-platform notification system** (iOS & Android)
- **Deep linking** to Alert History when notifications are tapped
- **High-priority Android notification channels** for emergency alerts
- **Local confirmation notifications** when SOS is sent
- **Badge counting** for unread alerts

### 2. Home Screen Widgets ✅
- **iOS Widget** (WidgetKit + SwiftUI)
- **Android Widget** (AppWidget)
- Both trigger SOS with confirmation dialog

---

## 📱 Quick Test Instructions

### Test Notifications:
1. Launch app on physical device
2. Grant notification permissions
3. Send an SOS alert
4. You should see: "🚨 SOS Alert Sent" notification
5. Tap the bell icon (🔔) on home screen → opens Alert History

### Test Widgets:

#### iOS:
1. Open Xcode: `cd mobile/ios && open mobile.xcworkspace`
2. Add Widget Extension target (File → New → Target → Widget Extension)
3. Name it `SOSWidget`, Bundle ID: `org.rakshaireland.mobile.SOSWidget`
4. Replace the generated code with our `SOSWidget.swift`
5. Build and run the widget scheme
6. Add widget to home screen
7. Tap widget → app opens with SOS dialog

#### Android:
1. Build app: `cd mobile && npx expo run:android`
2. Long press home screen → Widgets
3. Find "RAKSHA Ireland" or "Emergency SOS"
4. Drag to home screen
5. Tap widget → app opens with SOS dialog

---

## 🔗 Deep Link URLs

| URL | Action |
|-----|--------|
| `raksha://sos` | Show SOS confirmation dialog |
| `raksha://history` | Navigate to Alert History |
| `raksha://alert/:id` | View specific alert |

Test deep links manually:
```bash
# iOS Simulator
xcrun simctl openurl booted raksha://sos

# Android
adb shell am start -W -a android.intent.action.VIEW -d "raksha://sos" org.rakshaireland.mobile
```

---

## 📂 New Files Created

```
mobile/
├── src/services/
│   └── notificationService.js          ← Notification logic
├── ios/SOSWidget/
│   ├── SOSWidget.swift                 ← iOS widget
│   └── Info.plist                      ← Widget config
├── android/app/src/main/
│   ├── java/.../SOSWidgetProvider.kt   ← Android widget
│   ├── res/layout/sos_widget.xml       ← Widget UI
│   ├── res/drawable/
│   │   ├── widget_background.xml       ← Red gradient
│   │   └── ic_sos.xml                  ← Warning icon
│   └── res/xml/sos_widget_info.xml     ← Widget metadata
└── NOTIFICATIONS_AND_WIDGETS_SETUP.md  ← Full documentation
```

---

## 🔧 Files Modified

| File | Changes |
|------|---------|
| `app.json` | Added `"scheme": "raksha"` for deep linking |
| `App.js` | Added linking config to NavigationContainer |
| `HomeScreen.js` | Added deep link handler + notification navigation |
| `AndroidManifest.xml` | Added widget receiver + raksha:// scheme |
| `strings.xml` | Added widget description string |

---

## ⚠️ Important Notes

### For iOS Widget:
- **MUST be configured in Xcode** (can't be done through Expo alone)
- Requires physical device for push notifications (simulator doesn't support)
- Bundle ID: `org.rakshaireland.mobile.SOSWidget`

### For Android Widget:
- **Already fully configured** in the codebase
- Will appear automatically after building the app
- Widget name: "Emergency SOS"

### For Push Notifications:
- Android requires physical device OR emulator with Google Play Services
- iOS requires physical device (simulator doesn't support push)
- expo-device package installed for device detection

---

## 🎯 Next Steps

1. **iOS Widget Setup** (requires Xcode):
   - Follow "iOS Widget Setup" in `NOTIFICATIONS_AND_WIDGETS_SETUP.md`
   - Add Widget Extension target
   - Configure signing
   - Build and test

2. **Test Notifications**:
   - Run app on physical device
   - Send SOS
   - Verify notification appears
   - Tap notification → should open Alert History

3. **Test Widgets**:
   - Add widget to home screen
   - Tap widget
   - Confirm SOS dialog shows
   - Verify SOS sends successfully

4. **Production Setup** (before publishing):
   - Configure APNs key (iOS) in Expo dashboard
   - Configure FCM credentials (Android) in Expo dashboard
   - Test all scenarios on physical devices
   - Update app store screenshots

---

## 🆘 Troubleshooting

**Notifications not working?**
- Check permissions: Settings → App → Notifications
- Verify physical device (not simulator)
- Check console logs for push token

**Widget not appearing?**
- iOS: Ensure Widget Extension is added in Xcode
- Android: Rebuild app, check AndroidManifest.xml
- Try deleting and reinstalling app

**Deep links not working?**
- Verify `app.json` has `"scheme": "raksha"`
- Check App.js linking configuration
- Test with manual deep link commands above

---

## 📖 Full Documentation

See `NOTIFICATIONS_AND_WIDGETS_SETUP.md` for:
- Detailed setup instructions
- Configuration options
- Customization guide
- Complete testing checklist
- Deployment notes
- API references

---

**Status**: ✅ All code implemented and ready for testing!
