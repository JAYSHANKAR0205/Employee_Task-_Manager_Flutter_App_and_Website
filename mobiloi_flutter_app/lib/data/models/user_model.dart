class UserModel {
  final String id;
  final String firstName;
  final String lastName;
  final String email;
  final String role; // 'Employee' | 'Admin'
  final String? profilePicture;
  final bool isBlocked;
  final bool isVerified;
  final bool isProfileComplete;
  final bool isCreatedByAdmin;
  final String? phoneNumber;
  final String? dateOfBirth;
  final String? gender;
  final String? qualification;
  final String? bio;
  final String? createdAt;

  UserModel({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.role,
    this.profilePicture,
    this.isBlocked = false,
    this.isVerified = true,
    this.isProfileComplete = true,
    this.isCreatedByAdmin = false,
    this.phoneNumber,
    this.dateOfBirth,
    this.gender,
    this.qualification,
    this.bio,
    this.createdAt,
  });

  bool get isAdmin => role == 'Admin';
  bool get isEmployee => role == 'Employee';

  String? get profilePic => profilePicture;

  String get fullName => '$firstName $lastName'.trim();

  String get status {
    if (isBlocked) return 'Blocked';
    if (!isVerified || isProfileComplete == false) return 'Pending';
    return 'Active';
  }

  factory UserModel.fromJson(Map<String, dynamic> json) {
    return UserModel(
      id: json['_id'] ?? json['id'] ?? '',
      firstName: json['firstName'] ?? '',
      lastName: json['lastName'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? 'Employee',
      profilePicture: json['profilePicture'] ?? json['profilePic'],
      isBlocked: json['isBlocked'] ?? false,
      isVerified: json['isVerified'] ?? true,
      isProfileComplete: json['isProfileComplete'] ?? true,
      isCreatedByAdmin: json['isCreatedByAdmin'] ?? false,
      phoneNumber: json['phoneNumber'],
      dateOfBirth: json['dateOfBirth'],
      gender: json['gender'],
      qualification: json['qualification'],
      bio: json['bio'],
      createdAt: json['createdAt'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      'role': role,
      'profilePicture': profilePicture,
      'isBlocked': isBlocked,
      'isVerified': isVerified,
      'isProfileComplete': isProfileComplete,
      'isCreatedByAdmin': isCreatedByAdmin,
      'phoneNumber': phoneNumber,
      'dateOfBirth': dateOfBirth,
      'gender': gender,
      'qualification': qualification,
      'bio': bio,
      'createdAt': createdAt,
    };
  }

  UserModel copyWith({
    String? id,
    String? firstName,
    String? lastName,
    String? email,
    String? role,
    String? profilePicture,
    bool? isBlocked,
    bool? isVerified,
    bool? isProfileComplete,
    bool? isCreatedByAdmin,
    String? phoneNumber,
    String? dateOfBirth,
    String? gender,
    String? qualification,
    String? bio,
    String? createdAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      email: email ?? this.email,
      role: role ?? this.role,
      profilePicture: profilePicture ?? this.profilePicture,
      isBlocked: isBlocked ?? this.isBlocked,
      isVerified: isVerified ?? this.isVerified,
      isProfileComplete: isProfileComplete ?? this.isProfileComplete,
      isCreatedByAdmin: isCreatedByAdmin ?? this.isCreatedByAdmin,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      dateOfBirth: dateOfBirth ?? this.dateOfBirth,
      gender: gender ?? this.gender,
      qualification: qualification ?? this.qualification,
      bio: bio ?? this.bio,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
