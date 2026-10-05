import 'dart:convert';
import 'dart:typed_data';
import 'package:dio/dio.dart';
import '../../core/constants/api_constants.dart';
import '../../core/network/dio_client.dart';
import '../../core/storage/session_storage.dart';
import '../models/user_model.dart';
import '../models/paginated_response.dart';

class AuthRepository {
  final Dio _dio = DioClient().dio;

  Future<UserModel> login(String email, String password) async {
    try {
      final response = await _dio.post(
        ApiConstants.login,
        data: {'email': email, 'password': password},
      );

      final token = response.data['token'] ?? response.data['accessToken'];
      if (token != null) {
        await SessionStorage.saveToken(token);
      }

      final userJson = response.data['user'] ?? response.data;
      final user = UserModel.fromJson(userJson);
      await SessionStorage.saveUserData(jsonEncode(user.toJson()));
      return user;
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Login failed';
    }
  }

  Future<UserModel> register({
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
    try {
      final response = await _dio.post(
        ApiConstants.register,
        data: {
          'firstName': firstName,
          'lastName': lastName,
          'email': email,
          'phoneNumber': phoneNumber,
          'password': password,
          'dateOfBirth': dateOfBirth,
          'gender': gender,
          'qualification': qualification,
          if (bio != null && bio.isNotEmpty) 'bio': bio,
          if (profilePic != null && profilePic.isNotEmpty) 'profilePic': profilePic,
          'emailVerificationToken': emailVerificationToken,
          'phoneVerificationToken': phoneVerificationToken,
          'role': role,
        },
      );

      final token = response.data['token'] ?? response.data['accessToken'];
      if (token != null) {
        await SessionStorage.saveToken(token);
      }

      final userJson = response.data['user'] ?? response.data;
      final user = UserModel.fromJson(userJson);
      await SessionStorage.saveUserData(jsonEncode(user.toJson()));
      return user;
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Registration failed';
    }
  }

  Future<void> sendVerificationOTP({
    required String type,
    required String identifier,
    bool? isCrossValidation,
    String? newEmail,
    String? newPhone,
  }) async {
    try {
      final payload = <String, dynamic>{
        'type': type,
        'identifier': identifier,
      };
      if (isCrossValidation != null) payload['isCrossValidation'] = isCrossValidation;
      if (newEmail != null) payload['newEmail'] = newEmail;
      if (newPhone != null) payload['newPhone'] = newPhone;

      await _dio.post(
        '/auth/send-verification-otp',
        data: payload,
      );
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] ?? e.response?.data?['message'] ?? e.error?.toString() ?? 'Failed to send OTP';
      throw msg.toString();
    }
  }

