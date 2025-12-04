import 'package:flutter/material.dart';

/// Application color constants based on Raksha Ireland brand guidelines
class AppColors {
  // Primary Colors
  static const Color crisisRed = Color(0xFFE63946);
  static const Color offWhite = Color(0xFFF1FAEE);
  
  // Areiva Integration Colors
  static const Color areivaTeal = Color(0xFF005F73);
  static const Color areivaLight = Color(0xFF94D2BD);
  
  // Supporting Colors
  static const Color successGreen = Color(0xFF2D6A4F);
  static const Color warningOrange = Color(0xFFF77F00);
  static const Color errorRed = Color(0xFFD62828);
  static const Color textDark = Color(0xFF212529);
  static const Color textLight = Color(0xFF6C757D);
  
  // Neutral Colors
  static const Color white = Color(0xFFFFFFFF);
  static const Color grey100 = Color(0xFFF8F9FA);
  static const Color grey200 = Color(0xFFE9ECEF);
  static const Color grey300 = Color(0xFFCED4DA);
  static const Color grey400 = Color(0xFF868E96);
  static const Color grey500 = Color(0xFF495057);
  
  // Dark Theme Colors
  static const Color darkBackground = Color(0xFF121212);
  static const Color darkSurface = Color(0xFF1E1E1E);
  static const Color darkOnBackground = Color(0xFFE1E1E1);
  static const Color darkOnSurface = Color(0xFFE1E1E1);
}

/// Typography configuration following brand guidelines
class AppTypography {
  // Font Families
  static const String montserrat = 'Montserrat';
  static const String inter = 'Inter';
  
  // Light Theme Text Styles
  static const TextStyle displayLarge = TextStyle(
    fontFamily: montserrat,
    fontSize: 32,
    fontWeight: FontWeight.w700,
    color: AppColors.textDark,
    height: 1.2,
  );
  
  static const TextStyle displayMedium = TextStyle(
    fontFamily: montserrat,
    fontSize: 28,
    fontWeight: FontWeight.w700,
    color: AppColors.textDark,
    height: 1.2,
  );
  
  static const TextStyle headingLarge = TextStyle(
    fontFamily: montserrat,
    fontSize: 24,
    fontWeight: FontWeight.w700,
    color: AppColors.textDark,
    height: 1.3,
  );
  
  static const TextStyle headingMedium = TextStyle(
    fontFamily: montserrat,
    fontSize: 20,
    fontWeight: FontWeight.w600,
    color: AppColors.textDark,
    height: 1.3,
  );
  
  static const TextStyle bodyLarge = TextStyle(
    fontFamily: inter,
    fontSize: 18,
    fontWeight: FontWeight.w400,
    color: AppColors.textDark,
    height: 1.5,
  );
  
  static const TextStyle bodyMedium = TextStyle(
    fontFamily: inter,
    fontSize: 16,
    fontWeight: FontWeight.w400,
    color: AppColors.textDark,
    height: 1.5,
  );
  
  static const TextStyle bodySmall = TextStyle(
    fontFamily: inter,
    fontSize: 14,
    fontWeight: FontWeight.w400,
    color: AppColors.textLight,
    height: 1.4,
  );
  
  static const TextStyle caption = TextStyle(
    fontFamily: inter,
    fontSize: 12,
    fontWeight: FontWeight.w400,
    color: AppColors.textLight,
    height: 1.4,
  );
  
  // Button Text Styles
  static const TextStyle buttonLarge = TextStyle(
    fontFamily: inter,
    fontSize: 16,
    fontWeight: FontWeight.w600,
    height: 1.2,
  );
  
  static const TextStyle buttonMedium = TextStyle(
    fontFamily: inter,
    fontSize: 14,
    fontWeight: FontWeight.w600,
    height: 1.2,
  );
}

/// Main application theme configuration
class AppTheme {
  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      
      // Color Scheme
      colorScheme: const ColorScheme.light(
        primary: AppColors.areivaTeal,
        onPrimary: AppColors.white,
        secondary: AppColors.areivaLight,
        onSecondary: AppColors.textDark,
        error: AppColors.errorRed,
        onError: AppColors.white,
        background: AppColors.offWhite,
        onBackground: AppColors.textDark,
        surface: AppColors.white,
        onSurface: AppColors.textDark,
      ),
      
      // Typography
      textTheme: const TextTheme(
        displayLarge: AppTypography.displayLarge,
        displayMedium: AppTypography.displayMedium,
        headlineLarge: AppTypography.headingLarge,
        headlineMedium: AppTypography.headingMedium,
        bodyLarge: AppTypography.bodyLarge,
        bodyMedium: AppTypography.bodyMedium,
        bodySmall: AppTypography.bodySmall,
        labelLarge: AppTypography.buttonLarge,
        labelMedium: AppTypography.buttonMedium,
      ),
      
