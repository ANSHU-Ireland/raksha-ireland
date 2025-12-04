import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../auth/providers/auth_provider.dart';
import '../../core/theme/app_theme.dart';

/// Splash screen with Raksha Ireland and Areiva branding
class SplashScreen extends StatefulWidget {
  const SplashScreen({Key? key}) : super(key: key);

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with TickerProviderStateMixin {
  late AnimationController _logoController;
  late AnimationController _areivaController;
  late Animation<double> _logoOpacity;
  late Animation<double> _logoScale;
  late Animation<double> _areivaOpacity;

  @override
  void initState() {
    super.initState();
    _initializeAnimations();
    _startSplashSequence();
  }

  void _initializeAnimations() {
    // Main logo animation controller
    _logoController = AnimationController(
      duration: const Duration(milliseconds: 1500),
      vsync: this,
    );

    // Areiva logo animation controller
    _areivaController = AnimationController(
      duration: const Duration(milliseconds: 800),
      vsync: this,
    );

    // Logo animations
    _logoOpacity = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _logoController,
      curve: const Interval(0.0, 0.6, curve: Curves.easeOut),
    ));

    _logoScale = Tween<double>(
      begin: 0.8,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _logoController,
      curve: const Interval(0.0, 0.8, curve: Curves.elasticOut),
    ));

    // Areiva logo animation
    _areivaOpacity = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _areivaController,
      curve: Curves.easeIn,
    ));
  }

  void _startSplashSequence() async {
    // Start main logo animation
    await _logoController.forward();
    
    // Wait a moment, then start Areiva animation
    await Future.delayed(const Duration(milliseconds: 500));
    await _areivaController.forward();
    
    // Wait for animations to complete, then check auth state
    await Future.delayed(const Duration(milliseconds: 1000));
    
    if (mounted) {
      _checkAuthenticationState();
    }
  }

  void _checkAuthenticationState() {
    final authProvider = context.read<AuthProvider>();
    
    // Initialize auth state checking
    authProvider.checkAuthState().then((_) {
      if (mounted) {
        // Navigate based on auth state
        if (authProvider.isAuthenticated) {
          if (authProvider.currentUser?.isVerified == true) {
            // Navigate to home screen
            Navigator.of(context).pushReplacementNamed('/home');
          } else {
            // Navigate to verification pending screen
            Navigator.of(context).pushReplacementNamed('/verification-pending');
          }
        } else {
          // Navigate to onboarding/auth flow
          Navigator.of(context).pushReplacementNamed('/onboarding');
        }
      }
    });
  }

  @override
  void dispose() {
    _logoController.dispose();
    _areivaController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [
              AppColors.crisisRed,
              AppColors.areivaTeal,
            ],
            stops: [0.3, 1.0],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Main content area
              Expanded(
                child: Center(
                  child: AnimatedBuilder(
                    animation: _logoController,
                    builder: (context, child) {
                      return Transform.scale(
                        scale: _logoScale.value,
                        child: Opacity(
                          opacity: _logoOpacity.value,
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              // Raksha Ireland Logo Placeholder
                              Container(
                                width: 120,
                                height: 120,
                                decoration: const BoxDecoration(
                                  color: AppColors.white,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.shield,
                                  size: 64,
                                  color: AppColors.crisisRed,
                                ),
                              ),
                              
                              const SizedBox(height: AppSpacing.lg),
                              
                              // App Title
                              const Text(
                                'RAKSHA IRELAND',
                                style: TextStyle(
                                  fontFamily: AppTypography.montserrat,
                                  fontSize: 28,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.white,
                                  letterSpacing: 2.0,
                                ),
                              ),
                              
                              const SizedBox(height: AppSpacing.sm),
                              
                              // Subtitle
                              const Text(
                                'Emergency Safety Network',
                                style: TextStyle(
                                  fontFamily: AppTypography.inter,
                                  fontSize: 16,
                                  fontWeight: FontWeight.w400,
                                  color: AppColors.white,
                                  letterSpacing: 0.5,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ),
              
              // Areiva branding section
              AnimatedBuilder(
                animation: _areivaController,
                builder: (context, child) {
                  return Opacity(
                    opacity: _areivaOpacity.value,
                    child: Container(
                      padding: const EdgeInsets.all(AppSpacing.lg),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          // Supported by text
                          const Text(
                            'Supported by',
                            style: TextStyle(
                              fontFamily: AppTypography.inter,
                              fontSize: 14,
                              fontWeight: FontWeight.w400,
                              color: AppColors.white.withOpacity(0.8),
                            ),
                          ),
                          
                          const SizedBox(height: AppSpacing.sm),
                          
                          // Areiva logo placeholder
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                width: 32,
                                height: 32,
                                decoration: const BoxDecoration(
                                  color: AppColors.white,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.business,
                                  size: 20,
                                  color: AppColors.areivaTeal,
                                ),
                              ),
                              
                              const SizedBox(width: AppSpacing.sm),
                              
                              const Text(
                                'AREIVA',
                                style: TextStyle(
                                  fontFamily: AppTypography.inter,
                                  fontSize: 18,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.white,
                                  letterSpacing: 1.0,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
              
              const SizedBox(height: AppSpacing.lg),
            ],
          ),
        ),
      ),
    );
  }
}