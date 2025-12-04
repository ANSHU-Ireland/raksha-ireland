import 'package:flutter/foundation.dart';
import '../../../core/services/location_service.dart';
import '../../../core/services/notification_service.dart';
import 'dart:async';

/// Emergency alert model
class EmergencyAlert {
  final String id;
  final String userId;
  final LocationData location;
  final String message;
  final DateTime timestamp;
  final int radiusMeters;
  final EmergencyStatus status;
  final int responderCount;
  
  EmergencyAlert({
    required this.id,
    required this.userId,
    required this.location,
    required this.message,
    required this.timestamp,
    this.radiusMeters = 3000,
    this.status = EmergencyStatus.active,
    this.responderCount = 0,
  });
  
  /// Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'userId': userId,
      'location': location.toJson(),
      'message': message,
      'timestamp': timestamp.toIso8601String(),
      'radiusMeters': radiusMeters,
      'status': status.name,
      'responderCount': responderCount,
    };
  }
  
  /// Create from JSON
  factory EmergencyAlert.fromJson(Map<String, dynamic> json) {
    return EmergencyAlert(
      id: json['id'],
      userId: json['userId'],
      location: LocationData.fromJson(json['location']),
      message: json['message'],
      timestamp: DateTime.parse(json['timestamp']),
      radiusMeters: json['radiusMeters'] ?? 3000,
      status: EmergencyStatus.values.firstWhere(
        (s) => s.name == json['status'],
        orElse: () => EmergencyStatus.active,
      ),
      responderCount: json['responderCount'] ?? 0,
    );
  }
  
  /// Create a copy with updated fields
  EmergencyAlert copyWith({
    String? id,
    String? userId,
    LocationData? location,
    String? message,
    DateTime? timestamp,
    int? radiusMeters,
    EmergencyStatus? status,
    int? responderCount,
  }) {
    return EmergencyAlert(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      location: location ?? this.location,
      message: message ?? this.message,
      timestamp: timestamp ?? this.timestamp,
      radiusMeters: radiusMeters ?? this.radiusMeters,
      status: status ?? this.status,
      responderCount: responderCount ?? this.responderCount,
    );
  }
}

/// Emergency status enumeration
enum EmergencyStatus {
  active,
  resolved,
  cancelled,
  expired,
}

/// SOS button state enumeration
enum SOSButtonState {
  idle,
  pressed,
  sending,
  sent,
  cooldown,
}

/// State management for emergency features
class EmergencyProvider extends ChangeNotifier {
  final LocationService _locationService;
  final NotificationService _notificationService;
  
  // SOS State
  SOSButtonState _sosButtonState = SOSButtonState.idle;
  EmergencyAlert? _currentEmergencyAlert;
  LocationData? _currentLocation;
  bool _isLocationEnabled = false;
  
  // Nearby alerts
  List<EmergencyAlert> _nearbyAlerts = [];
  
  // Cooldown timer
  Timer? _cooldownTimer;
  int _cooldownSeconds = 0;
  
  // Loading and error states
  bool _isLoading = false;
  String? _errorMessage;
  
  EmergencyProvider({
    required LocationService locationService,
    required NotificationService notificationService,
  }) : _locationService = locationService,
       _notificationService = notificationService {
    _initializeLocationTracking();
  }
  
  // Getters
  SOSButtonState get sosButtonState => _sosButtonState;
  EmergencyAlert? get currentEmergencyAlert => _currentEmergencyAlert;
  LocationData? get currentLocation => _currentLocation;
  bool get isLocationEnabled => _isLocationEnabled;
  List<EmergencyAlert> get nearbyAlerts => List.unmodifiable(_nearbyAlerts);
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  int get cooldownSeconds => _cooldownSeconds;
  
