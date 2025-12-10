# iOS Setup Guide for Raksha Ireland

## ✅ Completed Steps

1. **iOS Configuration Added** - Added iOS-specific settings to `app.json`:
   - Bundle identifier: `org.rakshaireland.mobile`
   - Location permissions (foreground and background)
   - Push notification permissions
   - Background modes enabled

2. **Dependencies Installed** - All npm packages and CocoaPods are installed

3. **Native iOS Project Generated** - Xcode workspace is ready at:
   - `/Users/areiva/Desktop/Raksha/raksha-ireland/mobile/ios/mobile.xcworkspace`

## 📱 Next Steps in Xcode

### 1. Configure Code Signing
1. In Xcode, select the **mobile** project in the navigator
2. Select the **mobile** target
3. Go to **Signing & Capabilities** tab
4. Check **Automatically manage signing**
5. Select your **Team** from the dropdown (your Apple Developer account)
6. Xcode will automatically create a provisioning profile

### 2. Configure Bundle Identifier (if needed)
- The bundle ID is set to: `org.rakshaireland.mobile`
- If this is taken, change it to something unique like: `org.rakshaireland.mobile.yourname`

### 3. Run on Simulator
1. Select a simulator from the device dropdown (e.g., iPhone 16 Pro)
2. Click the **Play** button (▶️) or press `Cmd + R`
3. The app will build and launch in the simulator

### 4. Run on Physical iPhone
1. Connect your iPhone via USB
2. Trust your Mac on the iPhone if prompted
3. Select your iPhone from the device dropdown
4. Click the **Play** button (▶️)
5. On first run, go to iPhone Settings > General > VPN & Device Management
6. Trust your developer certificate
7. Relaunch the app

## 🔧 Alternative: Run via CLI

You can also run the app without opening Xcode:

```bash
# From the mobile directory
cd /Users/areiva/Desktop/Raksha/raksha-ireland/mobile

# Run on iOS simulator
npx expo run:ios

# Run on specific simulator
npx expo run:ios --simulator="iPhone 16 Pro"

# Run on connected device
npx expo run:ios --device
```

## 📋 iOS Features Configured

- ✅ Location Services (foreground & background)
- ✅ Push Notifications
- ✅ Background Location Updates
- ✅ Emergency SOS functionality
- ✅ H3 geospatial indexing
- ✅ All Expo modules (Location, Notifications, Task Manager)

## 🔍 Testing Checklist

1. **Permissions**: Test location and notification permission prompts
2. **SOS Button**: Test 3-second hold emergency alert
3. **Location Tracking**: Verify location is captured correctly
4. **Background Mode**: Test app behavior when backgrounded
5. **Push Notifications**: Receive emergency alerts

## 📱 Deployment

For App Store deployment:
1. Join the Apple Developer Program ($99/year)
2. Configure proper provisioning profiles
3. Build and archive in Xcode
4. Submit via App Store Connect

## ⚙️ Environment Configuration

Don't forget to create `.env` file in the mobile directory:

```bash
cd /Users/areiva/Desktop/Raksha/raksha-ireland/mobile
cp .env.example .env
# Edit .env with your API endpoints
```

## 🆘 Troubleshooting

**Build fails in Xcode:**
- Clean build folder: Product > Clean Build Folder (Cmd + Shift + K)
- Delete derived data: Xcode > Settings > Locations > Derived Data > Delete
- Reinstall pods: `cd ios && pod install`

**CocoaPods issues:**
```bash
cd ios
pod deintegrate
pod install
```

**App crashes on launch:**
- Check Console logs in Xcode
- Verify all environment variables are set
- Check API endpoint connectivity

## 📚 Resources

- [Expo iOS Guide](https://docs.expo.dev/workflow/ios/)
- [React Native iOS Setup](https://reactnative.dev/docs/running-on-device)
- [Apple Developer Documentation](https://developer.apple.com/documentation/)
