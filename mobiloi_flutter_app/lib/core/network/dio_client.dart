import 'package:dio/dio.dart';
import '../constants/api_constants.dart';
import '../storage/session_storage.dart';

class DioClient {
  static final DioClient _instance = DioClient._internal();
  late final Dio dio;

  factory DioClient() => _instance;

  DioClient._internal() {
    dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await SessionStorage.getToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException e, handler) async {
          String errorMessage = 'An unexpected error occurred';
          if (e.response != null) {
            if (e.response?.statusCode == 401) {
              await SessionStorage.clearSession();
              errorMessage = 'Session expired. Please sign in again.';
            } else if (e.response?.data != null) {
              final data = e.response?.data;
              if (data is Map && data.containsKey('error')) {
                errorMessage = data['error'];
              } else if (data is Map && data.containsKey('message')) {
                errorMessage = data['message'];
              }
            }
          } else if (e.type == DioExceptionType.connectionTimeout ||
              e.type == DioExceptionType.receiveTimeout) {
            errorMessage = 'Connection timeout. Please check your network.';
          } else if (e.type == DioExceptionType.connectionError) {
            errorMessage = 'Server unreachable. Ensure backend is running.';
          }
          return handler.next(
            DioException(
              requestOptions: e.requestOptions,
              response: e.response,
              type: e.type,
              error: errorMessage,
            ),
          );
        },
      ),
    );
  }
}