  Future<String> verifyInlineOTP({
    required String type,
    required String identifier,
    required String otp,
  }) async {
    try {
      final response = await _dio.post(
        '/auth/verify-inline-otp',
        data: {'type': type, 'identifier': identifier, 'otp': otp},
      );
      return response.data['verificationToken'] ?? '';
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] ?? e.response?.data?['message'] ?? e.error?.toString() ?? 'Invalid OTP';
      throw msg.toString();
    }
  }

  Future<Map<String, dynamic>> checkAvailability({
    String? email,
    String? phoneNumber,
  }) async {
    try {
      final payload = email != null ? {'email': email} : {'phoneNumber': phoneNumber};
      final response = await _dio.post('/auth/check-email', data: payload);
      return {
        'exists': response.data['exists'] == true,
        'message': response.data['message'],
      };
    } catch (_) {
      return {'exists': false};
    }
  }

  Future<UserModel?> getProfile() async {
    try {
      final response = await _dio.get(ApiConstants.me);
      final userJson = response.data['user'] ?? response.data;
      final user = UserModel.fromJson(userJson);
      await SessionStorage.saveUserData(jsonEncode(user.toJson()));
      return user;
    } catch (_) {
      final cachedJson = await SessionStorage.getUserData();
      if (cachedJson != null) {
        return UserModel.fromJson(jsonDecode(cachedJson));
      }
      return null;
    }
  }

  Future<List<UserModel>> getAllUsers({bool all = true}) async {
    try {
      final response = await _dio.get(
        ApiConstants.allUsers,
        queryParameters: all ? {'all': 'true'} : null,
      );
      final List list = response.data is List ? response.data : (response.data['users'] ?? response.data['data'] ?? []);
      return list.map((json) => UserModel.fromJson(Map<String, dynamic>.from(json as Map))).toList();
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to fetch users';
    }
  }

  Future<PaginatedResponse<UserModel>> getPaginatedUsers({
    int page = 1,
    int limit = 10,
    String? search,
    String? status,
    String? role,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      if (search != null && search.trim().isNotEmpty) {
        queryParams['search'] = search.trim();
      }
      if (status != null && status != 'All') {
        queryParams['status'] = status;
      }
      if (role != null && role != 'All') {
        queryParams['role'] = role;
      }

      final response = await _dio.get(
        ApiConstants.allUsers,
        queryParameters: queryParams,
      );

      final List list = response.data is List
          ? response.data
          : (response.data['users'] ?? response.data['data'] ?? []);
      final users = list.map((json) => UserModel.fromJson(Map<String, dynamic>.from(json as Map))).toList();

      final paginationJson = response.data is Map ? response.data['pagination'] as Map<String, dynamic>? : null;

      return PaginatedResponse<UserModel>(
        items: users,
        pagination: paginationJson != null
            ? PaginationMeta.fromJson(paginationJson)
            : PaginationMeta(
                page: page,
                limit: limit,
                total: users.length,
                totalPages: (users.length / limit).ceil(),
                hasMore: users.length >= limit,
              ),
      );
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to fetch users';
    }
  }

  Future<void> adminCreateUser({
    required String firstName,
    required String lastName,
    required String email,
  }) async {
    try {
      await _dio.post(
        '/auth/admin-create-user',
        data: {
          'firstName': firstName,
          'lastName': lastName,
          'email': email,
        },
      );
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to create employee';
    }
  }

  Future<bool> toggleBlockUser(String userId) async {
    try {
      final response = await _dio.put('/users/$userId/block');
      return response.data['user']?['isBlocked'] ?? true;
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to toggle block status';
    }
  }

  Future<void> deleteUser(String userId) async {
    try {
      await _dio.delete('/users/$userId');
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to delete user';
    }
  }

  Future<UserModel> updateProfile(Map<String, dynamic> data) async {
    try {
      final response = await _dio.put('/auth/profile', data: data);
      final userJson = response.data['user'] ?? response.data;
      final user = UserModel.fromJson(userJson);
      await SessionStorage.saveUserData(jsonEncode(user.toJson()));
      return user;
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] ?? e.response?.data?['message'] ?? e.error?.toString() ?? 'Failed to update profile';
      throw msg.toString();
    }
  }

  Future<String> uploadProfilePicture({
    required Uint8List fileBytes,
    required String fileName,
  }) async {
    try {
      final formData = FormData.fromMap({
        'image': MultipartFile.fromBytes(
          fileBytes,
          filename: fileName,
        ),
      });

      final response = await _dio.post(
        '/users/profile-picture',
        data: formData,
      );

      final newUrl = response.data['profilePicture'] as String? ?? '';
      await getProfile();
      return newUrl;
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to upload profile picture to Cloudinary';
    }
  }

  Future<UserModel> removeProfilePicture() async {
    try {
      final updatedUser = await updateProfile({
        'profilePicture': null,
        'profilePic': null,
      });
      return updatedUser;
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to remove profile picture';
    }
  }

  Future<void> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    try {
      await _dio.post(
        '/auth/change-password',
        data: {
          'currentPassword': currentPassword,
          'newPassword': newPassword,
        },
      );
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to change password';
    }
  }

  Future<void> deleteAccount() async {
    try {
      await _dio.delete('/auth/account');
      await SessionStorage.clearSession();
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to delete account';
    }
  }

  Future<void> sendForgotPasswordOTP(String email) async {
    try {
      await _dio.post('/auth/forgot-password', data: {'email': email});
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] ?? e.response?.data?['validationErrors']?['email'] ?? 'Failed to send OTP';
      throw msg.toString();
    }
  }

  Future<void> verifyForgotOTP(String email, String otp) async {
    try {
      await _dio.post('/auth/verify-forgot-otp', data: {'email': email, 'otp': otp});
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] ?? 'Invalid OTP';
      throw msg.toString();
    }
  }

  Future<void> resetPassword(String email, String otp, String newPassword) async {
    try {
      await _dio.post('/auth/reset-password', data: {
        'email': email,
        'otp': otp,
        'newPassword': newPassword,
      });
    } on DioException catch (e) {
      final msg = e.response?.data?['error'] ?? 'Failed to reset password';
      throw msg.toString();
    }
  }

  Future<void> logout() async {
    await SessionStorage.clearSession();
  }
}
