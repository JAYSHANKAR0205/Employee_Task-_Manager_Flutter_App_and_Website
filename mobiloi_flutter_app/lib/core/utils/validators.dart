class Validators {
  static String? validateLeaveReason(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Reason is required.';
    }
    final trimmed = value.trim();
    if (trimmed.length > 500) {
      return 'Reason cannot exceed 500 characters.';
    }
    final reasonRegExp = RegExp(r'^[a-zA-Z0-9\s]+$');
    if (!reasonRegExp.hasMatch(trimmed)) {
      return 'Reason can only contain letters, numbers, and spaces. Special characters are not allowed.';
    }
    return null;
  }

  static String? validateFirstName(String? value) {
    if (value == null || value.isEmpty) {
      return 'Please enter your first name.';
    }
    if (RegExp(r'\s').hasMatch(value)) {
      return 'Please enter valid first name.';
    }
    if (value.length < 2 || value.length > 50) {
      return 'Please enter valid first name.';
    }
    if (!RegExp(r'^[A-Za-z]+$').hasMatch(value)) {
      return 'Please enter valid first name.';
    }
    return null;
  }

  static String? validateLastName(String? value) {
    if (value == null || value.isEmpty) {
      return 'Please enter your last name.';
    }
    if (RegExp(r'^\s|\s$').hasMatch(value) || RegExp(r'\s{2,}').hasMatch(value)) {
      return 'Please enter valid last name.';
    }
    if (value.length < 2 || value.length > 50) {
      return 'Please enter valid last name.';
    }
    if (!RegExp(r"^[a-zA-Z\s\-']+$").hasMatch(value)) {
      return 'Please enter valid last name.';
    }
    return null;
  }

  static String? validateEmail(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Please enter your email.';
    }
    final email = value.trim();
    if (email.length > 254) {
      return 'Please enter a valid email.';
    }
    if (RegExp(r'''[\x00-\x1F<>'";=]|OR\b|AND\b''', caseSensitive: false).hasMatch(email) ||
        RegExp(r'[^\x00-\x7F]').hasMatch(email)) {
      return 'Please enter a valid email.';
    }
    final parts = email.split('@');
    if (parts.length != 2) {
      return 'Please enter a valid email.';
    }
    final localPart = parts[0];
    final domainPart = parts[1];
    if (localPart.isEmpty || localPart.length > 64 || domainPart.isEmpty || domainPart.length > 253) {
      return 'Please enter a valid email.';
    }
    if (!RegExp(r'^[a-zA-Z0-9._\-+]+$').hasMatch(localPart)) {
      return 'Please enter a valid email.';
    }
    if (localPart.contains('..') || domainPart.contains('..') || localPart.startsWith('.') || localPart.endsWith('.')) {
      return 'Please enter a valid email.';
    }
    if (!domainPart.contains('.')) {
      return 'Please enter a valid email.';
    }
    final domainPartLower = domainPart.toLowerCase();
    if (domainPartLower.contains('gmail') && domainPartLower != 'gmail.com') {
      return 'Please enter a valid email.';
    }
    if (domainPartLower.contains('yahoo')) {
      const validYahoo = ['yahoo.com', 'yahoo.co.uk', 'yahoo.co.in', 'ymail.com'];
      if (!validYahoo.contains(domainPartLower)) return 'Please enter a valid email.';
    }
    if (domainPartLower.contains('outlook') || domainPartLower.contains('hotmail')) {
      const validMicrosoft = ['outlook.com', 'hotmail.com', 'live.com', 'msn.com'];
      if (!validMicrosoft.contains(domainPartLower)) return 'Please enter a valid email.';
    }
    return null;
  }

  static String? validatePhoneNumber(String? value, {int expectedLength = 10}) {
    if (value == null || value.trim().isEmpty) {
      return 'Please enter your phone number.';
    }
    final cleaned = value.replaceAll(RegExp(r'[\s\-\(\)]'), '');
    final digitsOnly = cleaned.replaceAll(RegExp(r'\D'), '');
    if (digitsOnly.length != expectedLength) {
      return 'Phone number must be $expectedLength digits for selected country.';
    }
    return null;
  }

  static String? validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Please enter your password.';
    }
    if (value.length < 8) {
      return 'Please enter min 8 character password.';
    }
    if (value.length > 100) {
      return 'Password cannot exceed 100 characters.';
    }
    if (!RegExp(r'(?=.*[a-z])').hasMatch(value)) {
      return 'Please enter 1 lower case.';
    }
    if (!RegExp(r'(?=.*[A-Z])').hasMatch(value)) {
      return 'Please enter 1 upper case.';
    }
    if (!RegExp(r'(?=.*\d)').hasMatch(value)) {
      return 'Please enter 1 number.';
    }
    if (!RegExp(r'(?=.*[^A-Za-z0-9])').hasMatch(value)) {
      return 'Please enter 1 special character.';
    }
    return null;
  }

  static String? validateConfirmPassword(String? password, String? confirmPassword) {
    if (confirmPassword == null || confirmPassword.isEmpty) {
      return 'Please confirm your password.';
    }
    if (password != confirmPassword) {
      return 'Passwords do not match.';
    }
    return null;
  }

  static String? validateDateOfBirth(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Please enter your date of birth.';
    }
    try {
      final date = DateTime.parse(value.trim());
      if (date.isAfter(DateTime.now())) {
        return 'Date of Birth cannot be in the future.';
      }
    } catch (_) {}
    return null;
  }

  static String? validateBio(String? value) {
    if (value == null || value.isEmpty) return null;
    if (value.length > 500) {
      return 'Bio cannot exceed 500 characters.';
    }
    if (RegExp(r'\s{2,}').hasMatch(value)) {
      return 'Bio cannot contain continuous spaces.';
    }
    if (!RegExp(r'^[a-zA-Z0-9\s,.\-()]*$').hasMatch(value)) {
      return 'Only letters, numbers, spaces, commas, hyphens (-), brackets (), and full stops (.) are allowed.';
    }
    return null;
  }

  static String? validateTaskTitle(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Task title is required.';
    }
    final trimmed = value.trim();
    if (trimmed.length > 100) {
      return 'Task title cannot exceed 100 characters.';
    }
    if (RegExp(r'\s{2,}').hasMatch(trimmed)) {
      return 'Task title cannot contain continuous spaces.';
    }
    if (!RegExp(r'^[a-zA-Z\s]*$').hasMatch(trimmed)) {
      return 'Task title cannot contain numbers or special characters.';
    }
    return null;
  }

  static String? validateTaskDescription(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Task description is required.';
    }
    final trimmed = value.trim();
    if (trimmed.length > 300) {
      return 'Task description cannot exceed 300 characters.';
    }
    if (RegExp(r'\s{2,}').hasMatch(trimmed)) {
      return 'Task description cannot contain continuous spaces.';
    }
    if (!RegExp(r'^[a-zA-Z0-9\s.,\-]*$').hasMatch(trimmed)) {
      return 'Task description cannot contain special characters other than commas, hyphens, and full stops.';
    }
    return null;
  }

  static String? validateTaskDueDate(DateTime? date) {
    if (date == null) {
      return 'Due date is required.';
    }
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final target = DateTime(date.year, date.month, date.day);
    if (target.isBefore(today)) {
      return 'Task due date cannot be in the past.';
    }
    return null;
  }

  static String? validateTaskAssignee(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Please select an assignee';
    }
    return null;
  }

  static String? validateQualification(String? value) {
    if (value == null || value.trim().isEmpty) {
      return 'Please select your qualification.';
    }
    const valid = ['10th', '12th', 'Graduation', 'Post Graduation', 'PhD', 'Other', "Bachelor's", "Master's"];
    if (!valid.contains(value)) {
      return 'Please select a valid qualification.';
    }
    return null;
  }

  static String? validateRequired(String? value, String fieldName) {
    if (value == null || value.trim().isEmpty) {
      return '$fieldName is required.';
    }
    return null;
  }
}
