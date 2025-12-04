import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

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
  final VerificationStatus verificationStatus;
  final DateTime createdAt;
  final DateTime? lastActive;
  final bool locationEnabled;
  
  AppUser({
    required this.id,
    required this.email,
    this.fullName,
    this.nationality,
    this.phoneNumber,
    this.verificationStatus = VerificationStatus.pending,
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
      'verificationStatus': verificationStatus.name,
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
      fullName: json['fullName'],
      nationality: json['nationality'],
      phoneNumber: json['phoneNumber'],
      verificationStatus: VerificationStatus.values.firstWhere(
        (status) => status.name == json['verificationStatus'],
        orElse: () => VerificationStatus.pending,
      ),
      createdAt: DateTime.parse(json['createdAt']),
      lastActive: json['lastActive'] != null 
          ? DateTime.parse(json['lastActive'])
          : null,
      locationEnabled: json['locationEnabled'] ?? false,
    );
  }
  
  /// Create a copy with updated fields
  AppUser copyWith({
    String? id,
    String? email,
    String? fullName,
    String? nationality,
    String? phoneNumber,
    VerificationStatus? verificationStatus,
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
      verificationStatus: verificationStatus ?? this.verificationStatus,
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
  
  /// Get current Firebase user
  User? get currentFirebaseUser => _firebaseAuth.currentUser;
  
  /// Get current app user (would typically fetch from backend)
  AppUser? get currentUser {
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
      // Create Firebase user
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
      
      // In a real app, this would also create user profile in backend
      final appUser = AppUser(
        id: user.uid,
        email: email.trim(),
        fullName: fullName,
        nationality: nationality,
        phoneNumber: phoneNumber,
        verificationStatus: VerificationStatus.pending,
        createdAt: DateTime.now(),
      );
      
      if (kDebugMode) {
        print('User registered: ${appUser.email}');
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
  
  /// Sign in with email and password
  Future<AppUser?> signInWithEmailAndPassword({
    required String email,
    required String password,
  }) async {
    try {
      final credential = await _firebaseAuth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      
      final user = credential.user;
      if (user == null) return null;
      
      // Check if email is verified
      if (!user.emailVerified) {
        throw Exception('Please verify your email address before signing in.');
      }
      
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
      await _firebaseAuth.signOut();
      
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