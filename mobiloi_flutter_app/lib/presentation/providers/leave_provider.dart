import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/storage/session_storage.dart';
import '../../data/models/leave_models.dart';
import '../../data/repositories/leave_repository.dart';
import 'auth_provider.dart';
import 'paginated_state.dart';

final leaveRepositoryProvider = Provider((ref) => LeaveRepository());

Future<bool> _hasValidToken(AuthState authState) async {
  if (!authState.isAuthenticated || authState.user == null) {
    final token = await SessionStorage.getToken();
    if (token == null || token.isEmpty) {
      return false;
    }
  }
  return true;
}

// Employee Balances Provider
final employeeBalancesProvider = FutureProvider.autoDispose<List<EmployeeLeaveBalanceModel>>((ref) async {
  final authState = ref.watch(authProvider);
  final repo = ref.watch(leaveRepositoryProvider);
  if (!await _hasValidToken(authState)) return [];
  return repo.getMyBalances();
});

// Employee Requests Provider (Legacy/All)
final employeeRequestsProvider = FutureProvider.autoDispose.family<List<LeaveRequestModel>, String?>((ref, status) async {
  final authState = ref.watch(authProvider);
  final repo = ref.watch(leaveRepositoryProvider);
  if (!await _hasValidToken(authState)) return [];
  return repo.getMyRequests(status: status);
});

// Paginated Employee Requests Provider
final paginatedEmployeeRequestsProvider = NotifierProvider<PaginatedEmployeeRequestsNotifier, PaginatedState<LeaveRequestModel>>(PaginatedEmployeeRequestsNotifier.new);

class PaginatedEmployeeRequestsNotifier extends Notifier<PaginatedState<LeaveRequestModel>> {
  late final LeaveRepository _repo;
  String _status = 'All';

  @override
  PaginatedState<LeaveRequestModel> build() {
    _repo = ref.watch(leaveRepositoryProvider);
    Future.microtask(() => loadFirstPage());
    return const PaginatedState<LeaveRequestModel>(isLoadingFirstPage: true);
  }

  String get status => _status;

  Future<void> loadFirstPage() async {
    state = state.copyWith(isLoadingFirstPage: true, error: () => null);
    try {
      final res = await _repo.getPaginatedMyRequests(
        page: 1,
        limit: 10,
        status: _status,
      );
      state = state.copyWith(
        items: res.items,
        page: 1,
        limit: res.pagination.limit,
        total: res.pagination.total,
        hasMore: res.pagination.hasMore,
        isLoadingFirstPage: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoadingFirstPage: false,
        error: () => e.toString(),
      );
    }
  }

  Future<void> loadNextPage() async {
    if (state.isLoadingFirstPage || state.isLoadingMore || !state.hasMore) {
      return;
    }

    state = state.copyWith(isLoadingMore: true);
    try {
      final nextPage = state.page + 1;
      final res = await _repo.getPaginatedMyRequests(
        page: nextPage,
        limit: 10,
        status: _status,
      );
      state = state.copyWith(
        items: [...state.items, ...res.items],
        page: nextPage,
        total: res.pagination.total,
        hasMore: res.pagination.hasMore,
        isLoadingMore: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoadingMore: false,
        error: () => e.toString(),
      );
    }
  }

  Future<void> refresh() async {
    await loadFirstPage();
  }

  void setFilter(String status) {
    if (_status != status) {
      _status = status;
      loadFirstPage();
    }
  }
}

// Admin Pending Requests Provider
final adminPendingRequestsProvider = FutureProvider.autoDispose<List<LeaveRequestModel>>((ref) async {
  final authState = ref.watch(authProvider);
  final repo = ref.watch(leaveRepositoryProvider);
  if (!await _hasValidToken(authState)) return [];
  return repo.getAdminPendingRequests();
});

// Admin All Requests Provider (Legacy/All)
final adminAllRequestsProvider = FutureProvider.autoDispose.family<List<LeaveRequestModel>, String?>((ref, status) async {
  final authState = ref.watch(authProvider);
  final repo = ref.watch(leaveRepositoryProvider);
  if (!await _hasValidToken(authState)) return [];
  return repo.getAdminAllRequests(status: status);
});

// Paginated Admin All Requests Provider
final paginatedAdminRequestsProvider = NotifierProvider<PaginatedAdminRequestsNotifier, PaginatedState<LeaveRequestModel>>(PaginatedAdminRequestsNotifier.new);

class PaginatedAdminRequestsNotifier extends Notifier<PaginatedState<LeaveRequestModel>> {
  late final LeaveRepository _repo;
  String _status = 'All';

  @override
  PaginatedState<LeaveRequestModel> build() {
    _repo = ref.watch(leaveRepositoryProvider);
    Future.microtask(() => loadFirstPage());
    return const PaginatedState<LeaveRequestModel>(isLoadingFirstPage: true);
  }

  String get status => _status;

