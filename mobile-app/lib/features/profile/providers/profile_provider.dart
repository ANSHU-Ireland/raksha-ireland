import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../../core/services/auth_service.dart';
import '../../../core/config/app_config.dart';

/// State management for user profile features
class ProfileProvider extends ChangeNotifier {
  final AuthService _authService;
  
  bool _isLoading = false;
  String? _errorMessage;
  
  ProfileProvider({required AuthService authService}) : _authService = authService;
  
  // Getters
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  AppUser? get currentUser => _authService.currentUser;
  
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
  
  /// Update user profile information
  Future<bool> updateProfile({
    String? fullName,
    String? nationality,
    String? phoneNumber,
    String? profilePicUrl,
  }) async {
    // Validate before starting loading state
    if (currentUser == null) {
      _setError('No user signed in');
      return false;
    }
    
    // Build request body
    final Map<String, dynamic> body = {};
    if (fullName != null && fullName.isNotEmpty) body['full_name'] = fullName;
    if (nationality != null && nationality.isNotEmpty) body['nationality'] = nationality;
    if (phoneNumber != null && phoneNumber.isNotEmpty) body['phone_number'] = phoneNumber;
    if (profilePicUrl != null) body['profile_pic_url'] = profilePicUrl;
    
    if (body.isEmpty) {
      _setError('No changes to save');
      return false;
    }
    
    try {
      _setLoading(true);
      _setError(null);
      
      // Get auth token
      final token = await _authService.getIdToken();
      if (token == null) {
        _setError('Not authenticated');
        return false;
      }
      
      // Make API call with timeout
      final response = await http.put(
        Uri.parse('${AppConfig.apiBaseUrl}/users/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: json.encode(body),
      ).timeout(const Duration(seconds: 15));
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        
        // Update auth service with new user data
        if (data['user'] != null) {
          final updatedUser = AppUser.fromJson(data['user']);
          await _authService.updateCurrentUser(updatedUser);
          // No need to call fetchUserProfile() - updateCurrentUser already syncs
        }
        
        if (kDebugMode) {
          print('Profile updated successfully');
        }
        
        return true;
      } else {
        // Safe JSON decoding for error responses
        String message;
        try {
          final error = json.decode(response.body);
          message = error['error'] ?? 'Failed to update profile';
        } catch (_) {
          message = 'Failed to update profile (${response.statusCode})';
        }
        _setError(message);
        return false;
      }
      
    } catch (e) {
      if (kDebugMode) {
        print('Error updating profile: $e');
      }
      _setError('Failed to update profile: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  /// Upload verification documents
  Future<bool> uploadVerificationDocuments({
    required List<String> documentPaths,
    String? notes,
  }) async {
    // Validate before starting loading state
    if (currentUser == null) {
      _setError('No user signed in');
      return false;
    }
    
    try {
      _setLoading(true);
      _setError(null);
      
      // In a real app, this would upload files to cloud storage and update backend
      await Future.delayed(const Duration(seconds: 3));
      
      if (kDebugMode) {
        print('Verification documents uploaded: ${documentPaths.length} files');
      }
      
      return true;
      
    } catch (e) {
      if (kDebugMode) {
        print('Error uploading documents: $e');
      }
      _setError('Failed to upload documents: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  /// Get verification status
  VerificationStatus? get verificationStatus => currentUser?.verificationStatus;
  
  /// Check if user is verified
  bool get isVerified => currentUser?.isVerified ?? false;
  
  /// Get verification status text
  String get verificationStatusText {
    switch (verificationStatus) {
      case VerificationStatus.pending:
        return 'Verification Pending';
      case VerificationStatus.verified:
        return 'Verified User';
      case VerificationStatus.rejected:
        return 'Verification Rejected';
      case null:
        return 'Not Verified';
    }
  }
  
  /// Get verification status color
  Color get verificationStatusColor {
    switch (verificationStatus) {
      case VerificationStatus.pending:
        return Colors.orange;
      case VerificationStatus.verified:
        return Colors.green;
      case VerificationStatus.rejected:
        return Colors.red;
      case null:
        return Colors.grey;
    }
  }
  
  /// Update location permission setting
  Future<bool> updateLocationEnabled(bool enabled) async {
    try {
      _setLoading(true);
      _setError(null);
      
      // In a real app, this would update the backend
      await Future.delayed(const Duration(seconds: 1));
      
      if (kDebugMode) {
        print('Location enabled setting updated: $enabled');
      }
      
      return true;
      
    } catch (e) {
      if (kDebugMode) {
        print('Error updating location setting: $e');
      }
      _setError('Failed to update location setting');
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  /// Export user data (GDPR compliance)
  Future<Map<String, dynamic>?> exportUserData() async {
    // Validate before starting loading state
    if (currentUser == null) {
      _setError('No user signed in');
      return null;
    }
    
    try {
      _setLoading(true);
      _setError(null);
      
      // In a real app, this would fetch all user data from backend
      await Future.delayed(const Duration(seconds: 2));
      
      final userData = {
        'personal_info': currentUser!.toJson(),
        'alerts_sent': [], // Would fetch from backend
        'alerts_responded': [], // Would fetch from backend
        'location_history': [], // Would fetch from backend (anonymized)
        'export_date': DateTime.now().toIso8601String(),
      };
      
      if (kDebugMode) {
        print('User data exported');
      }
      
      return userData;
      
    } catch (e) {
      if (kDebugMode) {
        print('Error exporting user data: $e');
      }
      _setError('Failed to export user data');
      return null;
    } finally {
      _setLoading(false);
    }
  }
  
  /// Request account deletion (GDPR compliance)
  Future<bool> requestAccountDeletion(String reason) async {
    // Validate before starting loading state
    if (currentUser == null) {
      _setError('No user signed in');
      return false;
    }
    
    try {
      _setLoading(true);
      _setError(null);
      
      // In a real app, this would:
      // 1. Mark account for deletion in backend
      // 2. Schedule data anonymization after grace period
      // 3. Send confirmation email
      await Future.delayed(const Duration(seconds: 2));
      
      if (kDebugMode) {
        print('Account deletion requested. Reason: $reason');
      }
      
      return true;
      
    } catch (e) {
      if (kDebugMode) {
        print('Error requesting account deletion: $e');
      }
      _setError('Failed to request account deletion');
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  /// Get user statistics
  Future<Map<String, int>?> getUserStatistics() async {
    // Validate before starting loading state
    if (currentUser == null) {
      _setError('No user signed in');
      return null;
    }
    
    try {
      _setLoading(true);
      _setError(null);
      
      // In a real app, this would fetch from backend analytics
      await Future.delayed(const Duration(seconds: 1));
      
      final stats = {
        'alerts_sent': 0,
        'alerts_responded': 0,
        'people_helped': 0,
        'community_score': 100,
      };
      
      if (kDebugMode) {
        print('User statistics loaded');
      }
      
      return stats;
      
    } catch (e) {
      if (kDebugMode) {
        print('Error loading user statistics: $e');
      }
      _setError('Failed to load statistics');
      return null;
    } finally {
      _setLoading(false);
    }
  }
  
  /// Update notification preferences
  Future<bool> updateNotificationPreferences({
    bool? emergencyAlerts,
    bool? verificationUpdates,
    bool? communityUpdates,
    bool? soundEnabled,
    bool? vibrationEnabled,
  }) async {
    try {
      _setLoading(true);
      _setError(null);
      
      // In a real app, this would update backend preferences
      await Future.delayed(const Duration(seconds: 1));
      
      if (kDebugMode) {
        print('Notification preferences updated');
      }
      
      return true;
      
    } catch (e) {
      if (kDebugMode) {
        print('Error updating notification preferences: $e');
      }
      _setError('Failed to update notification preferences');
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  /// Get emergency contacts
  Future<List<Map<String, String>>?> getEmergencyContacts() async {
    try {
      _setLoading(true);
      _setError(null);
      
      // In a real app, this would fetch from backend
      await Future.delayed(const Duration(seconds: 1));
      
      final contacts = [
        {
          'name': 'Emergency Services',
          'number': '999',
          'type': 'emergency',
        },
        {
          'name': 'Gardaí',
          'number': '112',
          'type': 'police',
        },
        {
          'name': 'Irish Refugee Council',
          'number': '+353 1 764 5854',
          'type': 'support',
        },
      ];
      
      if (kDebugMode) {
        print('Emergency contacts loaded');
      }
      
      return contacts;
      
    } catch (e) {
      if (kDebugMode) {
        print('Error loading emergency contacts: $e');
      }
      _setError('Failed to load emergency contacts');
      return null;
    } finally {
      _setLoading(false);
    }
  }
}