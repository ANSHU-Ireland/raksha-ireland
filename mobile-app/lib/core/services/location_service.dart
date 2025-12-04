import 'package:geolocator/geolocator.dart';
import 'package:geocoding/geocoding.dart';
import 'package:flutter/foundation.dart';

/// Model for location data
class LocationData {
  final double latitude;
  final double longitude;
  final double accuracy;
  final DateTime timestamp;
  final String? address;
  
  LocationData({
    required this.latitude,
    required this.longitude,
    required this.accuracy,
    required this.timestamp,
    this.address,
  });
  
  /// Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'latitude': latitude,
      'longitude': longitude,
      'accuracy': accuracy,
      'timestamp': timestamp.toIso8601String(),
      'address': address,
    };
  }
  
  /// Create from JSON
  factory LocationData.fromJson(Map<String, dynamic> json) {
    return LocationData(
      latitude: json['latitude']?.toDouble() ?? 0.0,
      longitude: json['longitude']?.toDouble() ?? 0.0,
      accuracy: json['accuracy']?.toDouble() ?? 0.0,
      timestamp: DateTime.parse(json['timestamp']),
      address: json['address'],
    );
  }
  
  @override
  String toString() {
    return 'LocationData(lat: $latitude, lng: $longitude, accuracy: ${accuracy}m)';
  }
}

/// Service for handling location operations
class LocationService {
  static const double _emergencyRadius = 3000; // 3km in meters
  
  /// Check if location services are enabled
  Future<bool> isLocationServiceEnabled() async {
    return await Geolocator.isLocationServiceEnabled();
  }
  
  /// Check current location permission status
  Future<LocationPermission> checkLocationPermission() async {
    return await Geolocator.checkPermission();
  }
  
  /// Request location permissions
  Future<LocationPermission> requestLocationPermission() async {
    LocationPermission permission = await Geolocator.checkPermission();
    
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }
    
    return permission;
  }
  
  /// Check if location permissions are granted
  Future<bool> hasLocationPermission() async {
    final permission = await checkLocationPermission();
    return permission == LocationPermission.always || 
           permission == LocationPermission.whileInUse;
  }
  
  /// Get current location with high accuracy
  Future<LocationData?> getCurrentLocation() async {
    try {
      // Check if location services are enabled
      if (!await isLocationServiceEnabled()) {
        if (kDebugMode) {
          print('Location services are disabled');
        }
        return null;
      }
      
      // Check/request permissions
      if (!await hasLocationPermission()) {
        final permission = await requestLocationPermission();
        if (permission == LocationPermission.denied || 
            permission == LocationPermission.deniedForever) {
          if (kDebugMode) {
            print('Location permission denied');
          }
          return null;
        }
      }
      
      // Get current position with high accuracy
      const locationSettings = LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 10, // Only update if moved 10 meters
        timeLimit: Duration(seconds: 30), // Timeout after 30 seconds
      );
      
      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
        timeLimit: const Duration(seconds: 30),
      );
      
      // Get address (optional)
      String? address;
      try {
        final placemarks = await placemarkFromCoordinates(
          position.latitude,
          position.longitude,
        );
        if (placemarks.isNotEmpty) {
          final placemark = placemarks.first;
          address = '${placemark.street}, ${placemark.locality}, ${placemark.country}';
        }
      } catch (e) {
        if (kDebugMode) {
          print('Error getting address: $e');
        }
      }
      
      return LocationData(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        timestamp: DateTime.now(),
        address: address,
      );
      
    } catch (e) {
      if (kDebugMode) {
        print('Error getting current location: $e');
      }
      return null;
    }
  }
  
  /// Calculate distance between two points using Haversine formula
  double calculateDistance(
    double lat1, double lon1,
    double lat2, double lon2,
  ) {
    return Geolocator.distanceBetween(lat1, lon1, lat2, lon2);
  }
  
  /// Check if a location is within emergency broadcast radius (3km)
  bool isWithinEmergencyRadius(
    double userLat, double userLon,
    double emergencyLat, double emergencyLon,
  ) {
    final distance = calculateDistance(userLat, userLon, emergencyLat, emergencyLon);
    return distance <= _emergencyRadius;
  }
  
  /// Get users within 3km radius (mock implementation)
  /// In real implementation, this would call the backend API
  Future<List<String>> getUsersWithinRadius(LocationData location) async {
    // This is a mock implementation
    // In the real app, this would make an API call to the backend
    // which would query the database for verified users within 3km
    
    if (kDebugMode) {
      print('Finding users within ${_emergencyRadius}m of ${location}');
    }
    
    // Mock delay for API call
    await Future.delayed(const Duration(seconds: 1));
    
    // Return mock user IDs
    return [
      'user_id_1',
      'user_id_2', 
      'user_id_3',
    ];
  }
  
  /// Start location updates for emergency tracking
  Stream<LocationData> getLocationStream() async* {
    const locationSettings = LocationSettings(
      accuracy: LocationAccuracy.high,
      distanceFilter: 5, // Update every 5 meters
      timeLimit: Duration(minutes: 10), // Maximum tracking time
    );
    
    await for (final position in Geolocator.getPositionStream()) {
      yield LocationData(
        latitude: position.latitude,
        longitude: position.longitude,
        accuracy: position.accuracy,
        timestamp: DateTime.now(),
      );
    }
  }
  
  /// Format location for display
  String formatLocationForDisplay(LocationData location) {
    if (location.address != null) {
      return location.address!;
    }
    
    return '${location.latitude.toStringAsFixed(6)}, ${location.longitude.toStringAsFixed(6)}';
  }
  
  /// Get approximate address from coordinates
  Future<String?> getAddressFromCoordinates(double latitude, double longitude) async {
    try {
      final placemarks = await placemarkFromCoordinates(latitude, longitude);
      if (placemarks.isNotEmpty) {
        final placemark = placemarks.first;
        return '${placemark.street}, ${placemark.locality}';
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error getting address: $e');
      }
    }
    return null;
  }
  
  /// Check if coordinates are within Ireland bounds (approximate)
  bool isLocationInIreland(double latitude, double longitude) {
    // Ireland approximate bounds
    const double northBound = 55.5;
    const double southBound = 51.4;
    const double eastBound = -5.4;
    const double westBound = -10.7;
    
    return latitude >= southBound && 
           latitude <= northBound && 
           longitude >= westBound && 
           longitude <= eastBound;
  }
  
  /// Open device location settings
  Future<bool> openLocationSettings() async {
    return await Geolocator.openLocationSettings();
  }
  
  /// Open app-specific location settings
  Future<bool> openAppSettings() async {
    return await Geolocator.openAppSettings();
  }
}