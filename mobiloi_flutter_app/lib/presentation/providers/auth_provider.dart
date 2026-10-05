import 'dart:typed_data';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/storage/session_storage.dart';
import '../../data/models/user_model.dart';
import '../../data/repositories/auth_repository.dart';
import 'paginated_state.dart';

final authRepositoryProvider = Provider((ref) => AuthRepository());

final allUsersProvider = FutureProvider.autoDispose<List<UserModel>>((ref) async {
  final authState = ref.watch(authProvider);
  final repo = ref.watch(authRepositoryProvider);
  if (!authState.isAuthenticated || authState.user == null) {
    final token = await SessionStorage.getToken();
    if (token == null || token.isEmpty) {
      return [];
    }
  }

  return repo.getAllUsers();
});

final paginatedUsersProvider = NotifierProvider<PaginatedUsersNotifier, PaginatedState<UserModel>>(PaginatedUsersNotifier.new);

class PaginatedUsersNotifier extends Notifier<PaginatedState<UserModel>> {
  late final AuthRepository _repo;
  String _search = '';
  String _status = 'All';
  String _role = 'All';

  @override
  PaginatedState<UserModel> build() {
    _repo = ref.watch(authRepositoryProvider);
    Future.microtask(() => loadFirstPage());
    return const PaginatedState<UserModel>(isLoadingFirstPage: true);
  }

  String get search => _search;
  String get status => _status;
  String get role => _role;

  Future<void> loadFirstPage() async {
    state = state.copyWith(isLoadingFirstPage: true, error: () => null);
    try {
      final res = await _repo.getPaginatedUsers(
        page: 1,
        limit: 10,
        search: _search,
        status: _status,
        role: _role,
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
      final res = await _repo.getPaginatedUsers(
        page: nextPage,
        limit: 10,
        search: _search,
        status: _status,
        role: _role,
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

  void setFilters({String? search, String? status, String? role}) {
    bool changed = false;
    if (search != null && search != _search) {
      _search = search;
      changed = true;
    }
    if (status != null && status != _status) {
      _status = status;
      changed = true;
    }
    if (role != null && role != _role) {
      _role = role;
      changed = true;
    }
    if (changed) {
      loadFirstPage();
    }
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);

class AuthState {
  final UserModel? user;
  final bool isLoading;
  final String? errorMessage;
  final bool isAuthenticated;

  AuthState({
    this.user,
    this.isLoading = false,
    this.errorMessage,
    this.isAuthenticated = false,
  });

  AuthState copyWith({
    UserModel? user,
    bool? isLoading,
    String? errorMessage,
    bool? isAuthenticated,
  }) {
    return AuthState(
      user: user ?? this.user,
      isLoading: isLoading ?? this.isLoading,
      errorMessage: errorMessage,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
    );
  }
}

class AuthNotifier extends Notifier<AuthState> {
  late final AuthRepository _repo;

  @override
  AuthState build() {
    _repo = ref.watch(authRepositoryProvider);
    checkAuthStatus();
    return AuthState(isLoading: true);
  }

  Future<void> checkAuthStatus() async {
    try {
      final user = await _repo.getProfile();
      if (user != null) {
        state = state.copyWith(
          user: user,
          isAuthenticated: true,
          isLoading: false,
        );
      } else {
        state = state.copyWith(isLoading: false, isAuthenticated: false);
      }
    } catch (_) {
      state = state.copyWith(isLoading: false, isAuthenticated: false);
    }
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final user = await _repo.login(email, password);
      state = state.copyWith(
        user: user,
        isAuthenticated: true,
        isLoading: false,
      );
      // Immediately retrieve the complete database record (including phone, DOB, bio, qualification)
      try {
        final fullUser = await _repo.getProfile();
        if (fullUser != null) {
          state = state.copyWith(user: fullUser);
        }
      } catch (_) {}
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
      return false;
    }
  }

  Future<void> fetchProfile() async {
    try {
      final user = await _repo.getProfile();
      if (user != null) {
        state = state.copyWith(
          user: user,
          isAuthenticated: true,
        );
      }
    } catch (_) {}
  }

  Future<bool> register({
    required String firstName,
    required String lastName,
    required String email,
    required String phoneNumber,
    required String password,
    required String dateOfBirth,
    required String gender,
    required String qualification,
    String? bio,
    String? profilePic,
    required String emailVerificationToken,
    required String phoneVerificationToken,
    String role = 'Employee',
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final user = await _repo.register(
        firstName: firstName,
        lastName: lastName,
        email: email,
        phoneNumber: phoneNumber,
        password: password,
        dateOfBirth: dateOfBirth,
        gender: gender,
        qualification: qualification,
        bio: bio,
        profilePic: profilePic,
        emailVerificationToken: emailVerificationToken,
        phoneVerificationToken: phoneVerificationToken,
        role: role,
      );
      state = state.copyWith(
        user: user,
        isAuthenticated: true,
        isLoading: false,
      );
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        errorMessage: e.toString(),
      );
      return false;
    }
  }

  Future<bool> adminCreateUser({
    required String firstName,
    required String lastName,
    required String email,
  }) async {
    try {
      await _repo.adminCreateUser(
        firstName: firstName,
        lastName: lastName,
        email: email,
      );
      ref.invalidate(allUsersProvider);
      ref.invalidate(paginatedUsersProvider);
      return true;
    } catch (e) {
      state = state.copyWith(errorMessage: e.toString());
      return false;
    }
  }

  Future<bool> toggleBlockUser(String userId) async {
    try {
      await _repo.toggleBlockUser(userId);
      ref.invalidate(allUsersProvider);
      ref.invalidate(paginatedUsersProvider);
      return true;
    } catch (e) {
      state = state.copyWith(errorMessage: e.toString());
      return false;
    }
  }

  Future<bool> deleteUser(String userId) async {
    try {
      await _repo.deleteUser(userId);
      ref.invalidate(allUsersProvider);
      ref.invalidate(paginatedUsersProvider);
      return true;
    } catch (e) {
      state = state.copyWith(errorMessage: e.toString());
      return false;
    }
  }

  Future<bool> updateProfile(Map<String, dynamic> data) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final updatedUser = await _repo.updateProfile(data);
      state = state.copyWith(user: updatedUser, isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  Future<bool> uploadProfilePicture({
    required Uint8List fileBytes,
    required String fileName,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final newUrl = await _repo.uploadProfilePicture(
        fileBytes: fileBytes,
        fileName: fileName,
      );
      if (state.user != null) {
        state = state.copyWith(
          user: state.user!.copyWith(profilePicture: newUrl),
          isLoading: false,
        );
      } else {
        state = state.copyWith(isLoading: false);
      }
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  Future<bool> removeProfilePicture() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      final updatedUser = await _repo.removeProfilePicture();
      state = state.copyWith(user: updatedUser, isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      await _repo.changePassword(
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  Future<bool> deleteAccount() async {
    state = state.copyWith(isLoading: true, errorMessage: null);
    try {
      await _repo.deleteAccount();
      state = AuthState();
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, errorMessage: e.toString());
      return false;
    }
  }

  Future<void> logout() async {
    await _repo.logout();
    state = AuthState();
  }
}
