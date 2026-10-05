import 'dart:typed_data';

class TaskAttachment {
  final String id;
  final String fileName;
  final String fileUrl;
  final String fileType; // 'image' | 'document'
  final String? mimeType;
  final int? fileSize;
  final DateTime? uploadedAt;

  const TaskAttachment({
    required this.id,
    required this.fileName,
    required this.fileUrl,
    this.fileType = 'document',
    this.mimeType,
    this.fileSize,
    this.uploadedAt,
  });

  bool get isImage {
    final lowerType = fileType.toLowerCase();
    final lowerName = fileName.toLowerCase();
    return lowerType == 'image' ||
        lowerName.endsWith('.jpg') ||
        lowerName.endsWith('.jpeg') ||
        lowerName.endsWith('.png') ||
        lowerName.endsWith('.webp');
  }

  factory TaskAttachment.fromJson(dynamic json) {
    if (json is String) {
      final name = json.split('/').last;
      return TaskAttachment(
        id: '',
        fileName: name.isNotEmpty ? name : 'attachment',
        fileUrl: json,
        fileType: _guessFileType(name),
      );
    }
    if (json is Map) {
      final map = Map<String, dynamic>.from(json);
      final rawName = map['fileName'] ?? map['name'] ?? 'attachment';
      return TaskAttachment(
        id: (map['id'] ?? map['_id'] ?? '').toString(),
        fileName: rawName.toString(),
        fileUrl: (map['fileUrl'] ?? map['url'] ?? '').toString(),
        fileType: (map['fileType'] ?? map['type'] ?? _guessFileType(rawName.toString())).toString(),
        mimeType: map['mimeType']?.toString() ?? map['mimetype']?.toString(),
        fileSize: map['fileSize'] is num
            ? (map['fileSize'] as num).toInt()
            : (map['size'] is num ? (map['size'] as num).toInt() : null),
        uploadedAt: map['uploadedAt'] != null
            ? DateTime.tryParse(map['uploadedAt'].toString())
            : null,
      );
    }
    return const TaskAttachment(id: '', fileName: 'Unknown', fileUrl: '');
  }

  static String _guessFileType(String name) {
    final lower = name.toLowerCase();
    if (lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.png') ||
        lower.endsWith('.webp')) {
      return 'image';
    }
    return 'document';
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'fileName': fileName,
    'fileUrl': fileUrl,
    'fileType': fileType,
    if (mimeType != null) 'mimeType': mimeType,
    if (fileSize != null) 'fileSize': fileSize,
    if (uploadedAt != null) 'uploadedAt': uploadedAt!.toIso8601String(),
  };
}

class TaskModel {
  final String id;
  final String title;
  final String description;
  final String status; // 'Pending' | 'In Progress' | 'Completed'
  final String priority; // 'Low' | 'Medium' | 'High'
  final DateTime? dueDate;
  final String? assignedToName;
  final String? assignedToId;
  final int? taskId;
  final List<TaskAttachment> attachments;

  const TaskModel({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.priority,
    this.dueDate,
    this.assignedToName,
    this.assignedToId,
    this.taskId,
    this.attachments = const [],
  });

  factory TaskModel.fromJson(Map<String, dynamic> json) {
    String? assignedName;
    String? assignedId;
    if (json['assignedTo'] != null) {
      if (json['assignedTo'] is Map) {
        final u = json['assignedTo'];
        assignedName = '${u['firstName'] ?? ''} ${u['lastName'] ?? ''}'.trim();
        assignedId = u['_id']?.toString() ?? u['id']?.toString();
      } else {
        assignedName = json['assignedTo'].toString();
        assignedId = json['assignedTo'].toString();
      }
    }

    // Parse attachments with backward compatibility for single attachment field
    final List<TaskAttachment> parsedAttachments = [];
    if (json['attachments'] is List) {
      for (final item in json['attachments'] as List) {
        if (item != null) {
          parsedAttachments.add(TaskAttachment.fromJson(item));
        }
      }
    } else if (json['attachment'] != null) {
      // Legacy single attachment support
      parsedAttachments.add(TaskAttachment.fromJson(json['attachment']));
    }

    return TaskModel(
      id: json['_id']?.toString() ?? json['id']?.toString() ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      status: json['status'] ?? 'Pending',
      priority: json['priority'] ?? 'Medium',
      dueDate: json['dueDate'] != null ? DateTime.tryParse(json['dueDate'].toString()) : null,
      assignedToName: assignedName,
      assignedToId: assignedId,
      taskId: json['taskId'] != null ? (json['taskId'] as num).toInt() : null,
      attachments: parsedAttachments,
    );
  }
}

class PickedAttachment {
  final String name;
  final Uint8List bytes;
  final int size;
  final String? extension;

  const PickedAttachment({
    required this.name,
    required this.bytes,
    required this.size,
    this.extension,
  });

  bool get isImage {
    final ext = (extension ?? name.split('.').last).toLowerCase();
    return ['jpg', 'jpeg', 'png', 'webp'].contains(ext);
  }
}
