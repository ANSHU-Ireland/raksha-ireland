# SOS Emergency Widget

## Overview
The Raksha Ireland app now includes a home screen widget that allows users to trigger emergency alerts directly from their device's home screen without opening the app.

## Features
- **Big Red SOS Button**: Prominent circular red button matching the in-app design
- **3-Second Hold Activation**: Prevents accidental triggers by requiring a 3-second press
- **Visual Feedback**: Shows "Hold 3s" instruction text
- **Direct Emergency Access**: Opens the app directly to the emergency screen when triggered

## How to Add the Widget

### Android
1. Long-press on your home screen
2. Tap "Widgets"
3. Scroll to find "Raksha Ireland"
4. Drag the "SOS Widget" to your desired location on the home screen
5. The widget will appear as a large red circular button with "SOS" text

## Usage
1. **To trigger emergency alert**: Tap and hold the widget button for 3 seconds
2. **Visual feedback**: You'll see a toast message indicating "Hold for 3 seconds to trigger SOS"
3. **Activation**: After 3 seconds, the app will open directly to the emergency screen
4. **Complete the alert**: Follow the in-app prompts to send your emergency location

## Technical Details

### Widget Size
- Minimum: 120dp x 120dp (2x2 cells)
- Optimal for visibility on home screen
- Non-resizable for consistent appearance

### Behavior
- **Short tap**: Opens the app to the emergency screen
- **3-second hold**: Shows activation feedback and opens emergency screen
- **Background operation**: No battery impact when idle
- **No accidental triggers**: Requires deliberate 3-second press

### Files Created
- `android/app/src/main/res/layout/sos_widget.xml` - Widget layout
- `android/app/src/main/res/drawable/widget_circle_background.xml` - Red circular background
- `android/app/src/main/res/xml/sos_widget_info.xml` - Widget configuration
- `android/app/src/main/kotlin/.../SOSWidgetProvider.kt` - Widget logic
- `lib/core/services/widget_service.dart` - Flutter-Android communication

## Safety Notes
- The widget provides quick access to emergency features
- Always ensure location services are enabled for accurate emergency alerts
- The 3-second hold prevents accidental activation
- Widget works even when app is not running (will launch app first)
