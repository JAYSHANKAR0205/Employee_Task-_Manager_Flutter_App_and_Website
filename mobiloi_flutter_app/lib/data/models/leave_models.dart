class LeaveTypeModel {
  final String id;
  final String name;
  final String? description;
  final int defaultAllocation;
  final bool isActive;

  LeaveTypeModel({
    required this.id,
    required this.name,
    this.description,
    required this.defaultAllocation,
    this.isActive = true,
  });

  factory LeaveTypeModel.fromJson(Map<String, dynamic> json) {
    return LeaveTypeModel(
      id: json['_id'] ?? json['id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'],
      defaultAllocation: (json['defaultAllocation'] as num?)?.toInt() ?? 0,
      isActive: json['isActive'] ?? true,
    );
  }
}

class EmployeeLeaveBalanceModel {
  final String id;
  final String employeeName;
  final String employeeEmail;
  final LeaveTypeModel? leaveType;
  final int totalAllocated;
  final int used;
  final int remaining;

  EmployeeLeaveBalanceModel({
    required this.id,
    required this.employeeName,
    required this.employeeEmail,
    this.leaveType,
    required this.totalAllocated,
    required this.used,
    required this.remaining,
  });

  factory EmployeeLeaveBalanceModel.fromJson(Map<String, dynamic> json) {
    String empName = '';
    String empEmail = '';
    if (json['employee'] != null && json['employee'] is Map) {
      final emp = json['employee'];
      empName = '${emp['firstName'] ?? ''} ${emp['lastName'] ?? ''}'.trim();
      empEmail = emp['email'] ?? '';
    }

    LeaveTypeModel? lt;
    if (json['leaveType'] != null && json['leaveType'] is Map) {
      lt = LeaveTypeModel.fromJson(json['leaveType']);
    }
    return EmployeeLeaveBalanceModel(
      id: json['_id'] ?? json['id'] ?? '',
      employeeName: empName.isNotEmpty ? empName : 'Employee',
      employeeEmail: empEmail,
      leaveType: lt,
      totalAllocated: (json['totalAllocated'] as num?)?.toInt() ?? 0,
      used: (json['used'] as num?)?.toInt() ?? 0,
      remaining: (json['remaining'] as num?)?.toInt() ?? 0,
    );
  }
}

class LeaveRequestModel {
  final String id;
  final String employeeName;
  final String employeeEmail;
  final LeaveTypeModel? leaveType;
  final DateTime startDate;
  final DateTime endDate;
  final int numberOfDays;
  final String reason;
  final String status; // 'Pending' | 'Approved' | 'Rejected' | 'Cancelled'
  final String? rejectionReason;
  final String? actionByName;
  final DateTime? createdAt;

  LeaveRequestModel({
    required this.id,
    required this.employeeName,
    required this.employeeEmail,
    this.leaveType,
    required this.startDate,
    required this.endDate,
    required this.numberOfDays,
    required this.reason,
    required this.status,
    this.rejectionReason,
    this.actionByName,
    this.createdAt,
  });

  factory LeaveRequestModel.fromJson(Map<String, dynamic> json) {
    String empName = '';
    String empEmail = '';
    if (json['employee'] != null && json['employee'] is Map) {
      final emp = json['employee'];
      empName = '${emp['firstName'] ?? ''} ${emp['lastName'] ?? ''}'.trim();
      empEmail = emp['email'] ?? '';
    }

    LeaveTypeModel? lt;
    if (json['leaveType'] != null && json['leaveType'] is Map) {
      lt = LeaveTypeModel.fromJson(json['leaveType']);
    }

    String? actionName;
    if (json['approvedBy'] != null && json['approvedBy'] is Map) {
      final a = json['approvedBy'];
      actionName = '${a['firstName'] ?? ''} ${a['lastName'] ?? ''}'.trim();
    } else if (json['rejectedBy'] != null && json['rejectedBy'] is Map) {
      final r = json['rejectedBy'];
      actionName = '${r['firstName'] ?? ''} ${r['lastName'] ?? ''}'.trim();
    }

    return LeaveRequestModel(
      id: json['_id'] ?? json['id'] ?? '',
      employeeName: empName.isNotEmpty ? empName : 'Employee',
      employeeEmail: empEmail,
      leaveType: lt,
      startDate: DateTime.tryParse(json['startDate'] ?? '') ?? DateTime.now(),
      endDate: DateTime.tryParse(json['endDate'] ?? '') ?? DateTime.now(),
      numberOfDays: (json['numberOfDays'] as num?)?.toInt() ?? 1,
      reason: json['reason'] ?? '',
      status: json['status'] ?? 'Pending',
      rejectionReason: json['rejectionReason'],
      actionByName: actionName,
      createdAt: json['createdAt'] != null ? DateTime.tryParse(json['createdAt']) : null,
    );
  }
}
