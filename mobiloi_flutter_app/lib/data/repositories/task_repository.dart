import 'dart:convert';
import 'package:dio/dio.dart';
import '../../core/constants/api_constants.dart';
import '../../core/network/dio_client.dart';
import '../models/task_model.dart';
import '../models/paginated_response.dart';

class TaskRepository {
  final Dio _dio = DioClient().dio;

  Future<List<TaskModel>> getTasks({bool all = true}) async {
    try {
      final response = await _dio.get(
        ApiConstants.tasks,
        queryParameters: all ? {'all': 'true'} : null,
      );
      final dynamic raw = response.data;
      final List list = raw is List
          ? raw
          : (raw is Map ? (raw['tasks'] ?? raw['data'] ?? []) : []);
      return list.map((json) => TaskModel.fromJson(Map<String, dynamic>.from(json as Map))).toList();
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to fetch tasks';
    } catch (e) {
      throw e.toString();
    }
  }

  Future<PaginatedResponse<TaskModel>> getPaginatedTasks({
    int page = 1,
    int limit = 10,
    String? status,
    String? priority,
    String? search,
  }) async {
    try {
      final queryParams = <String, dynamic>{
        'page': page,
        'limit': limit,
      };
      if (status != null && status != 'All') queryParams['status'] = status;
      if (priority != null && priority != 'All') queryParams['priority'] = priority;
      if (search != null && search.trim().isNotEmpty) queryParams['search'] = search.trim();

      final response = await _dio.get(
        ApiConstants.tasks,
        queryParameters: queryParams,
      );
      final dynamic raw = response.data;
      final List list = raw is List
          ? raw
          : (raw is Map ? (raw['tasks'] ?? raw['data'] ?? []) : []);
      final tasks = list.map((json) => TaskModel.fromJson(Map<String, dynamic>.from(json as Map))).toList();

      final paginationJson = raw is Map ? raw['pagination'] as Map<String, dynamic>? : null;

      return PaginatedResponse<TaskModel>(
        items: tasks,
        pagination: paginationJson != null
            ? PaginationMeta.fromJson(paginationJson)
            : PaginationMeta(
                page: page,
                limit: limit,
                total: tasks.length,
                totalPages: (tasks.length / limit).ceil(),
                hasMore: tasks.length >= limit,
              ),
      );
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to fetch tasks';
    } catch (e) {
      throw e.toString();
    }
  }

  Future<Map<String, int>> getTaskSummary() async {
    try {
      final response = await _dio.get('${ApiConstants.tasks}/summary');
      final Map<String, dynamic> data = response.data is Map ? Map<String, dynamic>.from(response.data) : {};
      return {
        'total': (data['total'] as num?)?.toInt() ?? 0,
        'completed': (data['completed'] as num?)?.toInt() ?? 0,
        'inProgress': (data['inProgress'] as num?)?.toInt() ?? 0,
        'pending': (data['pending'] as num?)?.toInt() ?? 0,
      };
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to fetch task summary';
    } catch (e) {
      throw e.toString();
    }
  }

  Future<TaskModel> createTask({
    required String title,
    required String description,
    required String priority,
    String? assignedTo,
    DateTime? dueDate,
    List<PickedAttachment>? attachmentFiles,
  }) async {
    try {
      dynamic payload;
      if (attachmentFiles != null && attachmentFiles.isNotEmpty) {
        final formData = FormData();
        formData.fields.add(MapEntry('title', title));
        formData.fields.add(MapEntry('description', description));
        formData.fields.add(MapEntry('priority', priority));
        if (assignedTo != null && assignedTo.isNotEmpty) {
          formData.fields.add(MapEntry('assignedTo', assignedTo));
        }
        if (dueDate != null) {
          formData.fields.add(MapEntry('dueDate', dueDate.toIso8601String()));
        }

        for (final file in attachmentFiles) {
          formData.files.add(MapEntry(
            'files',
            MultipartFile.fromBytes(file.bytes, filename: file.name),
          ));
        }
        payload = formData;
      } else {
        payload = {
          'title': title,
          'description': description,
          'priority': priority,
          if (assignedTo != null && assignedTo.isNotEmpty) 'assignedTo': assignedTo,
          if (dueDate != null) 'dueDate': dueDate.toIso8601String(),
        };
      }

      final response = await _dio.post(
        ApiConstants.tasks,
        data: payload,
      );
      final dynamic raw = response.data;
      final Map<String, dynamic> taskJson = (raw is Map && raw.containsKey('task'))
          ? Map<String, dynamic>.from(raw['task'])
          : (raw is Map ? Map<String, dynamic>.from(raw) : <String, dynamic>{});
      return TaskModel.fromJson(taskJson);
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to create task';
    }
  }

  Future<TaskModel> updateTask(
    String taskId,
    Map<String, dynamic> data, {
    List<PickedAttachment>? newAttachmentFiles,
    List<String>? retainedAttachmentIds,
  }) async {
    try {
      dynamic payload;
      if (newAttachmentFiles != null && newAttachmentFiles.isNotEmpty) {
        final formData = FormData();
        data.forEach((key, value) {
          if (value != null) {
            formData.fields.add(MapEntry(key, value.toString()));
          }
        });
        if (retainedAttachmentIds != null) {
          formData.fields.add(MapEntry('retainedAttachmentIds', jsonEncode(retainedAttachmentIds)));
        }
        for (final file in newAttachmentFiles) {
          formData.files.add(MapEntry(
            'files',
            MultipartFile.fromBytes(file.bytes, filename: file.name),
          ));
        }
        payload = formData;
      } else {
        final mapPayload = Map<String, dynamic>.from(data);
        if (retainedAttachmentIds != null) {
          mapPayload['retainedAttachmentIds'] = retainedAttachmentIds;
        }
        payload = mapPayload;
      }

      final response = await _dio.put(
        '${ApiConstants.tasks}/$taskId',
        data: payload,
      );
      final dynamic raw = response.data;
      final Map<String, dynamic> taskJson = (raw is Map && raw.containsKey('task'))
          ? Map<String, dynamic>.from(raw['task'])
          : (raw is Map ? Map<String, dynamic>.from(raw) : <String, dynamic>{});
      return TaskModel.fromJson(taskJson);
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to update task';
    }
  }

  Future<TaskModel> updateTaskStatus(String taskId, String status) async {
    return updateTask(taskId, {'status': status});
  }

  Future<void> deleteTask(String taskId) async {
    try {
      await _dio.delete('${ApiConstants.tasks}/$taskId');
    } on DioException catch (e) {
      throw e.error?.toString() ?? 'Failed to delete task';
    }
  }

  String getAttachmentDownloadUrl(String taskId, String attachmentId) {
    return '${ApiConstants.tasks}/$taskId/attachments/$attachmentId/download';
  }

  String getAllAttachmentsDownloadUrl(String taskId) {
    return '${ApiConstants.tasks}/$taskId/attachments/download-all';
  }
}

