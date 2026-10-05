class ApiConstants {
  // In Android Emulator, localhost is 10.0.2.2. For Web / Windows Desktop, it is 127.0.0.1.
  // Can be overridden at build/run time with --dart-define=API_BASE_URL=https://your-api.com/api
  static String get baseUrl {
    return const String.fromEnvironment(
      'API_BASE_URL',
      defaultValue: 'http://172.16.1.218:5000/api',
    );
  }

  // Auth Endpoints
  static const String login = '/users/login';
  static const String register = '/users/register';
  static const String me = '/users/me';

  // Employee Leave Endpoints
  static const String myBalances = '/leaves/balance';
  static const String myRequests = '/leaves/my-requests';
  static const String applyLeave = '/leaves/apply';
  static String cancelLeave(String id) => '/leaves/$id/cancel';

  // Admin Leave Endpoints
  static const String adminAllRequests = '/admin/leaves';
  static const String adminPendingRequests = '/admin/leaves/pending';
  static String adminApprove(String id) => '/admin/leaves/$id/approve';
  static String adminReject(String id) => '/admin/leaves/$id/reject';
  static const String adminBalances = '/admin/leave-balances';
  static const String adminLeaveTypes = '/admin/leave-types';

  // Tasks & Users Endpoints
  static const String tasks = '/tasks';
  static const String employees = '/users';
  static const String allUsers = '/auth/all';
}
