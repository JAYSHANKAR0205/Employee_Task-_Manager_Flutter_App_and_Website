import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';

import '../../../core/constants/app_colors.dart';
import '../../../core/utils/app_navigation.dart';
import '../../../core/utils/validators.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/country_code_selector.dart';
import '../../widgets/profile_picture_picker.dart';
import '../../widgets/unified_phone_input.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen> {
  final _formKey = GlobalKey<FormState>();

  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _dobController = TextEditingController();
  final _bioController = TextEditingController();

  final _emailOtpController = TextEditingController();
  final _phoneOtpController = TextEditingController();

  CountryInfo _selectedCountry = CountryData.defaultCountry;
  String? _phoneError;
  String? _selectedGender;
  String? _selectedQualification;

  Uint8List? _newAvatarBytes;
  String? _newAvatarDataUrl;
  bool _removeAvatarRequested = false;

  bool _isSubmitting = false;
  String? _submitError;
  bool _isInitialized = false;
  bool _canPopNow = false;

  // Cross-verification OTP state for Email change
  bool _emailVerified = true;
  String? _emailVerificationToken;
  bool _emailOtpSent = false;
  bool _isSendingEmailOtp = false;
  bool _isVerifyingEmailOtp = false;
  String? _emailOtpError;
  Timer? _emailTimer;
  int _emailTimerLeft = 0;

  // Cross-verification OTP state for Phone change
  bool _phoneVerified = true;
  String? _phoneVerificationToken;
  bool _phoneOtpSent = false;
  bool _isSendingPhoneOtp = false;
  bool _isVerifyingPhoneOtp = false;
  String? _phoneOtpError;
  Timer? _phoneTimer;
  int _phoneTimerLeft = 0;

  // Baseline values to detect genuine modifications
  String _origFirstName = '';
  String _origLastName = '';
  String _origEmail = '';
  String _origFullPhone = '';
  String _origDob = '';
  String? _origGender;
  String? _origQualification;
  String _origBio = '';
  String? _origProfilePicture;

  @override
  void initState() {
    super.initState();
    _firstNameController.addListener(_onFieldChanged);
    _lastNameController.addListener(_onFieldChanged);
    _emailController.addListener(_onEmailChanged);
    _phoneController.addListener(_onPhoneChanged);
    _emailOtpController.addListener(_onFieldChanged);
    _phoneOtpController.addListener(_onFieldChanged);
    _dobController.addListener(_onFieldChanged);
    _bioController.addListener(_onFieldChanged);

    Future.microtask(() async {
      await ref.read(authProvider.notifier).fetchProfile();
      if (mounted) {
        _populateControllers();
      }
    });
  }

  void _onFieldChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  String get _currentFullPhone {
    final digits = _phoneController.text.trim();
    if (digits.isEmpty) return '';
    return '${_selectedCountry.callingCode}$digits';
  }

  bool get _isEmailChanging {
    if (!_isInitialized) return false;
    return _emailController.text.trim().toLowerCase() != _origEmail.toLowerCase();
  }

  bool get _isPhoneChanging {
    if (!_isInitialized) return false;
    return _currentFullPhone != _origFullPhone;
  }

  void _onEmailChanged() {
    if (!_isInitialized) return;
    if (!_isEmailChanging) {
      if (!_emailVerified || _emailOtpSent || _emailVerificationToken != null) {
        setState(() {
          _emailVerified = true;
          _emailOtpSent = false;
          _emailVerificationToken = null;
          _emailOtpError = null;
          _emailOtpController.clear();
          _emailTimer?.cancel();
          _emailTimerLeft = 0;
        });
      }
    } else {
      if (_emailVerified) {
        setState(() {
          _emailVerified = false;
          _emailVerificationToken = null;
          _emailOtpSent = false;
          _emailOtpError = null;
          _emailOtpController.clear();
          _emailTimer?.cancel();
          _emailTimerLeft = 0;
        });
      }
    }
    _onFieldChanged();
  }

  void _onPhoneChanged() {
    if (!_isInitialized) return;
    if (!_isPhoneChanging) {
      if (!_phoneVerified || _phoneOtpSent || _phoneVerificationToken != null) {
        setState(() {
          _phoneVerified = true;
          _phoneOtpSent = false;
          _phoneVerificationToken = null;
          _phoneOtpError = null;
          _phoneOtpController.clear();
          _phoneTimer?.cancel();
          _phoneTimerLeft = 0;
        });
      }
    } else {
      if (_phoneVerified) {
        setState(() {
          _phoneVerified = false;
          _phoneVerificationToken = null;
          _phoneOtpSent = false;
          _phoneOtpError = null;
          _phoneOtpController.clear();
          _phoneTimer?.cancel();
          _phoneTimerLeft = 0;
        });
      }
    }
    _onFieldChanged();
  }

  void _startEmailTimer(int seconds) {
    _emailTimer?.cancel();
    _emailTimerLeft = seconds;
    _emailTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        if (_emailTimerLeft > 1) {
          _emailTimerLeft--;
        } else {
          _emailTimerLeft = 0;
          timer.cancel();
        }
      });
    });
  }

  void _startPhoneTimer(int seconds) {
    _phoneTimer?.cancel();
    _phoneTimerLeft = seconds;
    _phoneTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      setState(() {
        if (_phoneTimerLeft > 1) {
          _phoneTimerLeft--;
        } else {
          _phoneTimerLeft = 0;
          timer.cancel();
        }
      });
    });
  }

  String _maskEmail(String email) {
    if (!email.contains('@')) return email;
    final parts = email.split('@');
    final name = parts[0];
    final domain = parts[1];
    if (name.length <= 2) {
      return '${name[0]}*@$domain';
    }
    return '${name[0]}${'*' * (name.length - 2)}${name[name.length - 1]}@$domain';
  }

  String _maskPhone(String phone) {
    if (phone.length <= 4) return phone;
    final start = phone.length > 7 ? phone.substring(0, 3) : phone.substring(0, 1);
    final end = phone.substring(phone.length - 4);
    final stars = '*' * (phone.length - start.length - 4);
    return '$start$stars$end';
  }

  // Cross-verification: User changes Email -> Send OTP to registered phone
  Future<void> _handleSendEmailOtp() async {
    final currentUser = ref.read(authProvider).user;
    final destPhone = currentUser?.phoneNumber;
    if (destPhone == null || destPhone.trim().isEmpty) {
      setState(() {
        _emailOtpError = 'A registered phone number is required to receive verification OTP.';
      });
      return;
    }

    final newEmail = _emailController.text.trim().toLowerCase();
    final emailErr = Validators.validateEmail(newEmail);
    if (emailErr != null) {
      setState(() {
        _emailOtpError = emailErr;
      });
      return;
    }

    setState(() {
      _isSendingEmailOtp = true;
      _emailOtpError = null;
    });

    try {
      final repo = ref.read(authRepositoryProvider);
      await repo.sendVerificationOTP(
        type: 'phone',
        identifier: destPhone.trim(),
        isCrossValidation: true,
        newEmail: newEmail,
      );
      if (!mounted) return;
      setState(() {
        _emailOtpSent = true;
        _emailOtpError = null;
      });
      _startEmailTimer(60);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('OTP sent to your registered phone (${_maskPhone(destPhone)})'),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 3),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _emailOtpError = e.toString();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: Colors.redAccent,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isSendingEmailOtp = false);
      }
    }
  }

  // User enters 6-digit OTP received on phone -> verify inline
  Future<void> _handleVerifyEmailOtp() async {
    final currentUser = ref.read(authProvider).user;
    final destPhone = currentUser?.phoneNumber;
    if (destPhone == null || destPhone.trim().isEmpty) return;

    final otp = _emailOtpController.text.trim();
    if (otp.length != 6) return;

    setState(() {
      _isVerifyingEmailOtp = true;
      _emailOtpError = null;
    });

    try {
      final repo = ref.read(authRepositoryProvider);
      final token = await repo.verifyInlineOTP(
        type: 'phone',
        identifier: destPhone.trim(),
        otp: otp,
      );
      if (!mounted) return;
      setState(() {
        _emailVerificationToken = token;
        _emailVerified = true;
        _emailOtpSent = false;
        _emailOtpError = null;
        _emailTimer?.cancel();
        _emailTimerLeft = 0;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Email verified successfully!'),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 2),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _emailOtpError = e.toString();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: Colors.redAccent,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isVerifyingEmailOtp = false);
      }
    }
  }

  // Cross-verification: User changes Phone -> Send OTP to registered email
  Future<void> _handleSendPhoneOtp() async {
    final currentUser = ref.read(authProvider).user;
    final destEmail = currentUser?.email;
    if (destEmail == null || destEmail.trim().isEmpty) {
      setState(() {
        _phoneOtpError = 'A registered email address is required to receive verification OTP.';
      });
      return;
    }

    final phoneErr = Validators.validatePhoneNumber(
      _phoneController.text.trim(),
      expectedLength: _selectedCountry.phoneLength,
    );
    if (phoneErr != null) {
      setState(() {
        _phoneError = phoneErr;
        _phoneOtpError = phoneErr;
      });
      return;
    }

    final newPhone = _currentFullPhone;

    setState(() {
      _isSendingPhoneOtp = true;
      _phoneOtpError = null;
    });

    try {
      final repo = ref.read(authRepositoryProvider);
      await repo.sendVerificationOTP(
        type: 'email',
        identifier: destEmail.trim().toLowerCase(),
        isCrossValidation: true,
        newPhone: newPhone,
      );
      if (!mounted) return;
      setState(() {
        _phoneOtpSent = true;
        _phoneOtpError = null;
      });
      _startPhoneTimer(60);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('OTP sent to your registered email (${_maskEmail(destEmail)})'),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 3),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _phoneOtpError = e.toString();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: Colors.redAccent,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isSendingPhoneOtp = false);
      }
    }
  }

  // User enters 6-digit OTP received on email -> verify inline
  Future<void> _handleVerifyPhoneOtp() async {
    final currentUser = ref.read(authProvider).user;
    final destEmail = currentUser?.email;
    if (destEmail == null || destEmail.trim().isEmpty) return;

    final otp = _phoneOtpController.text.trim();
    if (otp.length != 6) return;

    setState(() {
      _isVerifyingPhoneOtp = true;
      _phoneOtpError = null;
    });

    try {
      final repo = ref.read(authRepositoryProvider);
      final token = await repo.verifyInlineOTP(
        type: 'email',
        identifier: destEmail.trim().toLowerCase(),
        otp: otp,
      );
      if (!mounted) return;
      setState(() {
        _phoneVerificationToken = token;
        _phoneVerified = true;
        _phoneOtpSent = false;
        _phoneOtpError = null;
        _phoneTimer?.cancel();
        _phoneTimerLeft = 0;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Phone number verified successfully!'),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 2),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _phoneOtpError = e.toString();
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: Colors.redAccent,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isVerifyingPhoneOtp = false);
      }
    }
  }

  void _populateControllers() {
    final user = ref.read(authProvider).user;
    if (user == null) return;

    _firstNameController.text = user.firstName;
    _lastNameController.text = user.lastName;
    _emailController.text = user.email;

    final phone = user.phoneNumber ?? '';
    _selectedCountry = CountryData.countries.firstWhere(
      (c) => phone.startsWith(c.callingCode),
      orElse: () => CountryData.defaultCountry,
    );
    final rawNumber = phone.startsWith(_selectedCountry.callingCode)
        ? phone.substring(_selectedCountry.callingCode.length)
        : phone;
    _phoneController.text = rawNumber;

    if (user.dateOfBirth != null && user.dateOfBirth!.isNotEmpty) {
      try {
        final d = DateTime.parse(user.dateOfBirth!);
        _dobController.text = DateFormat('yyyy-MM-dd').format(d);
      } catch (_) {
        _dobController.text = user.dateOfBirth!;
      }
    } else {
      _dobController.text = '';
    }

    // Backend accepts capitalized enum: 'Male', 'Female', 'Other'
    if (user.gender != null && user.gender!.isNotEmpty) {
      final g = user.gender!.trim().toLowerCase();
      if (g == 'male') {
        _selectedGender = 'Male';
      } else if (g == 'female') {
        _selectedGender = 'Female';
      } else if (g == 'other') {
        _selectedGender = 'Other';
      } else {
        _selectedGender = user.gender;
      }
    } else {
      _selectedGender = null;
    }

    const validQualifications = [
      '10th',
      '12th',
      'Graduation',
      'Post Graduation',
      'PhD',
      'Other',
      "Bachelor's",
      "Master's",
    ];
    if (user.qualification != null && validQualifications.contains(user.qualification)) {
      _selectedQualification = user.qualification;
    } else {
      _selectedQualification = null;
    }

    _bioController.text = user.bio ?? '';
    _newAvatarBytes = null;
    _newAvatarDataUrl = null;
    _removeAvatarRequested = false;

    // Snapshot original baseline values
    _origFirstName = user.firstName.trim();
    _origLastName = user.lastName.trim();
    _origEmail = user.email.trim().toLowerCase();
    _origFullPhone = user.phoneNumber ?? '';
    _origDob = _dobController.text.trim();
    _origGender = _selectedGender;
    _origQualification = _selectedQualification;
    _origBio = (user.bio ?? '').trim();
    _origProfilePicture = user.profilePicture ?? user.profilePic;

    _emailVerified = true;
    _phoneVerified = true;
    _emailVerificationToken = null;
    _phoneVerificationToken = null;
    _emailOtpSent = false;
    _phoneOtpSent = false;
    _emailOtpError = null;
    _phoneOtpError = null;
    _emailTimer?.cancel();
    _phoneTimer?.cancel();
    _emailTimerLeft = 0;
    _phoneTimerLeft = 0;

    setState(() {
      _isInitialized = true;
    });
  }

  bool get _hasChanges {
    if (!_isInitialized) return false;

    if (_firstNameController.text.trim() != _origFirstName) return true;
    if (_lastNameController.text.trim() != _origLastName) return true;
    if (_isEmailChanging) return true;
    if (_isPhoneChanging) return true;
    if (_dobController.text.trim() != _origDob) return true;
    if (_selectedGender != _origGender) return true;
    if (_selectedQualification != _origQualification) return true;
    if (_bioController.text.trim() != _origBio) return true;

    // Avatar changes
    if (_newAvatarBytes != null || _newAvatarDataUrl != null) return true;
    if (_removeAvatarRequested && (_origProfilePicture != null && _origProfilePicture!.trim().isNotEmpty)) {
      return true;
    }

    return false;
  }

  bool get _isFormValid {
    if (!_hasChanges) return false;

    // First Name
    final fn = _firstNameController.text.trim();
    if (fn.isEmpty || Validators.validateFirstName(fn) != null) return false;

    // Last Name
    final ln = _lastNameController.text.trim();
    if (ln.isEmpty || Validators.validateLastName(ln) != null) return false;

    // Email
    final email = _emailController.text.trim();
    if (email.isEmpty || Validators.validateEmail(email) != null) return false;
    if (_isEmailChanging && !_emailVerified) return false;

    // Phone
    final phone = _phoneController.text.trim();
    if (phone.isNotEmpty) {
      if (Validators.validatePhoneNumber(phone, expectedLength: _selectedCountry.phoneLength) != null) {
        return false;
      }
    }
    if (_isPhoneChanging && !_phoneVerified) return false;

    // Date of Birth
    final dob = _dobController.text.trim();
    if (dob.isNotEmpty && Validators.validateDateOfBirth(dob) != null) return false;

    // Qualification
    if (_selectedQualification != null && Validators.validateQualification(_selectedQualification) != null) {
      return false;
    }

    // Bio
    final bio = _bioController.text.trim();
    if (bio.isNotEmpty && Validators.validateBio(bio) != null) return false;

    return true;
  }

  @override
  void dispose() {
    _emailTimer?.cancel();
    _phoneTimer?.cancel();

    _firstNameController.removeListener(_onFieldChanged);
    _lastNameController.removeListener(_onFieldChanged);
    _emailController.removeListener(_onEmailChanged);
    _phoneController.removeListener(_onPhoneChanged);
    _emailOtpController.removeListener(_onFieldChanged);
    _phoneOtpController.removeListener(_onFieldChanged);
    _dobController.removeListener(_onFieldChanged);
    _bioController.removeListener(_onFieldChanged);

    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _emailOtpController.dispose();
    _phoneOtpController.dispose();
    _dobController.dispose();
    _bioController.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    setState(() => _submitError = null);

    // Guard: Prevent saving if nothing changed
    if (!_hasChanges) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No changes to save'),
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }

    if (!_formKey.currentState!.validate()) return;

    // Validation Guard: If email was changed, require OTP cross-verification
    if (_isEmailChanging && !_emailVerified) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please verify your new email address before saving.'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    // Validation Guard: If phone was changed, require OTP cross-verification
    if (_isPhoneChanging && !_phoneVerified) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Please verify your new phone number before saving.'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final phoneDigits = _phoneController.text.trim();
    if (phoneDigits.isNotEmpty) {
      final phoneErr = Validators.validatePhoneNumber(phoneDigits, expectedLength: _selectedCountry.phoneLength);
      if (phoneErr != null) {
        setState(() => _phoneError = phoneErr);
        return;
      }
    }

    setState(() => _isSubmitting = true);

    final fullPhone = _currentFullPhone;

    final payload = <String, dynamic>{
      'firstName': _firstNameController.text.trim(),
      'lastName': _lastNameController.text.trim(),
      if (_dobController.text.trim().isNotEmpty) 'dateOfBirth': _dobController.text.trim(),
      if (_selectedGender != null) 'gender': _selectedGender,
      if (_selectedQualification != null) 'qualification': _selectedQualification,
      'bio': _bioController.text.trim(),
    };

    if (_isEmailChanging && _emailVerified) {
      payload['email'] = _emailController.text.trim().toLowerCase();
      if (_emailVerificationToken != null) {
        payload['emailVerificationToken'] = _emailVerificationToken;
      }
    }

    if (_isPhoneChanging && _phoneVerified) {
      payload['phoneNumber'] = fullPhone;
      if (_phoneVerificationToken != null) {
        payload['phoneVerificationToken'] = _phoneVerificationToken;
      }
    } else if (fullPhone.isNotEmpty) {
      payload['phoneNumber'] = fullPhone;
    }

    if (_removeAvatarRequested) {
      payload['profilePicture'] = null;
      payload['profilePic'] = null;
    } else if (_newAvatarDataUrl != null) {
      payload['profilePicture'] = _newAvatarDataUrl;
      payload['profilePic'] = _newAvatarDataUrl;
    }

    final success = await ref.read(authProvider.notifier).updateProfile(payload);

    if (!mounted) return;
    setState(() => _isSubmitting = false);

    if (success) {
      // 1. Reset baseline values to newly saved values so _hasChanges is false
      _origFirstName = _firstNameController.text.trim();
      _origLastName = _lastNameController.text.trim();
      _origEmail = _emailController.text.trim().toLowerCase();
      _origFullPhone = fullPhone;
      _origDob = _dobController.text.trim();
      _origGender = _selectedGender;
      _origQualification = _selectedQualification;
      _origBio = _bioController.text.trim();
      _newAvatarBytes = null;
      _newAvatarDataUrl = null;
      _removeAvatarRequested = false;
      _origProfilePicture = ref.read(authProvider).user?.profilePicture;
      _emailVerified = true;
      _phoneVerified = true;
      _emailVerificationToken = null;
      _phoneVerificationToken = null;
      _emailOtpSent = false;
      _phoneOtpSent = false;
      _canPopNow = true;

      // 2. Re-fetch fresh profile data from backend to ensure state is synchronized
      await ref.read(authProvider.notifier).fetchProfile();

      if (!mounted) return;

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profile updated successfully!'),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 2),
        ),
      );

      // 3. Immediately close Edit Profile and return to Profile page
      AppNavigation.popOrGo(context, '/profile');
    } else {
      final err = ref.read(authProvider).errorMessage ?? 'Failed to update profile. Please try again.';
      setState(() => _submitError = err);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(err),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _handleBack() async {
    if (_hasChanges && !_canPopNow) {
      final shouldDiscard = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text(
            'Unsaved Changes',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          content: const Text(
            'You have unsaved changes. Do you want to leave without saving?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.redAccent,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              onPressed: () => Navigator.of(ctx).pop(true),
              child: const Text(
                'Discard Changes',
                style: TextStyle(color: Colors.white),
              ),
            ),
          ],
        ),
      );

      if (shouldDiscard != true) {
        return; // Stay on page
      }
    }

    if (!mounted) return;
    _canPopNow = true;
    AppNavigation.popOrGo(context, '/profile');
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Loading screen
    if (authState.isLoading && !_isInitialized) {
      return Scaffold(
        backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
        appBar: AppBar(
          backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: _handleBack,
          ),
          title: Text(
            'Edit Profile',
            style: TextStyle(
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        body: const Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Loading profile information...'),
            ],
          ),
        ),
      );
    }

    // Error / User not found screen
    if (user == null && !_isInitialized) {
      return Scaffold(
        backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
        appBar: AppBar(
          backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: _handleBack,
          ),
          title: Text(
            'Edit Profile',
            style: TextStyle(
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.person_off_outlined, size: 48, color: Colors.grey),
              const SizedBox(height: 12),
              Text(
                'Unable to load profile data.',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                ),
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryPink,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                icon: const Icon(Icons.refresh, size: 18, color: Colors.white),
                label: const Text('Retry Loading', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                onPressed: () async {
                  await ref.read(authProvider.notifier).fetchProfile();
                  _populateControllers();
                },
              ),
            ],
          ),
        ),
      );
    }

    return PopScope(
      canPop: _canPopNow || !_hasChanges,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        if (_canPopNow || !_hasChanges) {
          AppNavigation.popOrGo(context, '/profile');
          return;
        }
        _handleBack();
      },
      child: Scaffold(
        backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
        appBar: AppBar(
          backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: Icon(
              Icons.arrow_back,
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
            ),
            onPressed: _handleBack,
          ),
          title: Text(
            'Edit Profile',
            style: TextStyle(
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 700),
              child: Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder,
                  ),
                ),
                child: Form(
                  key: _formKey,
                  autovalidateMode: AutovalidateMode.onUserInteraction,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header & Subtitle
                      Text(
                        'Edit Profile Details',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Update your personal information, profile photo, and credentials.',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Error banner if any
                      if (_submitError != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          margin: const EdgeInsets.only(bottom: 16),
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.red.withOpacity(0.3)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline, color: Colors.redAccent, size: 20),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  _submitError!,
                                  style: const TextStyle(color: Colors.redAccent, fontSize: 13, fontWeight: FontWeight.bold),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],

                      // Profile Picture Section
                      ProfilePicturePicker(
                        initialImageUrl: user?.profilePicture,
                        initialBytes: _newAvatarBytes,
                        radius: 46,
                        isLoading: _isSubmitting,
                        onImagePicked: (img) {
                          setState(() {
                            _newAvatarBytes = img.bytes;
                            _newAvatarDataUrl = img.dataUrl;
                            _removeAvatarRequested = false;
                            _submitError = null;
                          });
                        },
                        onImageRemoved: () {
                          setState(() {
                            _newAvatarBytes = null;
                            _newAvatarDataUrl = null;
                            _removeAvatarRequested = true;
                            _submitError = null;
                          });
                        },
                      ),
                      const SizedBox(height: 24),

                      // First Name
                      TextFormField(
                        controller: _firstNameController,
                        autovalidateMode: AutovalidateMode.onUserInteraction,
                        inputFormatters: [LengthLimitingTextInputFormatter(50)],
                        decoration: const InputDecoration(
                          labelText: 'First Name *',
                          hintText: 'e.g. John',
                          prefixIcon: Icon(Icons.person_outline),
                        ),
                        validator: Validators.validateFirstName,
                      ),
                      const SizedBox(height: 16),

                      // Last Name
                      TextFormField(
                        controller: _lastNameController,
                        autovalidateMode: AutovalidateMode.onUserInteraction,
                        inputFormatters: [LengthLimitingTextInputFormatter(50)],
                        decoration: const InputDecoration(
                          labelText: 'Last Name *',
                          hintText: 'e.g. Doe',
                          prefixIcon: Icon(Icons.person_outline),
                        ),
                        validator: Validators.validateLastName,
                      ),
                      const SizedBox(height: 16),

                      // Single-field change warning banners
                      if (_isEmailChanging)
                        Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.amber.shade900.withOpacity(0.25) : Colors.amber.shade50,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.amber.shade400.withOpacity(0.6)),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.info_outline, size: 16, color: Colors.amber.shade800),
                              const SizedBox(width: 8),
                              const Expanded(
                                child: Text(
                                  'Phone number cannot be changed while updating email address.',
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.amber),
                                ),
                              ),
                            ],
                          ),
                        ),
                      if (_isPhoneChanging)
                        Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.amber.shade900.withOpacity(0.25) : Colors.amber.shade50,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.amber.shade400.withOpacity(0.6)),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.info_outline, size: 16, color: Colors.amber.shade800),
                              const SizedBox(width: 8),
                              const Expanded(
                                child: Text(
                                  'Email address cannot be changed while updating phone number.',
                                  style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.amber),
                                ),
                              ),
                            ],
                          ),
                        ),

                      // Email Address Section
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TextFormField(
                            controller: _emailController,
                            autovalidateMode: AutovalidateMode.onUserInteraction,
                            readOnly: _isPhoneChanging || (_isEmailChanging && _emailVerified),
                            keyboardType: TextInputType.emailAddress,
                            inputFormatters: [LengthLimitingTextInputFormatter(254)],
                            decoration: InputDecoration(
                              labelText: 'Email Address *',
                              hintText: 'e.g. alex@example.com',
                              prefixIcon: const Icon(Icons.email_outlined),
                              suffixIcon: _isEmailChanging && _emailVerified
                                  ? const Padding(
                                      padding: EdgeInsets.all(12),
                                      child: Icon(Icons.check_circle, color: Colors.green, size: 20),
                                    )
                                  : null,
                              filled: _isPhoneChanging,
                              fillColor: _isPhoneChanging
                                  ? (isDark ? Colors.black12 : Colors.grey.shade100)
                                  : null,
                            ),
                            validator: Validators.validateEmail,
                          ),
                          const SizedBox(height: 4),
                          if (!_isEmailChanging)
                            Padding(
                              padding: const EdgeInsets.only(left: 4),
                              child: Row(
                                children: [
                                  const Icon(Icons.check_circle, color: Colors.green, size: 14),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Current email address',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          else if (_emailVerified)
                            Padding(
                              padding: const EdgeInsets.only(left: 4, top: 2),
                              child: Row(
                                children: [
                                  const Icon(Icons.check_circle, color: Colors.green, size: 16),
                                  const SizedBox(width: 4),
                                  const Text(
                                    '✓ Email verified',
                                    style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 12),
                                  ),
                                  const Spacer(),
                                  TextButton(
                                    style: TextButton.styleFrom(
                                      padding: EdgeInsets.zero,
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    onPressed: () {
                                      setState(() {
                                        _emailVerified = false;
                                        _emailVerificationToken = null;
                                        _emailOtpSent = false;
                                        _emailOtpController.clear();
                                      });
                                    },
                                    child: const Text('Change email', style: TextStyle(fontSize: 11, color: AppColors.primaryPink, fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              ),
                            )
                          else ...[
                            if (!_emailOtpSent) ...[
                              const SizedBox(height: 8),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primaryPink,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                  onPressed: (_isSendingEmailOtp ||
                                          _isPhoneChanging ||
                                          _emailController.text.trim().isEmpty ||
                                          Validators.validateEmail(_emailController.text.trim()) != null)
                                      ? null
                                      : _handleSendEmailOtp,
                                  icon: _isSendingEmailOtp
                                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                      : const Icon(Icons.send_rounded, size: 16, color: Colors.white),
                                  label: Text(
                                    _isSendingEmailOtp ? 'Sending OTP...' : 'Send OTP',
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13),
                                  ),
                                ),
                              ),
                            ] else ...[
                              const SizedBox(height: 10),
                              Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.darkSurface : Colors.grey.shade50,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isDark ? AppColors.darkCardBorder : Colors.grey.shade300,
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Row(
                                      children: [
                                        Icon(Icons.security_outlined, size: 16, color: AppColors.primaryPink),
                                        SizedBox(width: 6),
                                        Text(
                                          'OTP Verification',
                                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      'Enter 6-digit OTP sent to registered phone (${_maskPhone(ref.read(authProvider).user?.phoneNumber ?? '')})',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: TextField(
                                            controller: _emailOtpController,
                                            keyboardType: TextInputType.number,
                                            maxLength: 6,
                                            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                            decoration: InputDecoration(
                                              hintText: 'Enter 6-digit OTP',
                                              counterText: '',
                                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                              filled: true,
                                              fillColor: isDark ? AppColors.darkBackground : Colors.white,
                                              border: OutlineInputBorder(
                                                borderRadius: BorderRadius.circular(8),
                                                borderSide: BorderSide(color: Colors.grey.shade300),
                                              ),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        ElevatedButton(
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: AppColors.primaryPink,
                                            disabledBackgroundColor: isDark ? Colors.grey.shade800 : Colors.grey.shade300,
                                            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                          ),
                                          // Disabled unless exactly 6 digits are typed
                                          onPressed: (_isVerifyingEmailOtp || _emailOtpController.text.trim().length != 6)
                                              ? null
                                              : _handleVerifyEmailOtp,
                                          child: _isVerifyingEmailOtp
                                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                              : const Text('Verify', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        _emailTimerLeft > 0
                                            ? Text(
                                                'Resend OTP in ${_emailTimerLeft}s',
                                                style: const TextStyle(fontSize: 11, color: Colors.grey),
                                              )
                                            : TextButton(
                                                style: TextButton.styleFrom(
                                                  padding: EdgeInsets.zero,
                                                  minimumSize: Size.zero,
                                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                                ),
                                                onPressed: _isSendingEmailOtp ? null : _handleSendEmailOtp,
                                                child: const Text('Resend OTP', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primaryPink)),
                                              ),
                                        TextButton(
                                          style: TextButton.styleFrom(
                                            padding: EdgeInsets.zero,
                                            minimumSize: Size.zero,
                                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                          ),
                                          onPressed: () {
                                            setState(() {
                                              _emailOtpSent = false;
                                              _emailOtpController.clear();
                                              _emailTimer?.cancel();
                                              _emailTimerLeft = 0;
                                            });
                                          },
                                          child: const Text('Edit Email', style: TextStyle(fontSize: 11, color: Colors.grey)),
                                        ),
                                      ],
                                    ),
                                    if (_emailOtpError != null) ...[
                                      const SizedBox(height: 6),
                                      Text(
                                        _emailOtpError!,
                                        style: const TextStyle(color: Colors.redAccent, fontSize: 11, fontWeight: FontWeight.w500),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Phone Number Section (Unified: [ Flag +Code v | Phone Number * ])
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          UnifiedPhoneInput(
                            controller: _phoneController,
                            selectedCountry: _selectedCountry,
                            readOnly: _isEmailChanging || (_isPhoneChanging && _phoneVerified),
                            errorText: _phoneError,
                            onCountryChanged: (CountryInfo c) {
                              setState(() {
                                _selectedCountry = c;
                                _phoneError = Validators.validatePhoneNumber(_phoneController.text, expectedLength: c.phoneLength);
                              });
                              _onPhoneChanged();
                            },
                            onChanged: (v) {
                              setState(() {
                                _phoneError = Validators.validatePhoneNumber(v, expectedLength: _selectedCountry.phoneLength);
                              });
                              _onPhoneChanged();
                            },
                          ),
                          const SizedBox(height: 4),
                          if (!_isPhoneChanging)
                            Padding(
                              padding: const EdgeInsets.only(left: 4),
                              child: Row(
                                children: [
                                  const Icon(Icons.check_circle, color: Colors.green, size: 14),
                                  const SizedBox(width: 4),
                                  Text(
                                    'Current phone number',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                    ),
                                  ),
                                ],
                              ),
                            )
                          else if (_phoneVerified)
                            Padding(
                              padding: const EdgeInsets.only(left: 4, top: 2),
                              child: Row(
                                children: [
                                  const Icon(Icons.check_circle, color: Colors.green, size: 16),
                                  const SizedBox(width: 4),
                                  const Text(
                                    '✓ Phone verified',
                                    style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 12),
                                  ),
                                  const Spacer(),
                                  TextButton(
                                    style: TextButton.styleFrom(
                                      padding: EdgeInsets.zero,
                                      minimumSize: Size.zero,
                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                    ),
                                    onPressed: () {
                                      setState(() {
                                        _phoneVerified = false;
                                        _phoneVerificationToken = null;
                                        _phoneOtpSent = false;
                                        _phoneOtpController.clear();
                                      });
                                    },
                                    child: const Text('Change phone', style: TextStyle(fontSize: 11, color: AppColors.primaryPink, fontWeight: FontWeight.bold)),
                                  ),
                                ],
                              ),
                            )
                          else ...[
                            if (!_phoneOtpSent) ...[
                              const SizedBox(height: 8),
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primaryPink,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                  ),
                                  onPressed: (_isSendingPhoneOtp ||
                                          _isEmailChanging ||
                                          _phoneController.text.trim().isEmpty ||
                                          _phoneError != null)
                                      ? null
                                      : _handleSendPhoneOtp,
                                  icon: _isSendingPhoneOtp
                                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                      : const Icon(Icons.send_rounded, size: 16, color: Colors.white),
                                  label: Text(
                                    _isSendingPhoneOtp ? 'Sending OTP...' : 'Send OTP',
                                    style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 13),
                                  ),
                                ),
                              ),
                            ] else ...[
                              const SizedBox(height: 10),
                              Container(
                                padding: const EdgeInsets.all(14),
                                decoration: BoxDecoration(
                                  color: isDark ? AppColors.darkSurface : Colors.grey.shade50,
                                  borderRadius: BorderRadius.circular(12),
                                  border: Border.all(
                                    color: isDark ? AppColors.darkCardBorder : Colors.grey.shade300,
                                  ),
                                ),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Row(
                                      children: [
                                        Icon(Icons.security_outlined, size: 16, color: AppColors.primaryPink),
                                        SizedBox(width: 6),
                                        Text(
                                          'OTP Verification',
                                          style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 6),
                                    Text(
                                      'Enter 6-digit OTP sent to registered email (${_maskEmail(ref.read(authProvider).user?.email ?? '')})',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                      ),
                                    ),
                                    const SizedBox(height: 10),
                                    Row(
                                      children: [
                                        Expanded(
                                          child: TextField(
                                            controller: _phoneOtpController,
                                            keyboardType: TextInputType.number,
                                            maxLength: 6,
                                            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                            decoration: InputDecoration(
                                              hintText: 'Enter 6-digit OTP',
                                              counterText: '',
                                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                              filled: true,
                                              fillColor: isDark ? AppColors.darkBackground : Colors.white,
                                              border: OutlineInputBorder(
                                                borderRadius: BorderRadius.circular(8),
                                                borderSide: BorderSide(color: Colors.grey.shade300),
                                              ),
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 10),
                                        ElevatedButton(
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: AppColors.primaryPink,
                                            disabledBackgroundColor: isDark ? Colors.grey.shade800 : Colors.grey.shade300,
                                            padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                          ),
                                          // Disabled unless exactly 6 digits are typed
                                          onPressed: (_isVerifyingPhoneOtp || _phoneOtpController.text.trim().length != 6)
                                              ? null
                                              : _handleVerifyPhoneOtp,
                                          child: _isVerifyingPhoneOtp
                                              ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                              : const Text('Verify', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        _phoneTimerLeft > 0
                                            ? Text(
                                                'Resend OTP in ${_phoneTimerLeft}s',
                                                style: const TextStyle(fontSize: 11, color: Colors.grey),
                                              )
                                            : TextButton(
                                                style: TextButton.styleFrom(
                                                  padding: EdgeInsets.zero,
                                                  minimumSize: Size.zero,
                                                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                                ),
                                                onPressed: _isSendingPhoneOtp ? null : _handleSendPhoneOtp,
                                                child: const Text('Resend OTP', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primaryPink)),
                                              ),
                                        TextButton(
                                          style: TextButton.styleFrom(
                                            padding: EdgeInsets.zero,
                                            minimumSize: Size.zero,
                                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                          ),
                                          onPressed: () {
                                            setState(() {
                                              _phoneOtpSent = false;
                                              _phoneOtpController.clear();
                                              _phoneTimer?.cancel();
                                              _phoneTimerLeft = 0;
                                            });
                                          },
                                          child: const Text('Edit Phone', style: TextStyle(fontSize: 11, color: Colors.grey)),
                                        ),
                                      ],
                                    ),
                                    if (_phoneOtpError != null) ...[
                                      const SizedBox(height: 6),
                                      Text(
                                        _phoneOtpError!,
                                        style: const TextStyle(color: Colors.redAccent, fontSize: 11, fontWeight: FontWeight.w500),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            ],
                          ],
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Date of Birth
                      TextFormField(
                        controller: _dobController,
                        readOnly: true,
                        decoration: const InputDecoration(
                          labelText: 'Date of Birth (YYYY-MM-DD)',
                          prefixIcon: Icon(Icons.calendar_today_outlined),
                        ),
                        onTap: () async {
                          DateTime initial = DateTime(2000, 1, 1);
                          if (_dobController.text.isNotEmpty) {
                            try {
                              initial = DateTime.parse(_dobController.text);
                            } catch (_) {}
                          }
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: initial,
                            firstDate: DateTime(1920),
                            lastDate: DateTime.now(), // No future dates
                          );
                          if (picked != null) {
                            setState(() {
                              _dobController.text = DateFormat('yyyy-MM-dd').format(picked);
                            });
                          }
                        },
                      ),
                      const SizedBox(height: 16),

                      // Gender Dropdown (Backend enum: Male, Female, Other)
                      DropdownButtonFormField<String>(
                        value: ['Male', 'Female', 'Other'].contains(_selectedGender)
                            ? _selectedGender
                            : null,
                        decoration: const InputDecoration(
                          labelText: 'Gender',
                          prefixIcon: Icon(Icons.wc_outlined),
                        ),
                        items: const [
                          DropdownMenuItem(value: 'Male', child: Text('Male')),
                          DropdownMenuItem(value: 'Female', child: Text('Female')),
                          DropdownMenuItem(value: 'Other', child: Text('Other')),
                        ],
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _selectedGender = val);
                          }
                        },
                      ),
                      const SizedBox(height: 16),

                      // Qualification Dropdown
                      DropdownButtonFormField<String>(
                        value: ['10th', '12th', 'Graduation', 'Post Graduation', 'PhD', 'Other', "Bachelor's", "Master's"].contains(_selectedQualification)
                            ? _selectedQualification
                            : null,
                        decoration: const InputDecoration(
                          labelText: 'Qualification',
                          prefixIcon: Icon(Icons.school_outlined),
                        ),
                        items: const [
                          '10th',
                          '12th',
                          'Graduation',
                          'Post Graduation',
                          'PhD',
                          'Other',
                          "Bachelor's",
                          "Master's"
                        ].map((q) => DropdownMenuItem(value: q, child: Text(q))).toList(),
                        onChanged: (val) {
                          if (val != null) {
                            setState(() => _selectedQualification = val);
                          }
                        },
                      ),
                      const SizedBox(height: 16),

                      // Bio Field
                      TextFormField(
                        controller: _bioController,
                        autovalidateMode: AutovalidateMode.onUserInteraction,
                        maxLength: 500,
                        maxLines: 3,
                        inputFormatters: [LengthLimitingTextInputFormatter(500)],
                        decoration: const InputDecoration(
                          labelText: 'Bio (Optional, max 500 chars)',
                          prefixIcon: Icon(Icons.notes_outlined),
                        ),
                        validator: Validators.validateBio,
                        onChanged: (_) => setState(() {}),
                      ),
                      const SizedBox(height: 24),

                      // Action Buttons
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              onPressed: _isSubmitting ? null : _handleBack,
                              child: const Text('Cancel'),
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Builder(
                              builder: (context) {
                                final canSave = _isFormValid && !_isSubmitting;
                                return InkWell(
                                  onTap: canSave ? _handleSave : null,
                                  borderRadius: BorderRadius.circular(12),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 14),
                                    decoration: BoxDecoration(
                                      gradient: canSave
                                          ? const LinearGradient(
                                              colors: [AppColors.primaryPink, AppColors.primaryPurple],
                                            )
                                          : null,
                                      color: canSave
                                          ? null
                                          : (isDark ? Colors.white.withOpacity(0.08) : Colors.grey.shade300),
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    alignment: Alignment.center,
                                    child: _isSubmitting
                                        ? const SizedBox(
                                            width: 20,
                                            height: 20,
                                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                          )
                                        : Text(
                                            'Save Changes',
                                            style: TextStyle(
                                              color: canSave
                                                  ? Colors.white
                                                  : (isDark ? Colors.white38 : Colors.grey.shade600),
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
