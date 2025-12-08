import 'package:flutter/foundation.dart';

import '../../../core/services/auth_service.dart';
import '../../../core/services/notification_service.dart';

/// State management for authentication flow
class AuthProvider extends ChangeNotifier {
  final AuthService _authService;

  AppUser? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;

  AuthProvider({required AuthService authService})
      : _authService = authService {
    // Listen to auth state changes
    _authService.authStateChanges.listen((firebaseUser) {
      if (firebaseUser == null) {
        _currentUser = null;
      } else {
        _currentUser = _authService.currentUser;
      }
      notifyListeners();
    });
  }

  // Getters
  AppUser? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _currentUser != null;
  AuthService get authService => _authService;

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

  /// Check current authentication state
  Future<void> checkAuthState() async {
    try {
      _setLoading(true);
      _currentUser = _authService.currentUser;

      if (kDebugMode) {
        print(
          'Auth state checked: ${_currentUser?.email ?? "Not authenticated"}',
        );
      }

      // Make sure UI sees the updated current user
      notifyListeners();
    } catch (e) {
      if (kDebugMode) {
        print('Error checking auth state: $e');
      }
      _setError('Failed to check authentication status');
    } finally {
      _setLoading(false);
    }
  }
  
  /// Register new user
  Future<bool> register({
    required String email,
    required String password,
    required String fullName,
    required String nationality,
    String? phoneNumber,
  }) async {
    try {
      _setLoading(true);
      _setError(null);
      
      final user = await _authService.registerWithEmailAndPassword(
        email: email,
        password: password,
        fullName: fullName,
        nationality: nationality,
        phoneNumber: phoneNumber,
      );
      
      if (user != null) {
        _currentUser = user;

        if (kDebugMode) {
          print('User registered successfully: ${user.email}');
        }

        // Register FCM token and enable location tracking
        await _initializeUserSettings();

        notifyListeners();
        return true;
      }

      _setError('Registration failed. Please try again.');
      return false;
    } catch (e) {
      if (kDebugMode) {
        print('Registration error: $e');
      }
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  /// Sign in existing user
  Future<bool> signIn({
    required String email,
    required String password,
    bool rememberMe = false,
  }) async {
    try {
      _setLoading(true);
      _setError(null);
      
      final user = await _authService.signInWithEmailAndPassword(
        email: email,
        password: password,
        rememberMe: rememberMe,
      );
      
      if (user != null) {
        // Fetch full profile from backend
        final profileUser = await _authService.fetchUserProfile();
        _currentUser = profileUser ?? user;

        if (kDebugMode) {
          print('User signed in successfully: ${_currentUser?.email}');
          print('Verification status: ${_currentUser?.verificationStatus}');
        }

        // Register FCM token and enable location tracking
        await _initializeUserSettings();

        notifyListeners();
        return true;
      }

      _setError('Sign in failed. Please try again.');
      return false;
    } catch (e) {
      if (kDebugMode) {
        print('Sign in error: $e');
      }
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  /// Initialize user settings after login (FCM token and location)
  Future<void> _initializeUserSettings() async {
    try {
      // Get FCM token
      final fcmToken = await NotificationService.getFCMToken();
      if (fcmToken != null) {
        await _authService.registerFCMToken(fcmToken);
        if (kDebugMode) {
          print('FCM token registered after login');
        }
      }

      // Enable location tracking
      await _authService.enableLocationTracking();
      if (kDebugMode) {
        print('Location tracking enabled after login');
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error initializing user settings: $e');
      }
      // Don't fail login if settings initialization fails
    }
  }
  
  /// Update current user (used for auto-login)
  Future<void> updateCurrentUser(AppUser user) async {
    _currentUser = user;
    await _authService.updateCurrentUser(user);

    // Fetch full profile from backend
    final profileUser = await _authService.fetchUserProfile();
    if (profileUser != null) {
      _currentUser = profileUser;
    }

    // Initialize user settings
    await _initializeUserSettings();

    notifyListeners();

    if (kDebugMode) {
      print('Current user updated: ${user.email}');
    }
  }
  
  /// Send password reset email
  Future<bool> resetPassword(String email) async {
    try {
      _setLoading(true);
      _setError(null);

      await _authService.sendPasswordResetEmail(email);

      if (kDebugMode) {
        print('Password reset email sent to: $email');
      }

      return true;
    } catch (e) {
      if (kDebugMode) {
        print('Password reset error: $e');
      }
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  /// Sign out current user
  Future<void> signOut() async {
    try {
      _setLoading(true);
      _setError(null);

      await _authService.signOut();
      _currentUser = null;

      if (kDebugMode) {
        print('User signed out successfully');
      }

      notifyListeners();
    } catch (e) {
      if (kDebugMode) {
        print('Sign out error: $e');
      }
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  /// Resend email verification
  Future<bool> resendEmailVerification() async {
    try {
      _setLoading(true);
      _setError(null);

      await _authService.resendEmailVerification();

      if (kDebugMode) {
        print('Email verification resent');
      }

      return true;
    } catch (e) {
      if (kDebugMode) {
        print('Resend verification error: $e');
      }
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }
  
  /// Update user password
  /// Update user password
  Future<bool> updatePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      _setLoading(true);
      _setError(null);

      if (_currentUser == null) {
        _setError('No user signed in');
        return false;
      }

      // Reauthenticate first
      await _authService.reauthenticateWithCredential(
        email: _currentUser!.email,
        password: currentPassword,
      );

      // Update password
      await _authService.updatePassword(newPassword);

      if (kDebugMode) {
        print('Password updated successfully');
      }

      return true;
    } catch (e) {
      if (kDebugMode) {
        print('Update password error: $e');
      }
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  /// Delete user account
  Future<bool> deleteAccount(String password) async {
    try {
      _setLoading(true);
      _setError(null);

      if (_currentUser == null) {
        _setError('No user signed in');
        return false;
      }

      // Reauthenticate first
      await _authService.reauthenticateWithCredential(
        email: _currentUser!.email,
        password: password,
      );

      // Delete account
      await _authService.deleteAccount();
      _currentUser = null;

      if (kDebugMode) {
        print('Account deleted successfully');
      }

      notifyListeners();
      return true;
    } catch (e) {
      if (kDebugMode) {
        print('Delete account error: $e');
      }
      _setError(e.toString());
      return false;
    } finally {
      _setLoading(false);
    }
  }

  /// Update user verification status (called when backend updates status)
  void updateVerificationStatus(VerificationStatus status) {
    if (_currentUser != null) {
      _currentUser = _currentUser!.copyWith(verificationStatus: status);
      notifyListeners();

      if (kDebugMode) {
        print('Verification status updated to: ${status.name}');
      }
    }
  }

  /// Refresh user profile from backend
  Future<void> refreshUserProfile() async {
    try {
      final profileUser = await _authService.fetchUserProfile();
      if (profileUser != null) {
        _currentUser = profileUser;
        notifyListeners();

        if (kDebugMode) {
          print('User profile refreshed from backend');
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error refreshing profile: $e');
      }
    }
  }

  /// Update user profile information (local only)
  void updateUserProfile({
    String? fullName,
    String? nationality,
    String? phoneNumber,
    bool? locationEnabled,
  }) {
    if (_currentUser != null) {
      _currentUser = _currentUser!.copyWith(
        fullName: fullName,
        nationality: nationality,
        phoneNumber: phoneNumber,
        locationEnabled: locationEnabled,
        lastActive: DateTime.now(),
      );
      notifyListeners();

      if (kDebugMode) {
        print('User profile updated');
      }
    }
  }
}