  /// Initialize location tracking
  Future<void> _initializeLocationTracking() async {
    try {
      _isLocationEnabled = await _locationService.hasLocationPermission();
      
      if (_isLocationEnabled) {
        _currentLocation = await _locationService.getCurrentLocation();
        
        if (kDebugMode) {
          print('Location initialized: $_currentLocation');
        }
      }
      
      notifyListeners();
    } catch (e) {
      if (kDebugMode) {
        print('Error initializing location: $e');
      }
    }
  }
  
  /// Set loading state
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }
  
  /// Set error message
  void _setError(String? error) {
    _errorMessage = error;
    notifyListeners();
  }
  
  /// Clear error message
  void clearError() {
    _errorMessage = null;
    notifyListeners();
  }
  
  /// Update SOS button state
  void _updateSOSButtonState(SOSButtonState state) {
    _sosButtonState = state;
    notifyListeners();
    
    if (kDebugMode) {
      print('SOS button state: ${state.name}');
    }
  }
  
  /// Request location permissions
  Future<bool> requestLocationPermission() async {
    try {
      _setLoading(true);
      
      final permission = await _locationService.requestLocationPermission();
      _isLocationEnabled = await _locationService.hasLocationPermission();
      
      if (_isLocationEnabled) {
        _currentLocation = await _locationService.getCurrentLocation();
      }
      
      return _isLocationEnabled;
      
    } catch (e) {
      if (kDebugMode) {
        print('Error requesting location permission: $e');
      }
      _setError('Failed to request location permission');
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  /// Update current location
  Future<void> updateLocation() async {
    try {
      if (!_isLocationEnabled) {
        throw Exception('Location permission not granted');
      }
      
      _currentLocation = await _locationService.getCurrentLocation();
      notifyListeners();
      
      if (kDebugMode) {
        print('Location updated: $_currentLocation');
      }
      
    } catch (e) {
      if (kDebugMode) {
        print('Error updating location: $e');
      }
      _setError('Failed to get current location');
    }
  }
  
  /// Trigger emergency SOS alert
  Future<bool> triggerSOS({String? customMessage}) async {
    try {
      // Check if already in cooldown
      if (_sosButtonState == SOSButtonState.cooldown) {
        _setError('Please wait ${_cooldownSeconds}s before sending another alert');
        return false;
      }
      
      // Check location permission
      if (!_isLocationEnabled) {
        final hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          _setError('Location permission is required for emergency alerts');
          return false;
        }
      }
      
      _updateSOSButtonState(SOSButtonState.pressed);
      _setError(null);
      
      // Get current location
      await updateLocation();
      
      if (_currentLocation == null) {
        _setError('Unable to get your current location');
        _updateSOSButtonState(SOSButtonState.idle);
        return false;
      }
      
      _updateSOSButtonState(SOSButtonState.sending);
      
      // Create emergency alert
      final alert = EmergencyAlert(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        userId: 'current_user_id', // Would get from auth provider
        location: _currentLocation!,
        message: customMessage ?? 'Emergency assistance needed',
        timestamp: DateTime.now(),
      );
      
      // Send alert to backend (mock implementation)
      await _sendEmergencyAlert(alert);
      
      _currentEmergencyAlert = alert;
      _updateSOSButtonState(SOSButtonState.sent);
      
      // Start cooldown timer (60 seconds)
      _startCooldownTimer();
      
      if (kDebugMode) {
        print('Emergency alert sent: ${alert.id}');
      }
      
      return true;
      
    } catch (e) {
      if (kDebugMode) {
        print('Error triggering SOS: $e');
      }
      _setError('Failed to send emergency alert: $e');
      _updateSOSButtonState(SOSButtonState.idle);
      return false;
    }
  }
  
  /// Send emergency alert to backend (mock implementation)
  Future<void> _sendEmergencyAlert(EmergencyAlert alert) async {
    // Simulate API call delay
    await Future.delayed(const Duration(seconds: 2));
    
    // In real implementation, this would:
    // 1. Send alert data to backend API
    // 2. Backend finds users within 3km radius
    // 3. Backend sends push notifications to nearby users
    // 4. Return list of notified users
    
    // For now, simulate finding nearby users
    final nearbyUsers = await _locationService.getUsersWithinRadius(alert.location);
    
    if (kDebugMode) {
      print('Alert sent to ${nearbyUsers.length} nearby users');
    }
  }
  
  /// Start cooldown timer
  void _startCooldownTimer() {
    _cooldownSeconds = 60;
    _updateSOSButtonState(SOSButtonState.cooldown);
    
    _cooldownTimer?.cancel();
    _cooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      _cooldownSeconds--;
      notifyListeners();
      
      if (_cooldownSeconds <= 0) {
        timer.cancel();
        _updateSOSButtonState(SOSButtonState.idle);
      }
    });
  }
  
  /// Cancel current emergency alert
  Future<bool> cancelEmergencyAlert() async {
    try {
      if (_currentEmergencyAlert == null) {
        return false;
      }
      
      _setLoading(true);
      
      // Update alert status to cancelled
      _currentEmergencyAlert = _currentEmergencyAlert!.copyWith(
        status: EmergencyStatus.cancelled,
      );
      
      // Send cancellation to backend (mock)
      await Future.delayed(const Duration(seconds: 1));
      
      if (kDebugMode) {
        print('Emergency alert cancelled: ${_currentEmergencyAlert!.id}');
      }
      
      return true;
      
    } catch (e) {
      if (kDebugMode) {
        print('Error cancelling alert: $e');
      }
      _setError('Failed to cancel emergency alert');
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  /// Mark emergency as resolved
  Future<bool> resolveEmergencyAlert() async {
    try {
      if (_currentEmergencyAlert == null) {
        return false;
      }
      
      _setLoading(true);
      
      // Update alert status to resolved
      _currentEmergencyAlert = _currentEmergencyAlert!.copyWith(
        status: EmergencyStatus.resolved,
      );
      
      // Send resolution to backend (mock)
      await Future.delayed(const Duration(seconds: 1));
      
      if (kDebugMode) {
        print('Emergency alert resolved: ${_currentEmergencyAlert!.id}');
      }
      
      return true;
      
    } catch (e) {
      if (kDebugMode) {
        print('Error resolving alert: $e');
      }
      _setError('Failed to resolve emergency alert');
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  /// Load nearby emergency alerts
  Future<void> loadNearbyAlerts() async {
    try {
      if (_currentLocation == null) {
        await updateLocation();
      }
      
      if (_currentLocation == null) {
        _setError('Location required to find nearby alerts');
        return;
      }
      
      _setLoading(true);
      
      // Fetch nearby alerts from backend (mock implementation)
      await Future.delayed(const Duration(seconds: 1));
      
      // Mock nearby alerts
      _nearbyAlerts = [
        // Would be populated from API response
      ];
      
      if (kDebugMode) {
        print('Loaded ${_nearbyAlerts.length} nearby alerts');
      }
      
    } catch (e) {
      if (kDebugMode) {
        print('Error loading nearby alerts: $e');
      }
      _setError('Failed to load nearby alerts');
    } finally {
      _setLoading(false);
    }
  }
  
  /// Respond to an emergency alert
  Future<bool> respondToAlert(String alertId) async {
    try {
      _setLoading(true);
      
      // Send response to backend (mock)
      await Future.delayed(const Duration(seconds: 1));
      
      // Update local alert responder count
      final alertIndex = _nearbyAlerts.indexWhere((alert) => alert.id == alertId);
      if (alertIndex != -1) {
        _nearbyAlerts[alertIndex] = _nearbyAlerts[alertIndex].copyWith(
          responderCount: _nearbyAlerts[alertIndex].responderCount + 1,
        );
        notifyListeners();
      }
      
      if (kDebugMode) {
        print('Responded to alert: $alertId');
      }
      
      return true;
      
    } catch (e) {
      if (kDebugMode) {
        print('Error responding to alert: $e');
      }
      _setError('Failed to respond to alert');
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  @override
  void dispose() {
    _cooldownTimer?.cancel();
    super.dispose();
  }
}