  Future<void> loadFirstPage() async {
    state = state.copyWith(isLoadingFirstPage: true, error: () => null);
    try {
      final res = await _repo.getPaginatedAdminAllRequests(
        page: 1,
        limit: 10,
        status: _status,
      );
      state = state.copyWith(
        items: res.items,
        page: 1,
        limit: res.pagination.limit,
        total: res.pagination.total,
        hasMore: res.pagination.hasMore,
        isLoadingFirstPage: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoadingFirstPage: false,
        error: () => e.toString(),
      );
    }
  }

  Future<void> loadNextPage() async {
    if (state.isLoadingFirstPage || state.isLoadingMore || !state.hasMore) {
      return;
    }

    state = state.copyWith(isLoadingMore: true);
    try {
      final nextPage = state.page + 1;
      final res = await _repo.getPaginatedAdminAllRequests(
        page: nextPage,
        limit: 10,
        status: _status,
      );
      state = state.copyWith(
        items: [...state.items, ...res.items],
        page: nextPage,
        total: res.pagination.total,
        hasMore: res.pagination.hasMore,
        isLoadingMore: false,
      );
    } catch (e) {
      state = state.copyWith(
        isLoadingMore: false,
        error: () => e.toString(),
      );
    }
  }

  Future<void> refresh() async {
    await loadFirstPage();
  }

  void setFilter(String status) {
    if (_status != status) {
      _status = status;
      loadFirstPage();
    }
  }
}

// Admin All Balances Provider
final adminBalancesProvider = FutureProvider.autoDispose<List<EmployeeLeaveBalanceModel>>((ref) async {
  final authState = ref.watch(authProvider);
  final repo = ref.watch(leaveRepositoryProvider);
  if (!await _hasValidToken(authState)) return [];
  return repo.getAdminAllBalances();
});

// Admin Leave Types Provider
final leaveTypesProvider = FutureProvider.autoDispose<List<LeaveTypeModel>>((ref) async {
  final authState = ref.watch(authProvider);
  final repo = ref.watch(leaveRepositoryProvider);
  if (!await _hasValidToken(authState)) return [];
  return repo.getLeaveTypes();
});

// Leave Actions Notifier
final leaveActionsProvider = NotifierProvider<LeaveActionsNotifier, AsyncValue<void>>(LeaveActionsNotifier.new);

class LeaveActionsNotifier extends Notifier<AsyncValue<void>> {
  late final LeaveRepository _repo;

  @override
  AsyncValue<void> build() {
    _repo = ref.watch(leaveRepositoryProvider);
    return const AsyncValue.data(null);
  }

  Future<bool> applyLeave({
    required String leaveTypeId,
    required String startDate,
    required String endDate,
    required String reason,
  }) async {
    state = const AsyncValue.loading();
    try {
      await _repo.applyLeave(
        leaveTypeId: leaveTypeId,
        startDate: startDate,
        endDate: endDate,
        reason: reason,
      );
      state = const AsyncValue.data(null);
      ref.invalidate(employeeBalancesProvider);
      ref.invalidate(employeeRequestsProvider);
      ref.invalidate(paginatedEmployeeRequestsProvider);
      ref.invalidate(paginatedAdminRequestsProvider);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> cancelLeave(String requestId) async {
    state = const AsyncValue.loading();
    try {
      await _repo.cancelLeave(requestId);
      state = const AsyncValue.data(null);
      ref.invalidate(employeeBalancesProvider);
      ref.invalidate(employeeRequestsProvider);
      ref.invalidate(paginatedEmployeeRequestsProvider);
      ref.invalidate(paginatedAdminRequestsProvider);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> approveLeave(String requestId) async {
    state = const AsyncValue.loading();
    try {
      await _repo.approveLeave(requestId);
      state = const AsyncValue.data(null);
      ref.invalidate(adminPendingRequestsProvider);
      ref.invalidate(adminAllRequestsProvider);
      ref.invalidate(adminBalancesProvider);
      ref.invalidate(paginatedEmployeeRequestsProvider);
      ref.invalidate(paginatedAdminRequestsProvider);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> rejectLeave(String requestId, String rejectionReason) async {
    state = const AsyncValue.loading();
    try {
      await _repo.rejectLeave(requestId, rejectionReason);
      state = const AsyncValue.data(null);
      ref.invalidate(adminPendingRequestsProvider);
      ref.invalidate(adminAllRequestsProvider);
      ref.invalidate(paginatedEmployeeRequestsProvider);
      ref.invalidate(paginatedAdminRequestsProvider);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> createLeaveType({
    required String name,
    required String description,
    required int defaultAllocation,
  }) async {
    state = const AsyncValue.loading();
    try {
      await _repo.createLeaveType(
        name: name,
        description: description,
        defaultAllocation: defaultAllocation,
      );
      state = const AsyncValue.data(null);
      ref.invalidate(leaveTypesProvider);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> toggleLeaveTypeActive(String typeId, bool currentActive) async {
    state = const AsyncValue.loading();
    try {
      await _repo.toggleLeaveTypeActive(typeId, currentActive);
      state = const AsyncValue.data(null);
      ref.invalidate(leaveTypesProvider);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }
}
