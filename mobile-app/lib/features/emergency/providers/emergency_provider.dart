import 'package:flutter/foundation.dart';
import '../../../core/services/location_service.dart';
import '../../../core/services/notification_service.dart';
import '../../../core/config/app_config.dart';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:geolocator/geolocator.dart';

/// Emergency alert model
class EmergencyAlert {
  final String id;
  final String userId;
  final LocationData location;
  final String message;
  final DateTime timestamp;
  final int radiusMeters;
  final EmergencyStatus status;
  final String? userName;
  final String? userEmail;
  final String? userPhone;
  final String? userProfilePicUrl;
  
  EmergencyAlert({
    required this.id,
    required this.userId,
    required this.location,
    required this.message,
    required this.timestamp,
    this.radiusMeters = 3000,
    this.status = EmergencyStatus.active,
    this.userName,
    this.userEmail,
    this.userPhone,
    this.userProfilePicUrl,
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
      'userName': userName,
      'userEmail': userEmail,
      'userPhone': userPhone,
      'userProfilePicUrl': userProfilePicUrl,
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
      userName: json['userName'],
      userEmail: json['userEmail'],
      userPhone: json['userPhone'],
      userProfilePicUrl: json['userProfilePicUrl'],
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
    String? userName,
    String? userEmail,
    String? userPhone,
    String? userProfilePicUrl,
  }) {
    return EmergencyAlert(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      location: location ?? this.location,
      message: message ?? this.message,
      timestamp: timestamp ?? this.timestamp,
      radiusMeters: radiusMeters ?? this.radiusMeters,
      status: status ?? this.status,
      userName: userName ?? this.userName,
      userEmail: userEmail ?? this.userEmail,
      userPhone: userPhone ?? this.userPhone,
      userProfilePicUrl: userProfilePicUrl ?? this.userProfilePicUrl,
    );
  }
}

/// Emergency status enumeration
enum EmergencyStatus {
  active,
  resolved,
  cancelled,
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
      
      // Send location update to backend
      if (_currentLocation != null) {
        await _sendLocationToBackend(_currentLocation!);
      }
      
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

  /// Send location update to backend
  Future<void> _sendLocationToBackend(LocationData location) async {
    try {
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) return;

      final token = await user.getIdToken();
      if (token == null) return;

      final response = await http.put(
        Uri.parse('${AppConfig.apiBaseUrl}/users/location'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'latitude': location.latitude,
          'longitude': location.longitude,
        }),
      );

      if (kDebugMode) {
        print('Location sent to backend: ${response.statusCode}');
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error sending location to backend: $e');
      }
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
      
      // Create temporary alert for sending
      final tempAlert = EmergencyAlert(
        id: 'temp', // This will be replaced by server ID
        userId: 'current_user_id', // Would get from auth provider
        location: _currentLocation!,
        message: customMessage ?? 'Emergency assistance needed',
        timestamp: DateTime.now(),
      );
      
      // Send alert to backend and get server alert with real ID
      final serverAlert = await _sendEmergencyAlert(tempAlert);
      
      if (serverAlert == null) {
        _setError('Failed to send emergency alert to server');
        _updateSOSButtonState(SOSButtonState.idle);
        return false;
      }
      
      // Use server alert with REAL UUID
      _currentEmergencyAlert = serverAlert;
      _updateSOSButtonState(SOSButtonState.sent);
      
      // Start cooldown timer (60 seconds)
      _startCooldownTimer();
      
