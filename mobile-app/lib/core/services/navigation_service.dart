import 'package:flutter/material.dart';

/// Navigation service for handling app-wide navigation
/// Provides centralized navigation management without requiring BuildContext
class NavigationService {
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();
  
  /// Get the current navigator state
  NavigatorState? get navigator => navigatorKey.currentState;
  
  /// Get the current context
  BuildContext? get context => navigatorKey.currentContext;
  
  /// Navigate to a named route
  Future<T?> navigateTo<T extends Object?>(String routeName, {Object? arguments}) {
    return navigator!.pushNamed<T>(routeName, arguments: arguments);
  }
  
  /// Navigate to a named route and remove all previous routes
  Future<T?> navigateAndClearStack<T extends Object?>(String routeName, {Object? arguments}) {
    return navigator!.pushNamedAndRemoveUntil<T>(
      routeName,
      (route) => false,
      arguments: arguments,
    );
  }
  
  /// Navigate to a named route and replace the current route
  Future<T?> navigateAndReplace<T extends Object?, TO extends Object?>(
    String routeName, {
    Object? arguments,
    TO? result,
  }) {
    return navigator!.pushReplacementNamed<T, TO>(
      routeName,
      arguments: arguments,
      result: result,
    );
  }
  
  /// Navigate to a widget directly
  Future<T?> navigateToWidget<T extends Object?>(Widget widget) {
    return navigator!.push<T>(
      MaterialPageRoute(builder: (context) => widget),
    );
  }
  
  /// Navigate to a widget and replace the current route
  Future<T?> navigateToWidgetAndReplace<T extends Object?, TO extends Object?>(
    Widget widget, {
    TO? result,
  }) {
    return navigator!.pushReplacement<T, TO>(
      MaterialPageRoute(builder: (context) => widget),
      result: result,
    );
  }
  
  /// Navigate to a widget and clear the entire stack
  Future<T?> navigateToWidgetAndClearStack<T extends Object?>(Widget widget) {
    return navigator!.pushAndRemoveUntil<T>(
      MaterialPageRoute(builder: (context) => widget),
      (route) => false,
    );
  }
  
  /// Go back to the previous screen
  void goBack<T extends Object?>([T? result]) {
    if (navigator!.canPop()) {
      navigator!.pop<T>(result);
    }
  }
  
  /// Go back until a specific route
  void goBackUntil(String routeName) {
    navigator!.popUntil(ModalRoute.withName(routeName));
  }
  
  /// Check if we can go back
  bool canGoBack() {
    return navigator!.canPop();
  }
  
  /// Show a modal bottom sheet
  Future<T?> showBottomSheet<T>(
    Widget widget, {
    bool isDismissible = true,
    bool enableDrag = true,
    bool isScrollControlled = false,
  }) {
    return showModalBottomSheet<T>(
      context: context!,
      builder: (context) => widget,
      isDismissible: isDismissible,
      enableDrag: enableDrag,
      isScrollControlled: isScrollControlled,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
    );
  }
  
  /// Show a dialog
  Future<T?> showDialogWidget<T>(
    Widget dialog, {
    bool barrierDismissible = true,
  }) {
    return showDialog<T>(
      context: context!,
      builder: (context) => dialog,
      barrierDismissible: barrierDismissible,
    );
  }
  
  /// Show a snackbar
  void showSnackBar(
    String message, {
    Duration duration = const Duration(seconds: 3),
    SnackBarAction? action,
    Color? backgroundColor,
  }) {
    final scaffoldMessenger = ScaffoldMessenger.of(context!);
    scaffoldMessenger.clearSnackBars();
    scaffoldMessenger.showSnackBar(
      SnackBar(
        content: Text(message),
        duration: duration,
        action: action,
        backgroundColor: backgroundColor,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
        ),
      ),
    );
  }
}