      // App Bar Theme
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.areivaTeal,
        foregroundColor: AppColors.white,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontFamily: AppTypography.montserrat,
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: AppColors.white,
        ),
      ),
      
      // Elevated Button Theme
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.areivaTeal,
          foregroundColor: AppColors.white,
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          textStyle: AppTypography.buttonLarge,
        ),
      ),
      
      // Outlined Button Theme
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.areivaTeal,
          side: const BorderSide(color: AppColors.areivaTeal, width: 2),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(8),
          ),
          textStyle: AppTypography.buttonLarge,
        ),
      ),
      
      // Card Theme
      cardTheme: CardThemeData(
        color: AppColors.white,
        elevation: 1,
        shadowColor: AppColors.textDark.withOpacity(0.1),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      
      // Input Decoration Theme
      inputDecorationTheme: InputDecorationTheme(
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: const BorderSide(color: AppColors.grey300),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: const BorderSide(color: AppColors.grey300),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: const BorderSide(color: AppColors.areivaTeal, width: 2),
        ),
        errorBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(6),
          borderSide: const BorderSide(color: AppColors.errorRed),
        ),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        hintStyle: AppTypography.bodyMedium.copyWith(color: AppColors.textLight),
      ),
      
      // Floating Action Button Theme
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: AppColors.crisisRed,
        foregroundColor: AppColors.white,
        elevation: 4,
        shape: CircleBorder(),
      ),
    );
  }
  
  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      
      // Color Scheme
      colorScheme: const ColorScheme.dark(
        primary: AppColors.areivaLight,
        onPrimary: AppColors.textDark,
        secondary: AppColors.areivaTeal,
        onSecondary: AppColors.white,
        error: AppColors.errorRed,
        onError: AppColors.white,
        background: AppColors.darkBackground,
        onBackground: AppColors.darkOnBackground,
        surface: AppColors.darkSurface,
        onSurface: AppColors.darkOnSurface,
      ),
      
      // Typography (adapted for dark theme)
      textTheme: TextTheme(
        displayLarge: AppTypography.displayLarge.copyWith(color: AppColors.darkOnBackground),
        displayMedium: AppTypography.displayMedium.copyWith(color: AppColors.darkOnBackground),
        headlineLarge: AppTypography.headingLarge.copyWith(color: AppColors.darkOnBackground),
        headlineMedium: AppTypography.headingMedium.copyWith(color: AppColors.darkOnBackground),
        bodyLarge: AppTypography.bodyLarge.copyWith(color: AppColors.darkOnBackground),
        bodyMedium: AppTypography.bodyMedium.copyWith(color: AppColors.darkOnBackground),
        bodySmall: AppTypography.bodySmall.copyWith(color: AppColors.darkOnBackground.withOpacity(0.7)),
        labelLarge: AppTypography.buttonLarge,
        labelMedium: AppTypography.buttonMedium,
      ),
      
      // App Bar Theme
      appBarTheme: const AppBarTheme(
        backgroundColor: AppColors.darkSurface,
        foregroundColor: AppColors.darkOnSurface,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          fontFamily: AppTypography.montserrat,
          fontSize: 20,
          fontWeight: FontWeight.w600,
          color: AppColors.darkOnSurface,
        ),
      ),
      
      // Card Theme
      cardTheme: CardThemeData(
        color: AppColors.darkSurface,
        elevation: 2,
        shadowColor: Colors.black.withOpacity(0.3),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
      
      // Floating Action Button Theme
      floatingActionButtonTheme: const FloatingActionButtonThemeData(
        backgroundColor: AppColors.crisisRed,
        foregroundColor: AppColors.white,
        elevation: 4,
        shape: CircleBorder(),
      ),
    );
  }
}

/// Spacing constants for consistent layout
class AppSpacing {
  static const double xs = 4.0;
  static const double sm = 8.0;
  static const double md = 16.0;
  static const double lg = 24.0;
  static const double xl = 32.0;
  static const double xxl = 48.0;
}

/// Border radius constants
class AppBorderRadius {
  static const double sm = 4.0;
  static const double md = 8.0;
  static const double lg = 12.0;
  static const double xl = 16.0;
  static const double round = 50.0;
}

/// Elevation constants
class AppElevation {
  static const double sm = 1.0;
  static const double md = 3.0;
  static const double lg = 6.0;
  static const double xl = 12.0;
}