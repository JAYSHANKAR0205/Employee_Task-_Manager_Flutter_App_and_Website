import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Centralized navigation helper to provide controlled navigation history,
/// preventing duplicate route accumulation and debounce-protecting rapid taps.
class AppNavigation {
  static DateTime _lastNavTime = DateTime.fromMillisecondsSinceEpoch(0);
  static const Duration _debounceDuration = Duration(milliseconds: 300);

  /// Checks if a navigation action should proceed based on debouncing.
  static bool shouldNavigate() {
    final now = DateTime.now();
    if (now.difference(_lastNavTime) < _debounceDuration) {
      return false;
    }
    _lastNavTime = now;
    return true;
  }

  /// Resets the debounce timer (useful for testing).
  @visibleForTesting
  static void resetDebounce() {
    _lastNavTime = DateTime.fromMillisecondsSinceEpoch(0);
  }

  /// Replaces the current route with [location].
  ///
  /// Prevents duplicate navigation if the current URI or matched location is already [location].
  /// On Flutter Web, this performs [window.history.replaceState], preventing history accumulation.
  static void replace(BuildContext context, String location, {Object? extra}) {
    if (!context.mounted) return;
    try {
      final currentUri = GoRouterState.of(context).uri.toString();
      final currentMatched = GoRouterState.of(context).matchedLocation;
      if (currentUri == location || currentMatched == location) {
        return;
      }
    } catch (_) {}

    if (!shouldNavigate()) return;
    context.replace(location, extra: extra);
  }

  /// Navigates to [location] using [context.go].
  ///
  /// Prevents duplicate navigation if the current URI or matched location is already [location].
  static void go(BuildContext context, String location, {Object? extra}) {
    if (!context.mounted) return;
    try {
      final currentUri = GoRouterState.of(context).uri.toString();
      final currentMatched = GoRouterState.of(context).matchedLocation;
      if (currentUri == location || currentMatched == location) {
        return;
      }
    } catch (_) {}

    if (!shouldNavigate()) return;
    context.go(location, extra: extra);
  }

  /// Pushes [location] to the history stack (for detail screens like Edit Profile).
  ///
  /// Prevents duplicate push if already on that location.
  static Future<T?> push<T extends Object?>(BuildContext context, String location, {Object? extra}) async {
    if (!context.mounted) return null;
    try {
      final currentUri = GoRouterState.of(context).uri.toString();
      final currentMatched = GoRouterState.of(context).matchedLocation;
      if (currentUri == location || currentMatched == location) {
        return null;
      }
    } catch (_) {}

    if (!shouldNavigate()) return null;
    return context.push<T>(location, extra: extra);
  }

  /// Pops the current route if possible, otherwise falls back to navigating to [fallbackLocation]
  /// with reverse transition direction.
  static void popOrGo(BuildContext context, String fallbackLocation) {
    if (!context.mounted) return;
    if (context.canPop()) {
      context.pop();
    } else {
      go(context, fallbackLocation, extra: const {'isBack': true});
    }
  }
}
