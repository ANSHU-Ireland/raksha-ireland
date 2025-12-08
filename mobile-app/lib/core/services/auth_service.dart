import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'dart:convert';
import '../config/app_config.dart';

/// User verification status enumeration
enum VerificationStatus {
  pending,
  verified,
  rejected,
}

/// User model for authentication
class AppUser {
  final String id;
  final String email;
  final String? fullName;
  final String? nationality;
  final String? phoneNumber;
  final String? profilePicUrl;
  final VerificationStatus verificationStatus;
  final String role;
  final String status;
  final DateTime createdAt;
  final DateTime? lastActive;
  final bool locationEnabled;
  
  AppUser({
    required this.id,
    required this.email,
    this.fullName,
    this.nationality,
    this.phoneNumber,
    this.profilePicUrl,
    this.verificationStatus = VerificationStatus.pending,
    this.role = 'user',
    this.status = 'active',
    required this.createdAt,
    this.lastActive,
    this.locationEnabled = false,
  });
  
  /// Convert to JSON
  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'fullName': fullName,
      'nationality': nationality,
      'phoneNumber': phoneNumber,
      'profilePicUrl': profilePicUrl,
      'verificationStatus': verificationStatus.name,
      'role': role,
      'status': status,
      'createdAt': createdAt.toIso8601String(),
      'lastActive': lastActive?.toIso8601String(),
      'locationEnabled': locationEnabled,
    };
  }
  
  /// Create from JSON
  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'],
      email: json['email'],
      fullName: json['fullName'] ?? json['full_name'],
      nationality: json['nationality'],
      phoneNumber: json['phoneNumber'] ?? json['phone_number'],
      profilePicUrl: json['profilePicUrl'] ?? json['profile_pic_url'],
      verificationStatus: VerificationStatus.values.firstWhere(
        (status) => status.name == (json['verificationStatus'] ?? json['verification_status'] ?? 'pending'),
        orElse: () => VerificationStatus.pending,
      ),
      role: json['role'] ?? 'user',
      status: json['status'] ?? 'active',
      createdAt: DateTime.parse(json['createdAt'] ?? json['created_at'] ?? DateTime.now().toIso8601String()),
      lastActive: json['lastActive'] != null 
          ? DateTime.parse(json['lastActive'])
          : null,
      locationEnabled: json['locationEnabled'] ?? json['location_enabled'] ?? false,
    );
  }
  
  /// Create a copy with updated fields
  AppUser copyWith({
    String? id,
    String? email,
    String? fullName,
    String? nationality,
    String? phoneNumber,
    String? profilePicUrl,
    VerificationStatus? verificationStatus,
    String? role,
    String? status,
    DateTime? createdAt,
    DateTime? lastActive,
    bool? locationEnabled,
  }) {
    return AppUser(
      id: id ?? this.id,
      email: email ?? this.email,
      fullName: fullName ?? this.fullName,
      nationality: nationality ?? this.nationality,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      profilePicUrl: profilePicUrl ?? this.profilePicUrl,
      verificationStatus: verificationStatus ?? this.verificationStatus,
      role: role ?? this.role,
      status: status ?? this.status,
      createdAt: createdAt ?? this.createdAt,
      lastActive: lastActive ?? this.lastActive,
      locationEnabled: locationEnabled ?? this.locationEnabled,
    );
  }
  
  /// Check if user is verified
  bool get isVerified => verificationStatus == VerificationStatus.verified;
  
  /// Get display name
  String get displayName => fullName ?? email.split('@').first;
}

/// Authentication service using Firebase Auth
class AuthService {
  final FirebaseAuth _firebaseAuth = FirebaseAuth.instance;
  final FlutterSecureStorage _secureStorage = const FlutterSecureStorage();
  AppUser? _cachedUser;
  
  // Keys for secure storage
  static const String _keyRememberMe = 'remember_me';
  static const String _keyEmail = 'saved_email';
  static const String _keyPassword = 'saved_password';
  
  /// Get current Firebase user
  User? get currentFirebaseUser => _firebaseAuth.currentUser;
  
