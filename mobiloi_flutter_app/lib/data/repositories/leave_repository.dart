import 'package:dio/dio.dart';
import '../../core/constants/api_constants.dart';
import '../../core/network/dio_client.dart';
import '../models/leave_models.dart';
import '../models/paginated_response.dart';

class LeaveRepository {
  final Dio _dio = DioClient().dio;

  // -----------------------------------------------------------------
  // EMPLOYEE APIs
  // -----------------------------------------------------------------

  Future<List<EmployeeLeaveBalanceModel>> getMyBalances() async {
    try {
      final response = await _dio.get(ApiConstants.myBalances);
      final List list = response.data['balances'] ?? [];
      return list.map((json) => EmployeeLeaveBalanceModel.fromJson(json)).toList();
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to fetch leave balances';
    }
  }

  Future<List<LeaveRequestModel>> getMyRequests({String? status}) async {
    try {
      final response = await _dio.get(
        ApiConstants.myRequests,
        queryParameters: status != null && status != 'All' ? {'status': status, 'all': 'true'} : {'all': 'true'},
      );
      final List list = response.data['requests'] ?? [];
      return list.map((json) => LeaveRequestModel.fromJson(json)).toList();
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to fetch leave requests';
    }
  }

  Future<PaginatedResponse<LeaveRequestModel>> getPaginatedMyRequests({
    int page = 1,
    int limit = 10,
    String? status,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      if (status != null && status != 'All') queryParams['status'] = status;

      final response = await _dio.get(
        ApiConstants.myRequests,
        queryParameters: queryParams,
      );
      final List list = response.data['requests'] ?? [];
      final requests = list.map((json) => LeaveRequestModel.fromJson(json)).toList();

      final paginationJson = response.data is Map ? response.data['pagination'] as Map<String, dynamic>? : null;

      return PaginatedResponse<LeaveRequestModel>(
        items: requests,
        pagination: paginationJson != null
            ? PaginationMeta.fromJson(paginationJson)
            : PaginationMeta(
                page: page,
                limit: limit,
                total: requests.length,
                totalPages: (requests.length / limit).ceil(),
                hasMore: requests.length >= limit,
              ),
      );
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to fetch leave requests';
    }
  }

  Future<LeaveRequestModel> applyLeave({
    required String leaveTypeId,
    required String startDate,
    required String endDate,
    required String reason,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.applyLeave,
        data: {
          'leaveTypeId': leaveTypeId,
          'startDate': startDate,
          'endDate': endDate,
          'reason': reason,
        },
      );
      final requestJson = response.data['request'] ?? response.data;
      return LeaveRequestModel.fromJson(requestJson);
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to submit leave application';
    }
  }

  Future<void> cancelLeave(String requestId) async {
    try {
      await _dio.patch(ApiConstants.cancelLeave(requestId));
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to cancel leave request';
    }
  }

  // -----------------------------------------------------------------
  // ADMIN APIs
  // -----------------------------------------------------------------

  Future<List<LeaveRequestModel>> getAdminAllRequests({String? status}) async {
    try {
      final response = await _dio.get(
        ApiConstants.adminAllRequests,
        queryParameters: status != null && status != 'All' ? {'status': status, 'all': 'true'} : {'all': 'true'},
      );
      final List list = response.data['requests'] ?? [];
      return list.map((json) => LeaveRequestModel.fromJson(json)).toList();
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to fetch admin leave requests';
    }
  }

  Future<PaginatedResponse<LeaveRequestModel>> getPaginatedAdminAllRequests({
    int page = 1,
    int limit = 10,
    String? status,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      if (status != null && status != 'All') queryParams['status'] = status;

      final response = await _dio.get(
        ApiConstants.adminAllRequests,
        queryParameters: queryParams,
      );
      final List list = response.data['requests'] ?? [];
      final requests = list.map((json) => LeaveRequestModel.fromJson(json)).toList();

      final paginationJson = response.data is Map ? response.data['pagination'] as Map<String, dynamic>? : null;

      return PaginatedResponse<LeaveRequestModel>(
        items: requests,
        pagination: paginationJson != null
            ? PaginationMeta.fromJson(paginationJson)
            : PaginationMeta(
                page: page,
                limit: limit,
                total: requests.length,
                totalPages: (requests.length / limit).ceil(),
                hasMore: requests.length >= limit,
              ),
      );
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to fetch admin leave requests';
    }
  }

  Future<List<LeaveRequestModel>> getAdminPendingRequests() async {
    try {
      final response = await _dio.get(ApiConstants.adminPendingRequests);
      final List list = response.data['requests'] ?? [];
      return list.map((json) => LeaveRequestModel.fromJson(json)).toList();
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to fetch pending requests';
    }
  }

  Future<LeaveRequestModel> approveLeave(String requestId) async {
    try {
      final response = await _dio.patch(ApiConstants.adminApprove(requestId));
      final requestJson = response.data['request'] ?? response.data;
      return LeaveRequestModel.fromJson(requestJson);
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to approve leave request';
    }
  }

  Future<LeaveRequestModel> rejectLeave(String requestId, String rejectionReason) async {
    try {
      final response = await _dio.patch(
        ApiConstants.adminReject(requestId),
        data: {'rejectionReason': rejectionReason},
      );
      final requestJson = response.data['request'] ?? response.data;
      return LeaveRequestModel.fromJson(requestJson);
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to reject leave request';
    }
  }

  Future<List<EmployeeLeaveBalanceModel>> getAdminAllBalances() async {
    try {
      final response = await _dio.get(ApiConstants.adminBalances);
      final List list = response.data['balances'] ?? [];
      return list.map((json) => EmployeeLeaveBalanceModel.fromJson(json)).toList();
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to fetch employee balances';
    }
  }

  Future<List<LeaveTypeModel>> getLeaveTypes() async {
    try {
      final response = await _dio.get(ApiConstants.adminLeaveTypes);
      final List list = response.data['leaveTypes'] ?? [];
      return list.map((json) => LeaveTypeModel.fromJson(json)).toList();
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to fetch leave types';
    }
  }

  Future<LeaveTypeModel> createLeaveType({
    required String name,
    required String description,
    required int defaultAllocation,
  }) async {
    try {
      final response = await _dio.post(
        ApiConstants.adminLeaveTypes,
        data: {
          'name': name,
          'description': description,
          'defaultAllocation': defaultAllocation,
        },
      );
      final json = response.data['leaveType'] ?? response.data;
      return LeaveTypeModel.fromJson(json);
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to create leave type';
    }
  }

  Future<void> toggleLeaveTypeActive(String typeId, bool currentActive) async {
    try {
      await _dio.patch(
        '${ApiConstants.adminLeaveTypes}/$typeId',
        data: {'isActive': !currentActive},
      );
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to update leave type status';
    }
  }
}
