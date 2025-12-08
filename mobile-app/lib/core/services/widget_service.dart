import 'package:flutter/services.dart';

/// Service to handle widget interactions and callbacks
class WidgetService {
  static const platform = MethodChannel('com.areiva.raksha_ireland/widget');
  
  /// Initialize widget listeners
  static void initialize(Function(bool triggerSos) onEmergencyFromWidget) {
    platform.setMethodCallHandler((call) async {
      if (call.method == 'openEmergency') {
        final fromWidget = call.arguments['fromWidget'] ?? false;
        final triggerSos = call.arguments['triggerSos'] ?? false;
        if (fromWidget) {
          onEmergencyFromWidget(triggerSos);
        }
      }
    });
  }
  
  /// Update widget data
  static Future<void> updateWidget() async {
    try {
      await platform.invokeMethod('updateWidget');
    } catch (e) {
      print('Error updating widget: $e');
    }
  }
}