  /// Get current app user (would typically fetch from backend)
  AppUser? get currentUser {
    if (_cachedUser != null) return _cachedUser;
    
    final firebaseUser = currentFirebaseUser;
    if (firebaseUser == null) return null;
    
    // In a real app, this would fetch user details from backend
    return AppUser(
      id: firebaseUser.uid,
      email: firebaseUser.email!,
      fullName: firebaseUser.displayName,
      createdAt: firebaseUser.metadata.creationTime ?? DateTime.now(),
      lastActive: firebaseUser.metadata.lastSignInTime,
    );
  }
  
  /// Update cached user data
  Future<void> updateCurrentUser(AppUser user) async {
    _cachedUser = user;
  }
  
  /// Fetch user profile from backend
  Future<AppUser?> fetchUserProfile() async {
    try {
      final token = await getIdToken();
      if (token == null) return null;
      
      final response = await http.get(
        Uri.parse('${AppConfig.apiBaseUrl}/users/profile'),
        headers: {
          'Authorization': 'Bearer $token',
        },
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        if (data['user'] != null) {
          _cachedUser = AppUser.fromJson(data['user']);
          return _cachedUser;
        }
      }
      
      return null;
    } catch (e) {
      if (kDebugMode) {
        print('Error fetching user profile: $e');
      }
      return null;
    }
  }
  
  /// Get ID token for API calls
  Future<String?> getIdToken() async {
    try {
      final user = currentFirebaseUser;
      if (user == null) return null;
      return await user.getIdToken();
    } catch (e) {
      if (kDebugMode) {
        print('Error getting ID token: $e');
      }
      return null;
    }
  }
  
  /// Stream of authentication state changes
  Stream<User?> get authStateChanges => _firebaseAuth.authStateChanges();
  
