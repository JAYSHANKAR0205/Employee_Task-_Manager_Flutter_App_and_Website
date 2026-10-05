import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'presentation/providers/auth_provider.dart';
import 'presentation/screens/auth/forgot_password_screen.dart';
import 'presentation/screens/auth/login_screen.dart';
import 'presentation/screens/auth/register_screen.dart';
import 'presentation/screens/dashboard/dashboard_screen.dart';
import 'presentation/screens/employees/employee_list_screen.dart';
import 'presentation/screens/leaves/admin_leaves_screen.dart';
import 'presentation/screens/leaves/employee_leaves_screen.dart';
import 'presentation/screens/profile/edit_profile_screen.dart';
import 'presentation/screens/profile/profile_screen.dart';
import 'presentation/screens/settings/settings_screen.dart';
import 'presentation/screens/tasks/task_list_screen.dart';

final appRouterProvider = Provider<GoRouter>((ref) {
  final authNotifier = ValueNotifier<AuthState>(ref.read(authProvider));

  ref.listen<AuthState>(authProvider, (_, next) {
    authNotifier.value = next;
  });

  return GoRouter(
    initialLocation: '/dashboard',
    refreshListenable: authNotifier,
    redirect: (BuildContext context, GoRouterState state) {
      final authState = authNotifier.value;
      final isAuthenticated = authState.isAuthenticated;
      final user = authState.user;
      final isAuthRoute = state.matchedLocation == '/login' ||
          state.matchedLocation == '/register' ||
          state.matchedLocation == '/forgot-password';

      if (authState.isLoading) {
        return null;
      }

      if (!isAuthenticated) {
        return isAuthRoute ? null : '/login';
      }

      if (isAuthRoute) {
        return '/dashboard';
      }

      // Role Based Access Control Guards
      final isAdmin = user?.isAdmin ?? false;

      // 1. Admin navigating to Employee /leaves -> redirect to /admin-leaves
      if (isAdmin && state.matchedLocation == '/leaves') {
        return '/admin-leaves';
      }

      // 2. Non-Admin navigating to Admin routes (/admin-leaves or /employees) -> redirect to /dashboard
      if (!isAdmin &&
          (state.matchedLocation == '/admin-leaves' || state.matchedLocation == '/employees')) {
        return '/dashboard';
      }

      return null;
    },
    routes: [
      GoRoute(
        path: '/login',
        pageBuilder: (context, state) => buildAppPageTransition(
          context: context,
          state: state,
          child: const LoginScreen(),
        ),
      ),
      GoRoute(
        path: '/register',
        pageBuilder: (context, state) => buildAppPageTransition(
          context: context,
          state: state,
          child: const RegisterScreen(),
        ),
      ),
      GoRoute(
        path: '/forgot-password',
        pageBuilder: (context, state) => buildAppPageTransition(
          context: context,
          state: state,
          child: const ForgotPasswordScreen(),
        ),
      ),
      GoRoute(
        path: '/dashboard',
        pageBuilder: (context, state) => buildAppPageTransition(
          context: context,
          state: state,
          child: const DashboardScreen(),
        ),
      ),
      GoRoute(
        path: '/tasks',
        pageBuilder: (context, state) {
          final statusFilter = state.uri.queryParameters['status'] ??
              (state.extra as Map<String, dynamic>?)?['statusFilter'] as String?;
          return buildAppPageTransition(
            context: context,
            state: state,
            child: TaskListScreen(
              key: ValueKey('tasks_${statusFilter ?? 'all'}'),
              initialStatusFilter: statusFilter,
            ),
          );
        },
      ),
      GoRoute(
        path: '/leaves',
        pageBuilder: (context, state) => buildAppPageTransition(
          context: context,
          state: state,
          child: const EmployeeLeavesScreen(),
        ),
      ),
      GoRoute(
        path: '/admin-leaves',
        pageBuilder: (context, state) => buildAppPageTransition(
          context: context,
          state: state,
          child: const AdminLeavesScreen(),
        ),
      ),
      GoRoute(
        path: '/employees',
        pageBuilder: (context, state) => buildAppPageTransition(
          context: context,
          state: state,
          child: const EmployeeListScreen(),
        ),
      ),
      GoRoute(
        path: '/profile',
        pageBuilder: (context, state) => buildAppPageTransition(
          context: context,
          state: state,
          child: const ProfileScreen(),
        ),
      ),
      GoRoute(
        path: '/profile/edit',
        pageBuilder: (context, state) => buildAppPageTransition(
          context: context,
          state: state,
          child: const EditProfileScreen(),
        ),
      ),
      GoRoute(
        path: '/edit-profile',
        pageBuilder: (context, state) => buildAppPageTransition(
          context: context,
          state: state,
          child: const EditProfileScreen(),
        ),
      ),
      GoRoute(
        path: '/settings',
        pageBuilder: (context, state) => buildAppPageTransition(
          context: context,
          state: state,
          child: const SettingsScreen(),
        ),
      ),
    ],
  );
});

/// Enterprise slide page transition builder.
///
/// Push / Forward navigation: slides in Right → Left (Offset(1.0, 0.0) -> Offset.zero).
/// Pop / Backward navigation: slides out Left → Right (Offset.zero -> Offset(1.0, 0.0)).
/// Reverse replacement (e.g. Register -> Login): slides in Left → Right (Offset(-1.0, 0.0) -> Offset.zero).
CustomTransitionPage<T> buildAppPageTransition<T>({
  required BuildContext context,
  required GoRouterState state,
  required Widget child,
}) {
  final isBack = state.extra is Map && (state.extra as Map)['isBack'] == true;

  return CustomTransitionPage<T>(
    key: state.pageKey,
    child: child,
    transitionDuration: const Duration(milliseconds: 300),
    reverseTransitionDuration: const Duration(milliseconds: 300),
    transitionsBuilder: (context, animation, secondaryAnimation, child) {
      final curvedAnimation = CurvedAnimation(
        parent: animation,
        curve: Curves.easeInOutCubic,
        reverseCurve: Curves.easeInOutCubic,
      );

      final curvedSecondary = CurvedAnimation(
        parent: secondaryAnimation,
        curve: Curves.easeInOutCubic,
        reverseCurve: Curves.easeInOutCubic,
      );

      return SlideTransition(
        position: Tween<Offset>(
          begin: Offset.zero,
          end: const Offset(-0.25, 0.0),
        ).animate(curvedSecondary),
        child: SlideTransition(
          position: Tween<Offset>(
            begin: isBack ? const Offset(-1.0, 0.0) : const Offset(1.0, 0.0),
            end: Offset.zero,
          ).animate(curvedAnimation),
          child: child,
        ),
      );
    },
  );
}
