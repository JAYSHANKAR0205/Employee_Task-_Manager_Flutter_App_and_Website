import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/app_navigation.dart';
import '../../../core/utils/validators.dart';
import '../../../presentation/widgets/country_code_selector.dart';
import '../../../presentation/widgets/profile_picture_picker.dart';
import '../../../presentation/widgets/unified_phone_input.dart';
import '../../providers/auth_provider.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  int _currentSlide = 1;

  // Controllers
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailOtpController = TextEditingController();
  final _phoneOtpController = TextEditingController();

  final _dateOfBirthController = TextEditingController();
  final _bioController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  // State
  CountryInfo _selectedCountry = CountryData.defaultCountry;
  String? _selectedGender;
  String? _selectedQualification;
  bool _termsAccepted = false;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;
  String? _profilePicUrl;
  Uint8List? _profilePicBytes;

  // OTP & Verification State
  bool _emailVerified = false;
  bool _phoneVerified = false;
  bool _emailOtpSent = false;
  bool _phoneOtpSent = false;
  String _emailVerificationToken = '';
  String _phoneVerificationToken = '';

  int _emailTimerLeft = 0;
  int _phoneTimerLeft = 0;
  Timer? _emailTimer;
  Timer? _phoneTimer;

  bool _isSendingEmailOtp = false;
  bool _isSendingPhoneOtp = false;
  bool _isVerifyingEmailOtp = false;
  bool _isVerifyingPhoneOtp = false;

  // Real-time Errors
  String? _firstNameError;
  String? _lastNameError;
  String? _emailError;
  String? _phoneError;
  String? _dobError;
  String? _passwordError;
  String? _confirmPasswordError;
  String? _bioError;

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    _emailOtpController.dispose();
    _phoneOtpController.dispose();
    _dateOfBirthController.dispose();
    _bioController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _emailTimer?.cancel();
    _phoneTimer?.cancel();
    super.dispose();
  }

  void _startEmailTimer(int seconds) {
    _emailTimer?.cancel();
    setState(() => _emailTimerLeft = seconds);
    _emailTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_emailTimerLeft <= 1) {
        t.cancel();
        setState(() => _emailTimerLeft = 0);
      } else {
        setState(() => _emailTimerLeft--);
      }
    });
  }

  void _startPhoneTimer(int seconds) {
    _phoneTimer?.cancel();
    setState(() => _phoneTimerLeft = seconds);
    _phoneTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (_phoneTimerLeft <= 1) {
        t.cancel();
        setState(() => _phoneTimerLeft = 0);
      } else {
        setState(() => _phoneTimerLeft--);
      }
    });
  }

  void _showNotification(String message, {bool isError = false}) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.redAccent : Colors.green,
        duration: const Duration(seconds: 3),
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
    );
  }

  String get _fullPhoneNumber => '${_selectedCountry.callingCode}${_phoneController.text.trim()}';

  // Live Availability Check
  Future<void> _checkAvailability(String field, String value) async {
    if (value.trim().isEmpty) return;
    final repo = ref.read(authRepositoryProvider);
    final res = await repo.checkAvailability(
      email: field == 'email' ? value.trim() : null,
      phoneNumber: field == 'phone' ? _fullPhoneNumber : null,
    );
    if (res['exists'] == true) {
      setState(() {
        if (field == 'email') {
          _emailError = 'This email address is already registered.';
        } else {
          _phoneError = 'This phone number is already registered.';
        }
      });
      _showNotification(
        'This ${field == 'email' ? 'email' : 'phone number'} is already registered.',
        isError: true,
      );
    }
  }

  // OTP Handlers
  Future<void> _handleSendEmailOtp() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || _emailError != null) return;

    setState(() => _isSendingEmailOtp = true);
    try {
      final repo = ref.read(authRepositoryProvider);
      await repo.sendVerificationOTP(type: 'email', identifier: email);
      setState(() {
        _emailOtpSent = true;
      });
      _startEmailTimer(60);
      _showNotification('OTP sent to your email!');
    } catch (e) {
      _showNotification(e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _isSendingEmailOtp = false);
    }
  }

  Future<void> _handleVerifyEmailOtp() async {
    final email = _emailController.text.trim();
    final otp = _emailOtpController.text.trim();
    if (otp.length != 6) return;

    setState(() => _isVerifyingEmailOtp = true);
    try {
      final repo = ref.read(authRepositoryProvider);
      final token = await repo.verifyInlineOTP(type: 'email', identifier: email, otp: otp);
      setState(() {
        _emailVerificationToken = token;
        _emailVerified = true;
      });
      _showNotification('Email verified successfully!');
    } catch (e) {
      _showNotification(e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _isVerifyingEmailOtp = false);
    }
  }

  Future<void> _handleSendPhoneOtp() async {
    final phone = _fullPhoneNumber;
    if (_phoneController.text.trim().isEmpty || _phoneError != null) return;

    setState(() => _isSendingPhoneOtp = true);
    try {
      final repo = ref.read(authRepositoryProvider);
      await repo.sendVerificationOTP(type: 'phone', identifier: phone);
      setState(() {
        _phoneOtpSent = true;
      });
      _startPhoneTimer(60);
      _showNotification('OTP sent to your phone number!');
    } catch (e) {
      _showNotification(e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _isSendingPhoneOtp = false);
    }
  }

  Future<void> _handleVerifyPhoneOtp() async {
    final phone = _fullPhoneNumber;
    final otp = _phoneOtpController.text.trim();
    if (otp.length != 6) return;

    setState(() => _isVerifyingPhoneOtp = true);
    try {
      final repo = ref.read(authRepositoryProvider);
      final token = await repo.verifyInlineOTP(type: 'phone', identifier: phone, otp: otp);
      setState(() {
        _phoneVerificationToken = token;
        _phoneVerified = true;
      });
      _showNotification('Phone number verified successfully!');
    } catch (e) {
      _showNotification(e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _isVerifyingPhoneOtp = false);
    }
  }

  // Slide 1 Validation Check
  bool get _isSlide1Valid {
    final fn = _firstNameController.text.trim();
    final ln = _lastNameController.text.trim();
    final email = _emailController.text.trim();
    final phone = _phoneController.text.trim();

    final isFnOk = fn.isNotEmpty && Validators.validateFirstName(fn) == null && _firstNameError == null;
    final isLnOk = ln.isNotEmpty && Validators.validateLastName(ln) == null && _lastNameError == null;
    final isEmailOk = email.isNotEmpty && Validators.validateEmail(email) == null && _emailError == null;
    final isPhoneOk = phone.isNotEmpty && Validators.validatePhoneNumber(phone, expectedLength: _selectedCountry.phoneLength) == null && _phoneError == null;

    return isFnOk && isLnOk && isEmailOk && isPhoneOk && _emailVerified && _phoneVerified;
  }

  // Slide 2 Validation Check
  bool get _isSlide2Valid {
    final dob = _dateOfBirthController.text.trim();
    final pass = _passwordController.text;
    final confirm = _confirmPasswordController.text;
    final bio = _bioController.text.trim();

    final isDobOk = dob.isNotEmpty && Validators.validateDateOfBirth(dob) == null && _dobError == null;
    final isGenderOk = _selectedGender != null && _selectedGender!.isNotEmpty;
    final isQualOk = _selectedQualification != null && _selectedQualification!.isNotEmpty;
    final isPassOk = pass.isNotEmpty && Validators.validatePassword(pass) == null && _passwordError == null;
    final isConfirmOk = confirm.isNotEmpty && Validators.validateConfirmPassword(pass, confirm) == null && _confirmPasswordError == null;
    final isBioOk = bio.isEmpty || Validators.validateBio(bio) == null;

    return isDobOk && isGenderOk && isQualOk && isPassOk && isConfirmOk && isBioOk && _termsAccepted;
  }

  int _getPasswordStrength(String pass) {
    if (pass.isEmpty) return 0;
    int score = 0;
    if (pass.length >= 8) score += 25;
    if (RegExp(r'[A-Z]').hasMatch(pass)) score += 25;
    if (RegExp(r'[0-9]').hasMatch(pass)) score += 25;
    if (RegExp(r'[^A-Za-z0-9]').hasMatch(pass)) score += 25;
    return score;
  }

  Color _getStrengthColor(int score) {
    if (score <= 25) return Colors.redAccent;
    if (score <= 50) return Colors.orangeAccent;
    if (score <= 75) return Colors.amber;
    return Colors.green;
  }

  Future<void> _submitRegister() async {
    if (!_isSlide2Valid) return;

    final success = await ref.read(authProvider.notifier).register(
          firstName: _firstNameController.text.trim(),
          lastName: _lastNameController.text.trim(),
          email: _emailController.text.trim(),
          phoneNumber: _fullPhoneNumber,
          password: _passwordController.text,
          dateOfBirth: _dateOfBirthController.text.trim(),
          gender: _selectedGender!,
          qualification: _selectedQualification!,
          bio: _bioController.text.trim(),
          profilePic: _profilePicUrl,
          emailVerificationToken: _emailVerificationToken,
          phoneVerificationToken: _phoneVerificationToken,
          role: 'Employee',
        );

    if (success && mounted) {
      _showNotification('Account registered successfully!');
      AppNavigation.replace(context, '/dashboard');
    } else if (mounted) {
      final error = ref.read(authProvider).errorMessage ?? 'Registration failed.';
      _showNotification(error, isError: true);
    }
  }

  void _showTermsModal() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Terms of Service', style: TextStyle(fontWeight: FontWeight.bold)),
        content: const SingleChildScrollView(
          child: Text(
            'By creating an account on Employee Task Manager, you agree to comply with system operations, maintain account security, and adhere to administrative guidelines.',
            style: TextStyle(fontSize: 13),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
        ],
      ),
    );
  }

  void _showPrivacyModal() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Privacy Policy', style: TextStyle(fontWeight: FontWeight.bold)),
        content: const SingleChildScrollView(
          child: Text(
            'Your personal information (name, email, phone number, qualification) is stored securely for authentication, notification alerts, and task assignment.',
            style: TextStyle(fontSize: 13),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Close')),
        ],
      ),
    );
  }



  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        AppNavigation.replace(context, '/login', extra: const {'isBack': true});
      },
      child: Scaffold(
        backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Container(
                padding: const EdgeInsets.all(24.0),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.06),
                      blurRadius: 20,
                      offset: const Offset(0, 8),
                    )
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Header Badge & Title
                    Center(
                      child: Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppColors.primaryPink, AppColors.primaryPurple],
                          ),
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primaryPink.withOpacity(0.3),
                              blurRadius: 12,
                              offset: const Offset(0, 4),
                            )
                          ],
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.shield_outlined,
                            color: Colors.white,
                            size: 24,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 14),
                    Text(
                      'Welcome to Signup',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Create your account to start managing tasks efficiently.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Server Error Banner
                    if (authState.errorMessage != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.red.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, size: 18, color: Colors.redAccent),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                authState.errorMessage!,
                                style: const TextStyle(color: Colors.redAccent, fontSize: 12),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // SLIDE 1: PERSONAL & CONTACT VERIFICATION
                    if (_currentSlide == 1) ...[
                      // Avatar Upload Picker
                      ProfilePicturePicker(
                        initialImageUrl: _profilePicUrl,
                        initialBytes: _profilePicBytes,
                        radius: 40,
                        onImagePicked: (img) {
                          setState(() {
                            _profilePicBytes = img.bytes;
                            _profilePicUrl = img.dataUrl;
                          });
                        },
                        onImageRemoved: () {
                          setState(() {
                            _profilePicBytes = null;
                            _profilePicUrl = null;
                          });
                        },
                      ),
                      const SizedBox(height: 16),

                      // First Name (Full Width)
                      TextField(
                        controller: _firstNameController,
                        inputFormatters: [LengthLimitingTextInputFormatter(50)],
                        onChanged: (v) {
                          setState(() {
                            _firstNameError = Validators.validateFirstName(v);
                          });
                        },
                        decoration: InputDecoration(
                          hintText: 'First Name *',
                          errorText: _firstNameError,
                          errorMaxLines: 2,
                          errorStyle: const TextStyle(color: Colors.redAccent, fontSize: 11),
                          prefixIcon: const Icon(Icons.person_outline, size: 18),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          filled: true,
                          fillColor: isDark ? AppColors.darkBackground : Colors.grey.shade100,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Last Name (Full Width)
                      TextField(
                        controller: _lastNameController,
                        inputFormatters: [LengthLimitingTextInputFormatter(50)],
                        onChanged: (v) {
                          setState(() {
                            _lastNameError = Validators.validateLastName(v);
                          });
                        },
                        decoration: InputDecoration(
                          hintText: 'Last Name *',
                          errorText: _lastNameError,
                          errorMaxLines: 2,
                          errorStyle: const TextStyle(color: Colors.redAccent, fontSize: 11),
                          prefixIcon: const Icon(Icons.person_outline, size: 18),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          filled: true,
                          fillColor: isDark ? AppColors.darkBackground : Colors.grey.shade100,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
                        ),
                      ),
                      const SizedBox(height: 14),

                      // Email Field + Verify Button
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _emailController,
                                  readOnly: _emailVerified,
                                  keyboardType: TextInputType.emailAddress,
                                  inputFormatters: [LengthLimitingTextInputFormatter(254)],
                                  onChanged: (v) {
                                    setState(() {
                                      _emailError = Validators.validateEmail(v);
                                      if (_emailVerified) {
                                        _emailVerified = false;
                                        _emailOtpSent = false;
                                        _emailVerificationToken = '';
                                      }
                                    });
                                  },
                                  onEditingComplete: () {
                                    if (_emailError == null) {
                                      _checkAvailability('email', _emailController.text);
                                    }
                                  },
                                  decoration: InputDecoration(
                                    hintText: 'Email Address *',
                                    prefixIcon: const Icon(Icons.email_outlined, size: 18),
                                    contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                    filled: true,
                                    fillColor: isDark ? AppColors.darkBackground : Colors.grey.shade100,
                                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              if (!_emailVerified)
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primaryPink,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  ),
                                  onPressed: (_isSendingEmailOtp || _emailController.text.trim().isEmpty || _emailError != null || _emailOtpSent)
                                      ? null
                                      : _handleSendEmailOtp,
                                  child: _isSendingEmailOtp
                                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                      : const Text('Verify', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                                )
                              else
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle),
                                  child: const Icon(Icons.check, color: Colors.white, size: 16),
                                ),
                            ],
                          ),
                          if (_emailError != null)
                            Padding(
                              padding: const EdgeInsets.only(left: 12, top: 4),
                              child: Text(_emailError!, style: const TextStyle(color: Colors.redAccent, fontSize: 11)),
                            ),

                          // Email OTP Sub-panel
                          if (_emailOtpSent && !_emailVerified) ...[
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _emailOtpController,
                                    keyboardType: TextInputType.number,
                                    maxLength: 6,
                                    inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                                    decoration: InputDecoration(
                                      hintText: 'Enter 6-digit Email OTP',
                                      counterText: '',
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                      filled: true,
                                      fillColor: isDark ? AppColors.darkBackground : Colors.grey.shade100,
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primaryPurple,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  ),
                                  onPressed: (_isVerifyingEmailOtp || _emailOtpController.text.trim().length != 6)
                                      ? null
                                      : _handleVerifyEmailOtp,
                                  child: _isVerifyingEmailOtp
                                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                      : const Text('Confirm', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                                ),
                              ],
                            ),
                            Padding(
                              padding: const EdgeInsets.only(left: 12, top: 4),
                              child: _emailTimerLeft > 0
                                  ? Text('Resend OTP in ${_emailTimerLeft}s', style: const TextStyle(fontSize: 11, color: Colors.grey))
                                  : TextButton(
                                      style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: Size.zero, tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                                      onPressed: _isSendingEmailOtp ? null : _handleSendEmailOtp,
                                      child: const Text('Resend Email OTP', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primaryPink)),
                                    ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Phone Field + Country Code Selector + Verify Button
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: UnifiedPhoneInput(
                                  controller: _phoneController,
                                  selectedCountry: _selectedCountry,
                                  readOnly: _phoneVerified,
                                  errorText: _phoneError,
                                  onCountryChanged: (CountryInfo c) {
                                    setState(() {
                                      _selectedCountry = c;
                                      _phoneError = Validators.validatePhoneNumber(_phoneController.text, expectedLength: c.phoneLength);
                                    });
                                  },
                                  onChanged: (v) {
                                    setState(() {
                                      _phoneError = Validators.validatePhoneNumber(v, expectedLength: _selectedCountry.phoneLength);
                                      if (_phoneVerified) {
                                        _phoneVerified = false;
                                        _phoneOtpSent = false;
                                        _phoneVerificationToken = '';
                                      }
                                    });
                                  },
                                  onEditingComplete: () {
                                    if (_phoneError == null) {
                                      _checkAvailability('phone', _phoneController.text);
                                    }
                                  },
                                ),
                              ),
                              const SizedBox(width: 8),
                              if (!_phoneVerified)
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primaryPink,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                  ),
                                  onPressed: (_isSendingPhoneOtp || _phoneController.text.trim().isEmpty || _phoneError != null || _phoneOtpSent)
                                      ? null
                                      : _handleSendPhoneOtp,
                                  child: _isSendingPhoneOtp
                                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                      : const Text('Verify', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                                )
                              else
                                Container(
                                  padding: const EdgeInsets.all(10),
                                  decoration: const BoxDecoration(color: Colors.green, shape: BoxShape.circle),
                                  child: const Icon(Icons.check, color: Colors.white, size: 16),
                                ),
                            ],
                          ),

                          // Phone OTP Sub-panel
                          if (_phoneOtpSent && !_phoneVerified) ...[
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                Expanded(
                                  child: TextField(
                                    controller: _phoneOtpController,
                                    keyboardType: TextInputType.number,
                                    maxLength: 6,
                                    decoration: InputDecoration(
                                      hintText: 'Enter 6-digit Phone OTP',
                                      counterText: '',
                                      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                      filled: true,
                                      fillColor: isDark ? AppColors.darkBackground : Colors.grey.shade100,
                                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 8),
                                ElevatedButton(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primaryPurple,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                  ),
                                  onPressed: (_isVerifyingPhoneOtp || _phoneOtpController.text.trim().length != 6)
                                      ? null
                                      : _handleVerifyPhoneOtp,
                                  child: _isVerifyingPhoneOtp
                                      ? const SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                      : const Text('Confirm', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                                ),
                              ],
                            ),
                            Padding(
                              padding: const EdgeInsets.only(left: 12, top: 4),
                              child: _phoneTimerLeft > 0
                                  ? Text('Resend OTP in ${_phoneTimerLeft}s', style: const TextStyle(fontSize: 11, color: Colors.grey))
                                  : TextButton(
                                      style: TextButton.styleFrom(padding: EdgeInsets.zero, minimumSize: Size.zero, tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                                      onPressed: _isSendingPhoneOtp ? null : _handleSendPhoneOtp,
                                      child: const Text('Resend Phone OTP', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primaryPink)),
                                    ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 20),

                      // Next Button (Disabled until Slide 1 valid & OTP verified)
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                          backgroundColor: AppColors.primaryPink,
                          disabledBackgroundColor: Colors.grey.shade300,
                        ),
                        onPressed: _isSlide1Valid ? () => setState(() => _currentSlide = 2) : null,
                        child: const Text('Next', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                      ),
                    ],

                    // SLIDE 2: PROFILE DETAILS & PASSWORD
                    if (_currentSlide == 2) ...[
                      // Date of Birth Field
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TextField(
                            controller: _dateOfBirthController,
                            readOnly: true,
                            onTap: () async {
                              final picked = await showDatePicker(
                                context: context,
                                initialDate: DateTime(2000, 1, 1),
                                firstDate: DateTime(1920),
                                lastDate: DateTime.now(),
                              );
                              if (picked != null) {
                                final formatted = DateFormat('yyyy-MM-dd').format(picked);
                                setState(() {
                                  _dateOfBirthController.text = formatted;
                                  _dobError = Validators.validateDateOfBirth(formatted);
                                });
                              }
                            },
                            decoration: InputDecoration(
                              hintText: 'Date of Birth (YYYY-MM-DD) *',
                              prefixIcon: const Icon(Icons.calendar_today_outlined, size: 18),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              filled: true,
                              fillColor: isDark ? AppColors.darkBackground : Colors.grey.shade100,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
                            ),
                          ),
                          if (_dobError != null)
                            Padding(
                              padding: const EdgeInsets.only(left: 12, top: 4),
                              child: Text(_dobError!, style: const TextStyle(color: Colors.redAccent, fontSize: 11)),
                            ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Gender Chips
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Gender *',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: ['Male', 'Female', 'Other'].map((g) {
                              final selected = _selectedGender == g;
                              return Expanded(
                                child: Padding(
                                  padding: const EdgeInsets.symmetric(horizontal: 4),
                                  child: ChoiceChip(
                                    label: Center(child: Text(g, style: const TextStyle(fontSize: 12))),
                                    selected: selected,
                                    selectedColor: AppColors.primaryPink,
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                                    labelStyle: TextStyle(color: selected ? Colors.white : (isDark ? Colors.white : Colors.black), fontWeight: FontWeight.bold),
                                    onSelected: (sel) {
                                      if (sel) setState(() => _selectedGender = g);
                                    },
                                  ),
                                ),
                              );
                            }).toList(),
                          ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Qualification Dropdown
                      DropdownButtonFormField<String>(
                        value: _selectedQualification,
                        decoration: InputDecoration(
                          hintText: 'Select Qualification *',
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          filled: true,
                          fillColor: isDark ? AppColors.darkBackground : Colors.grey.shade100,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
                        ),
                        items: ['10th', '12th', 'Graduation', 'Post Graduation', 'PhD', 'Other', "Bachelor's", "Master's"]
                            .map((q) => DropdownMenuItem(value: q, child: Text(q, style: const TextStyle(fontSize: 13))))
                            .toList(),
                        onChanged: (v) {
                          setState(() => _selectedQualification = v);
                        },
                      ),
                      const SizedBox(height: 14),

                      // Bio Input (Optional)
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TextField(
                            controller: _bioController,
                            maxLength: 500,
                            maxLines: 2,
                            inputFormatters: [LengthLimitingTextInputFormatter(500)],
                            onChanged: (v) {
                              setState(() {
                                _bioError = Validators.validateBio(v);
                              });
                            },
                            decoration: InputDecoration(
                              hintText: 'Bio (Optional, max 500 chars)',
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              filled: true,
                              fillColor: isDark ? AppColors.darkBackground : Colors.grey.shade100,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
                            ),
                          ),
                          if (_bioError != null)
                            Padding(
                              padding: const EdgeInsets.only(left: 12, top: 4),
                              child: Text(_bioError!, style: const TextStyle(color: Colors.redAccent, fontSize: 11)),
                            ),
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Password Input + Strength Meter
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TextField(
                            controller: _passwordController,
                            obscureText: _obscurePassword,
                            inputFormatters: [LengthLimitingTextInputFormatter(100)],
                            onChanged: (v) {
                              setState(() {
                                _passwordError = Validators.validatePassword(v);
                                if (_confirmPasswordController.text.isNotEmpty) {
                                  _confirmPasswordError = Validators.validateConfirmPassword(v, _confirmPasswordController.text);
                                }
                              });
                            },
                            decoration: InputDecoration(
                              hintText: 'Password *',
                              errorText: _passwordError,
                              errorMaxLines: 2,
                              errorStyle: const TextStyle(color: Colors.redAccent, fontSize: 11),
                              prefixIcon: const Icon(Icons.lock_outline, size: 18),
                              suffixIcon: IconButton(
                                icon: Icon(_obscurePassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18),
                                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                              ),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              filled: true,
                              fillColor: isDark ? AppColors.darkBackground : Colors.grey.shade100,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
                            ),
                          ),
                          if (_passwordController.text.isNotEmpty) ...[
                            const SizedBox(height: 6),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(4),
                              child: LinearProgressIndicator(
                                value: _getPasswordStrength(_passwordController.text) / 100,
                                backgroundColor: Colors.grey.shade200,
                                color: _getStrengthColor(_getPasswordStrength(_passwordController.text)),
                                minHeight: 4,
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 14),

                      // Confirm Password Input
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TextField(
                            controller: _confirmPasswordController,
                            obscureText: _obscureConfirmPassword,
                            inputFormatters: [LengthLimitingTextInputFormatter(100)],
                            onChanged: (v) {
                              setState(() {
                                _confirmPasswordError = Validators.validateConfirmPassword(_passwordController.text, v);
                              });
                            },
                            decoration: InputDecoration(
                              hintText: 'Confirm Password *',
                              errorText: _confirmPasswordError,
                              errorMaxLines: 2,
                              errorStyle: const TextStyle(color: Colors.redAccent, fontSize: 11),
                              prefixIcon: const Icon(Icons.lock_outline, size: 18),
                              suffixIcon: IconButton(
                                icon: Icon(_obscureConfirmPassword ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 18),
                                onPressed: () => setState(() => _obscureConfirmPassword = !_obscureConfirmPassword),
                              ),
                              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                              filled: true,
                              fillColor: isDark ? AppColors.darkBackground : Colors.grey.shade100,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(30), borderSide: BorderSide.none),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // Terms Agreement Checkbox
                      Row(
                        children: [
                          Checkbox(
                            value: _termsAccepted,
                            activeColor: AppColors.primaryPink,
                            onChanged: (v) => setState(() => _termsAccepted = v ?? false),
                          ),
                          Expanded(
                            child: Wrap(
                              crossAxisAlignment: WrapCrossAlignment.center,
                              children: [
                                const Text('I explicitly agree to the ', style: TextStyle(fontSize: 11)),
                                GestureDetector(
                                  onTap: _showTermsModal,
                                  child: const Text('Terms of Service', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primaryPink, decoration: TextDecoration.underline)),
                                ),
                                const Text(' and ', style: TextStyle(fontSize: 11)),
                                GestureDetector(
                                  onTap: _showPrivacyModal,
                                  child: const Text('Privacy Policy', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primaryPink, decoration: TextDecoration.underline)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // Bottom Navigation Actions (Back + Register)
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                              ),
                              onPressed: () => setState(() => _currentSlide = 1),
                              child: const Text('Back', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            flex: 2,
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                                backgroundColor: AppColors.primaryPink,
                                disabledBackgroundColor: Colors.grey.shade300,
                              ),
                              onPressed: (_isSlide2Valid && !authState.isLoading) ? _submitRegister : null,
                              child: authState.isLoading
                                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                  : const Text('Register', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                            ),
                          ),
                        ],
                      ),
                    ],

                    const SizedBox(height: 20),

                    // Switch to Sign In Link
                    Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          "Already have an account? ",
                          style: TextStyle(
                            fontSize: 13,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                          ),
                        ),
                        GestureDetector(
                          onTap: () => AppNavigation.replace(context, '/login', extra: const {'isBack': true}),
                          child: const Text(
                            'Sign In',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primaryPink,
                            ),
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