  /// Register with email and password
  Future<AppUser?> registerWithEmailAndPassword({
    required String email,
    required String password,
    required String fullName,
    required String nationality,
    String? phoneNumber,
  }) async {
    try {
      // First, register with backend API
      final response = await http.post(
        Uri.parse('${AppConfig.apiBaseUrl}/auth/register'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email.trim(),
          'password': password,
          'full_name': fullName,
          'nationality': nationality,
          'phone_number': phoneNumber,
        }),
      );
      
      if (response.statusCode != 201) {
        final error = json.decode(response.body);
        throw Exception(error['error'] ?? 'Registration failed');
      }
      
      final backendData = json.decode(response.body);
      
      // Then create Firebase user
      final credential = await _firebaseAuth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      
      final user = credential.user;
      if (user == null) return null;
      
      // Update display name
      await user.updateDisplayName(fullName);
      
      // Send email verification
      await user.sendEmailVerification();
      
      // Create app user from backend data
      final appUser = AppUser.fromJson(backendData['user']);
      _cachedUser = appUser;
      
      if (kDebugMode) {
        print('User registered: ${appUser.email}');
        print('Backend user ID: ${appUser.id}');
      }
      
      return appUser;
      
    } on FirebaseAuthException catch (e) {
      if (kDebugMode) {
        print('Registration error: ${e.code} - ${e.message}');
      }
      throw _getAuthException(e);
    } catch (e) {
      if (kDebugMode) {
        print('Unexpected registration error: $e');
      }
      throw Exception('Registration failed. Please try again.');
    }
  }
  
  /// Save login credentials securely
  Future<void> saveCredentials(String email, String password) async {
    try {
      await _secureStorage.write(key: _keyRememberMe, value: 'true');
      await _secureStorage.write(key: _keyEmail, value: email);
      await _secureStorage.write(key: _keyPassword, value: password);
      
      if (kDebugMode) {
        print('Credentials saved securely');
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error saving credentials: $e');
      }
    }
  }
  
  /// Clear saved credentials
  Future<void> clearCredentials() async {
    try {
      await _secureStorage.delete(key: _keyRememberMe);
      await _secureStorage.delete(key: _keyEmail);
      await _secureStorage.delete(key: _keyPassword);
      
      if (kDebugMode) {
        print('Credentials cleared');
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error clearing credentials: $e');
      }
    }
  }
  
  /// Check if remember me is enabled
  Future<bool> isRememberMeEnabled() async {
    try {
      final rememberMe = await _secureStorage.read(key: _keyRememberMe);
      return rememberMe == 'true';
    } catch (e) {
      if (kDebugMode) {
        print('Error checking remember me: $e');
      }
      return false;
    }
  }
  
  /// Get saved email
  Future<String?> getSavedEmail() async {
    try {
      return await _secureStorage.read(key: _keyEmail);
    } catch (e) {
      if (kDebugMode) {
        print('Error getting saved email: $e');
      }
      return null;
    }
  }
  
  /// Get saved credentials
  Future<Map<String, String>?> getSavedCredentials() async {
    try {
      final rememberMe = await _secureStorage.read(key: _keyRememberMe);
      if (rememberMe != 'true') return null;
      
      final email = await _secureStorage.read(key: _keyEmail);
      final password = await _secureStorage.read(key: _keyPassword);
      
      if (email != null && password != null) {
        return {'email': email, 'password': password};
      }
      return null;
    } catch (e) {
      if (kDebugMode) {
        print('Error getting saved credentials: $e');
      }
      return null;
    }
  }
  
  /// Auto-login with saved credentials
  Future<AppUser?> autoLogin() async {
    try {
      final credentials = await getSavedCredentials();
      if (credentials == null) return null;
      
      if (kDebugMode) {
        print('Attempting auto-login for: ${credentials['email']}');
      }
      
      return await signInWithEmailAndPassword(
        email: credentials['email']!,
        password: credentials['password']!,
      );
    } catch (e) {
      if (kDebugMode) {
        print('Auto-login failed: $e');
      }
      // Clear invalid credentials
      await clearCredentials();
      return null;
    }
  }
  
  /// Sign in with email and password
  Future<AppUser?> signInWithEmailAndPassword({
    required String email,
    required String password,
    bool rememberMe = false,
  }) async {
    try {
      final credential = await _firebaseAuth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      
      final user = credential.user;
      if (user == null) return null;
      
      // TODO: Enable email verification in production
      // Check if email is verified
      // if (!user.emailVerified) {
      //   throw Exception('Please verify your email address before signing in.');
      // }
      
      // In a real app, this would fetch user profile from backend
      final appUser = AppUser(
        id: user.uid,
        email: user.email!,
        fullName: user.displayName,
        createdAt: user.metadata.creationTime ?? DateTime.now(),
        lastActive: DateTime.now(),
      );
      
      if (kDebugMode) {
        print('User signed in: ${appUser.email}');
      }
      
      // Save credentials if remember me is enabled
      if (rememberMe) {
        await saveCredentials(email, password);
      } else {
        await clearCredentials();
      }
      
      return appUser;
      
    } on FirebaseAuthException catch (e) {
      if (kDebugMode) {
        print('Sign in error: ${e.code} - ${e.message}');
      }
      throw _getAuthException(e);
    } catch (e) {
      if (kDebugMode) {
        print('Unexpected sign in error: $e');
      }
      rethrow;
    }
  }
  
  /// Send password reset email
  Future<void> sendPasswordResetEmail(String email) async {
    try {
      await _firebaseAuth.sendPasswordResetEmail(email: email.trim());
      
      if (kDebugMode) {
        print('Password reset email sent to: $email');
      }
      
    } on FirebaseAuthException catch (e) {
      if (kDebugMode) {
        print('Password reset error: ${e.code} - ${e.message}');
      }
      throw _getAuthException(e);
    }
  }
  
  /// Sign out
  Future<void> signOut() async {
    try {
      // Clear saved credentials on sign out
      await clearCredentials();
      await _firebaseAuth.signOut();
      _cachedUser = null;
      
      if (kDebugMode) {
        print('User signed out');
      }
      
    } catch (e) {
      if (kDebugMode) {
        print('Sign out error: $e');
      }
      throw Exception('Failed to sign out. Please try again.');
    }
  }
  
  /// Delete current user account
  Future<void> deleteAccount() async {
    try {
      final user = currentFirebaseUser;
      if (user == null) throw Exception('No user signed in');
      
      // In a real app, this would also delete user data from backend
      await user.delete();
      
      if (kDebugMode) {
        print('User account deleted');
      }
      
    } on FirebaseAuthException catch (e) {
      if (kDebugMode) {
        print('Delete account error: ${e.code} - ${e.message}');
      }
      throw _getAuthException(e);
    }
  }
  
  /// Resend email verification
  Future<void> resendEmailVerification() async {
    try {
      final user = currentFirebaseUser;
      if (user == null) throw Exception('No user signed in');
      
      if (user.emailVerified) {
        throw Exception('Email is already verified');
      }
      
      await user.sendEmailVerification();
      
      if (kDebugMode) {
        print('Email verification sent');
      }
      
    } on FirebaseAuthException catch (e) {
      if (kDebugMode) {
        print('Resend verification error: ${e.code} - ${e.message}');
      }
      throw _getAuthException(e);
    }
  }
  
  /// Update user password
  Future<void> updatePassword(String newPassword) async {
    try {
      final user = currentFirebaseUser;
      if (user == null) throw Exception('No user signed in');
      
      await user.updatePassword(newPassword);
      
      if (kDebugMode) {
        print('Password updated');
      }
      
    } on FirebaseAuthException catch (e) {
      if (kDebugMode) {
        print('Update password error: ${e.code} - ${e.message}');
      }
      throw _getAuthException(e);
    }
  }
  
  /// Reauthenticate user with current credentials
  Future<void> reauthenticateWithCredential({
    required String email,
    required String password,
  }) async {
    try {
      final user = currentFirebaseUser;
      if (user == null) throw Exception('No user signed in');
      
      final credential = EmailAuthProvider.credential(
        email: email,
        password: password,
      );
      
      await user.reauthenticateWithCredential(credential);
      
      if (kDebugMode) {
        print('User reauthenticated');
      }
      
    } on FirebaseAuthException catch (e) {
      if (kDebugMode) {
        print('Reauthentication error: ${e.code} - ${e.message}');
      }
      throw _getAuthException(e);
    }
  }

  /// Register FCM token for push notifications
  Future<void> registerFCMToken(String fcmToken) async {
    try {
      final user = currentFirebaseUser;
      if (user == null) throw Exception('No user signed in');

      final token = await user.getIdToken();
      final response = await http.put(
        Uri.parse('${AppConfig.apiBaseUrl}/users/fcm-token'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'fcm_token': fcmToken}),
      );

      if (response.statusCode == 200) {
        if (kDebugMode) {
          print('FCM token registered successfully');
        }
      } else {
        throw Exception('Failed to register FCM token: ${response.body}');
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error registering FCM token: $e');
      }
      rethrow;
    }
  }

  /// Enable location tracking
  Future<void> enableLocationTracking() async {
    try {
      final user = currentFirebaseUser;
      if (user == null) throw Exception('No user signed in');

      final token = await user.getIdToken();
      final response = await http.put(
        Uri.parse('${AppConfig.apiBaseUrl}/users/location-settings'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'location_enabled': true}),
      );

      if (response.statusCode == 200) {
        if (kDebugMode) {
          print('Location tracking enabled successfully');
        }
      } else {
        throw Exception('Failed to enable location tracking: ${response.body}');
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error enabling location tracking: $e');
      }
      rethrow;
    }
  }
  
  /// Get user-friendly error message from Firebase Auth exception
  String _getAuthException(FirebaseAuthException e) {
    switch (e.code) {
      case 'user-not-found':
        return 'No user found with this email address.';
      case 'wrong-password':
        return 'Incorrect password. Please try again.';
      case 'user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'too-many-requests':
        return 'Too many attempts. Please try again later.';
      case 'email-already-in-use':
        return 'An account already exists with this email address.';
      case 'weak-password':
        return 'Password is too weak. Please choose a stronger password.';
      case 'invalid-email':
        return 'Please enter a valid email address.';
      case 'operation-not-allowed':
        return 'This operation is not allowed. Please contact support.';
      case 'requires-recent-login':
        return 'Please sign in again to perform this action.';
      default:
        return e.message ?? 'An authentication error occurred.';
    }
  }
}