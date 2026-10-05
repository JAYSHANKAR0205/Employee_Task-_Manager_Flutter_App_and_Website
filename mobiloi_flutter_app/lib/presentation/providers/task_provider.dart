import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/storage/session_storage.dart';
import '../../data/models/task_model.dart';
import '../../data/repositories/task_repository.dart';
import 'auth_provider.dart';

import 'paginated_state.dart';

final taskRepositoryProvider = Provider((ref) => TaskRepository());

final tasksProvider = FutureProvider.autoDispose<List<TaskModel>>((ref) async {
  final authState = ref.watch(authProvider);
  final repo = ref.watch(taskRepositoryProvider);
  if (!authState.isAuthenticated || authState.user == null) {
    final token = await SessionStorage.getToken();
    if (token == null || token.isEmpty) {
      return [];
    }
  }

  return repo.getTasks();
});

final taskSummaryProvider = FutureProvider.autoDispose<Map<String, int>>((ref) async {
  final authState = ref.watch(authProvider);
  final repo = ref.watch(taskRepositoryProvider);
  if (!authState.isAuthenticated || authState.user == null) {
    final token = await SessionStorage.getToken();
    if (token == null || token.isEmpty) {
      return {'total': 0, 'completed': 0, 'inProgress': 0, 'pending': 0};
    }
  }

  return repo.getTaskSummary();
});

final recentTasksProvider = FutureProvider.autoDispose<List<TaskModel>>((ref) async {
  final authState = ref.watch(authProvider);
  final repo = ref.watch(taskRepositoryProvider);
  if (!authState.isAuthenticated || authState.user == null) {
    final token = await SessionStorage.getToken();
    if (token == null || token.isEmpty) {
      return [];
    }
  }

  final res = await repo.getPaginatedTasks(page: 1, limit: 3);
  return res.items;
});

final paginatedTasksProvider = NotifierProvider<PaginatedTasksNotifier, PaginatedState<TaskModel>>(PaginatedTasksNotifier.new);

class PaginatedTasksNotifier extends Notifier<PaginatedState<TaskModel>> {
  late final TaskRepository _repo;
  String _search = '';
  String _status = 'All';
  String _priority = 'All';

  @override
  PaginatedState<TaskModel> build() {
    _repo = ref.watch(taskRepositoryProvider);
    Future.microtask(() => loadFirstPage());
    return const PaginatedState<TaskModel>(isLoadingFirstPage: true);
  }

  String get search => _search;
  String get status => _status;
  String get priority => _priority;

  Future<void> loadFirstPage() async {
    state = state.copyWith(isLoadingFirstPage: true, error: () => null);
    try {
      final res = await _repo.getPaginatedTasks(
        page: 1,
        limit: 10,
        search: _search,
        status: _status,
        priority: _priority,
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
      final res = await _repo.getPaginatedTasks(
        page: nextPage,
        limit: 10,
        search: _search,
        status: _status,
        priority: _priority,
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

  void setFilters({String? search, String? status, String? priority}) {
    bool changed = false;
    if (search != null && search != _search) {
      _search = search;
      changed = true;
    }
    if (status != null && status != _status) {
      _status = status;
      changed = true;
    }
    if (priority != null && priority != _priority) {
      _priority = priority;
      changed = true;
    }
    if (changed) {
      loadFirstPage();
    }
  }
}



final taskActionsProvider = NotifierProvider<TaskActionsNotifier, AsyncValue<void>>(TaskActionsNotifier.new);

class TaskActionsNotifier extends Notifier<AsyncValue<void>> {
  late final TaskRepository _repo;

  @override
  AsyncValue<void> build() {
    _repo = ref.watch(taskRepositoryProvider);
    return const AsyncValue.data(null);
  }

  Future<bool> createTask({
    required String title,
    required String description,
    required String priority,
    String? assignedTo,
    DateTime? dueDate,
    List<PickedAttachment>? attachmentFiles,
  }) async {
    state = const AsyncValue.loading();
    try {
      await _repo.createTask(
        title: title,
        description: description,
        priority: priority,
        assignedTo: assignedTo,
        dueDate: dueDate,
        attachmentFiles: attachmentFiles,
      );
      state = const AsyncValue.data(null);
      ref.invalidate(tasksProvider);
      ref.invalidate(paginatedTasksProvider);
      ref.invalidate(taskSummaryProvider);
      ref.invalidate(recentTasksProvider);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> updateTask(
    String id,
    Map<String, dynamic> data, {
    List<PickedAttachment>? newAttachmentFiles,
    List<String>? retainedAttachmentIds,
  }) async {
    state = const AsyncValue.loading();
    try {
      await _repo.updateTask(
        id,
        data,
        newAttachmentFiles: newAttachmentFiles,
        retainedAttachmentIds: retainedAttachmentIds,
      );
      state = const AsyncValue.data(null);
      ref.invalidate(tasksProvider);
      ref.invalidate(paginatedTasksProvider);
      ref.invalidate(taskSummaryProvider);
      ref.invalidate(recentTasksProvider);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }

  Future<bool> updateTaskStatus(String id, String status) async {
    return updateTask(id, {'status': status});
  }

  Future<bool> deleteTask(String id) async {
    state = const AsyncValue.loading();
    try {
      await _repo.deleteTask(id);
      state = const AsyncValue.data(null);
      ref.invalidate(tasksProvider);
      ref.invalidate(paginatedTasksProvider);
      ref.invalidate(taskSummaryProvider);
      ref.invalidate(recentTasksProvider);
      return true;
    } catch (e, st) {
      state = AsyncValue.error(e, st);
      return false;
    }
  }
}