      if (kDebugMode) {
        print('✅ Emergency alert sent successfully!');
        print('📋 Server Alert ID: ${serverAlert.id}');
        print('📍 Location: ${serverAlert.location.latitude}, ${serverAlert.location.longitude}');
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
  
  /// Send emergency alert to backend
  Future<EmergencyAlert?> _sendEmergencyAlert(EmergencyAlert alert) async {
    try {
      // Import required packages at the top of the file:
      // import 'package:http/http.dart' as http;
      // import 'dart:convert';
      // import 'package:firebase_auth/firebase_auth.dart';
      
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        throw Exception('User not authenticated');
      }

      final token = await user.getIdToken();
      
      // Send alert to backend API
      final response = await http.post(
        Uri.parse('${AppConfig.apiBaseUrl}/emergency/alerts'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: json.encode({
          'latitude': alert.location.latitude,
          'longitude': alert.location.longitude,
          'accuracy': alert.location.accuracy,
          'address': alert.location.address,
          'message': alert.message,
        }),
      );

      if (response.statusCode == 201) {
        final data = json.decode(response.body);
        final serverAlert = data['alert'];
        
        if (kDebugMode) {
          print('✅ Alert saved to backend with ID: ${serverAlert['id']}');
          print('📍 Location: (${serverAlert['latitude']}, ${serverAlert['longitude']})');
        }
        
        // Return EmergencyAlert with REAL server ID
        return EmergencyAlert(
          id: serverAlert['id'],                    // ✅ USE SERVER UUID
          userId: serverAlert['user_id'],
          location: alert.location,                  // Server doesn't return full location, reuse
          message: serverAlert['message'],
          timestamp: DateTime.parse(serverAlert['created_at']),
          status: _parseStatus(serverAlert['status']),
        );
      } else {
        throw Exception('Failed to save alert: ${response.statusCode}');
      }
      
    } catch (e) {
      if (kDebugMode) {
        print('❌ Error sending alert to backend: $e');
      }
      return null; // Return null on failure instead of swallowing error
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
        if (kDebugMode) {
          print('❌ Cannot cancel: No current emergency alert');
        }
        return false;
      }
      
      if (kDebugMode) {
        print('🔄 Attempting to cancel alert ID: ${_currentEmergencyAlert!.id}');
        print('   Alert status: ${_currentEmergencyAlert!.status}');
      }
      
      _setLoading(true);
      
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        if (kDebugMode) {
          print('❌ User not authenticated');
        }
        return false;
      }

      final token = await user.getIdToken();
      if (token == null) {
        if (kDebugMode) {
          print('❌ Failed to get authentication token');
        }
        return false;
      }

      final url = '${AppConfig.apiBaseUrl}/emergency/alerts/${_currentEmergencyAlert!.id}';
      if (kDebugMode) {
        print('📡 PATCH request to: $url');
      }

      final response = await http.patch(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'status': 'cancelled',
        }),
      );

      if (kDebugMode) {
        print('📥 Response status: ${response.statusCode}');
        print('📥 Response body: ${response.body}');
      }

      if (response.statusCode == 200) {
        // Update alert status to cancelled locally and notify
        _currentEmergencyAlert = _currentEmergencyAlert!.copyWith(
          status: EmergencyStatus.cancelled,
        );
        _updateSOSButtonState(SOSButtonState.idle);
        notifyListeners();
      
        if (kDebugMode) {
          print('✅ Emergency alert cancelled successfully: ${_currentEmergencyAlert!.id}');
        }
        
        return true;
      } else {
        if (kDebugMode) {
          print('❌ Failed to cancel alert: ${response.statusCode}');
          print('   Response: ${response.body}');
        }
        return false;
      }
      
    } catch (e) {
      if (kDebugMode) {
        print('❌ Error cancelling alert: $e');
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
        if (kDebugMode) {
          print('❌ Cannot resolve: No current emergency alert');
        }
        return false;
      }
      
      if (kDebugMode) {
        print('🔄 Attempting to resolve alert ID: ${_currentEmergencyAlert!.id}');
        print('   Alert status: ${_currentEmergencyAlert!.status}');
      }
      
      _setLoading(true);
      
      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        if (kDebugMode) {
          print('❌ User not authenticated');
        }
        return false;
      }

      final token = await user.getIdToken();
      if (token == null) {
        if (kDebugMode) {
          print('❌ Failed to get authentication token');
        }
        return false;
      }

      final url = '${AppConfig.apiBaseUrl}/emergency/alerts/${_currentEmergencyAlert!.id}';
      if (kDebugMode) {
        print('📡 PATCH request to: $url');
      }

      final response = await http.patch(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'status': 'resolved',
        }),
      );

      if (kDebugMode) {
        print('📥 Response status: ${response.statusCode}');
        print('📥 Response body: ${response.body}');
      }

      if (response.statusCode == 200) {
        // Update alert status to resolved
        _currentEmergencyAlert = _currentEmergencyAlert!.copyWith(
          status: EmergencyStatus.resolved,
        );
        _updateSOSButtonState(SOSButtonState.idle);
        notifyListeners();
        
        if (kDebugMode) {
          print('✅ Emergency alert resolved successfully: ${_currentEmergencyAlert!.id}');
        }
        
        return true;
      } else {
        if (kDebugMode) {
          print('❌ Failed to resolve alert: ${response.statusCode}');
          print('   Response: ${response.body}');
        }
        return false;
      }
      
    } catch (e) {
      if (kDebugMode) {
        print('❌ Error resolving alert: $e');
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
      _setLoading(true);
      _setError(null); // Clear any previous errors

      final user = FirebaseAuth.instance.currentUser;
      if (user == null) {
        if (kDebugMode) {
          print('❌ User not authenticated for nearby alerts');
        }
        _nearbyAlerts = [];
        return;
      }

      final token = await user.getIdToken();
      if (token == null) {
        if (kDebugMode) {
          print('❌ Failed to get authentication token for nearby alerts');
        }
        _nearbyAlerts = [];
        return;
      }

      if (kDebugMode) {
        print('📡 Loading nearby alerts...');
      }

      final response = await http.get(
        Uri.parse('${AppConfig.apiBaseUrl}/emergency/alerts?type=nearby'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (kDebugMode) {
        print('📥 Nearby alerts response: ${response.statusCode}');
      }

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        final alertsList = data['alerts'] as List;
        
        _nearbyAlerts = alertsList.map((json) {
          return EmergencyAlert(
            id: json['id'],
            userId: json['user_id'],
            location: LocationData(
              latitude: double.parse(json['latitude'].toString()),
              longitude: double.parse(json['longitude'].toString()),
              accuracy: 10.0,
              timestamp: DateTime.now(),
            ),
            message: json['message'] ?? 'Emergency assistance needed',
            timestamp: DateTime.parse(json['created_at']),
            status: _parseStatus(json['status']),
            userName: json['user_name'],
            userEmail: json['email'],
            userPhone: json['phone_number'],
            userProfilePicUrl: json['profile_pic_url'],
          );
        }).toList();
        
        if (kDebugMode) {
          print('✅ Loaded ${_nearbyAlerts.length} nearby alerts');
        }
      } else {
        if (kDebugMode) {
          print('❌ Failed to load nearby alerts: ${response.statusCode}');
          print('   Response: ${response.body}');
        }
        // Keep existing alerts on error, don't clear them
        if (kDebugMode) {
          print('⚠️ Keeping ${_nearbyAlerts.length} cached alerts');
        }
      }
      
    } catch (e) {
      if (kDebugMode) {
        print('❌ Error loading nearby alerts: $e');
        print('⚠️ Keeping ${_nearbyAlerts.length} cached alerts');
      }
      // Don't clear alerts on error, just keep cached ones
    } finally {
      _setLoading(false);
    }
  }

  /// Parse status string to enum
  EmergencyStatus _parseStatus(String? status) {
    switch (status?.toLowerCase()) {
      case 'active':
        return EmergencyStatus.active;
      case 'resolved':
        return EmergencyStatus.resolved;
      case 'cancelled':
        return EmergencyStatus.cancelled;
      default:
        return EmergencyStatus.active;
    }
  }
  
  @override
  void dispose() {
    _cooldownTimer?.cancel();
    super.dispose();
  }
}