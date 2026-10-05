import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/app_navigation.dart';
import '../../../core/utils/validators.dart';
import '../../../data/repositories/auth_repository.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() => _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen> {
  int _step = 1; // 1: Enter email, 2: Enter OTP, 3: Reset Password
  final _emailController = TextEditingController();
  final _otpController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  final _formKeyStep1 = GlobalKey<FormState>();
  final _formKeyStep2 = GlobalKey<FormState>();
  final _formKeyStep3 = GlobalKey<FormState>();

  bool _isLoading = false;
  String? _errorMessage;
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  int _resendCooldown = 0;
  Timer? _timer;

  @override
  void dispose() {
    _emailController.dispose();
    _otpController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _timer?.cancel();
    super.dispose();
  }

  void _startTimer([int seconds = 60]) {
    _timer?.cancel();
    setState(() => _resendCooldown = seconds);
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_resendCooldown <= 1) {
        timer.cancel();
        if (mounted) setState(() => _resendCooldown = 0);
      } else {
        if (mounted) setState(() => _resendCooldown--);
      }
    });
  }

  bool get _isStep1Valid {
    final email = _emailController.text.trim();
    return email.isNotEmpty && Validators.validateEmail(email) == null;
  }

  bool get _isStep2Valid {
    return _otpController.text.trim().length == 6;
  }

  bool get _isStep3Valid {
    final pass = _passwordController.text;
    final confirm = _confirmPasswordController.text;
    return pass.isNotEmpty &&
        Validators.validatePassword(pass) == null &&
        confirm.isNotEmpty &&
        Validators.validateConfirmPassword(pass, confirm) == null;
  }

  void _handleSendOtp() async {
    if (!_isStep1Valid) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final repo = AuthRepository();
      await repo.sendForgotPasswordOTP(_emailController.text.trim());
      if (mounted) {
        setState(() {
          _isLoading = false;
          _step = 2;
        });
        _startTimer(60);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Success! Please check your email for the OTP.'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  void _handleVerifyOtp() async {
    if (!_isStep2Valid) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final repo = AuthRepository();
      await repo.verifyForgotOTP(
        _emailController.text.trim(),
        _otpController.text.trim(),
      );
      if (mounted) {
        setState(() {
          _isLoading = false;
          _step = 3;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('OTP verified successfully! Please enter your new password.'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  void _handleResetPassword() async {
    if (!_isStep3Valid) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final repo = AuthRepository();
      await repo.resetPassword(
        _emailController.text.trim(),
        _otpController.text.trim(),
        _passwordController.text,
      );
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Password updated successfully! Redirecting to login...'),
            backgroundColor: Colors.green,
          ),
        );
        Future.delayed(const Duration(milliseconds: 1500), () {
          if (mounted) AppNavigation.replace(context, '/login', extra: const {'isBack': true});
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
          _errorMessage = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        AppNavigation.replace(context, '/login', extra: const {'isBack': true});
      },
      child: Scaffold(
        backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
        appBar: AppBar(
          backgroundColor: Colors.transparent,
          elevation: 0,
          leading: IconButton(
            icon: Icon(
              Icons.arrow_back_ios_new,
              size: 18,
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
            ),
            onPressed: () => AppNavigation.replace(context, '/login', extra: const {'isBack': true}),
          ),
        title: Text(
          'Reset Password',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
          ),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Container(
                padding: const EdgeInsets.all(28.0),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(
                    color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.06),
                      blurRadius: 24,
                      offset: const Offset(0, 10),
                    )
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Step Icon
                    Center(
                      child: Container(
                        width: 52,
                        height: 52,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [AppColors.primaryPink, AppColors.primaryPurple],
                          ),
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.primaryPink.withOpacity(0.35),
                              blurRadius: 14,
                              offset: const Offset(0, 5),
                            )
                          ],
                        ),
                        child: const Center(
                          child: Icon(
                            Icons.lock_reset,
                            color: Colors.white,
                            size: 28,
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(height: 18),
                    Text(
                      _step == 1
                          ? 'Forgot Password'
                          : _step == 2
                              ? 'Enter Verification Code'
                              : 'Set New Password',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      _step == 1
                          ? 'Enter your registered email address to receive an OTP.'
                          : _step == 2
                              ? 'Enter the 6-digit OTP code sent to ${_emailController.text}.'
                              : 'Create a strong new password for your account.',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                    ),
                    const SizedBox(height: 24),

                    // Error Alert
                    if (_errorMessage != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: Colors.red.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, size: 18, color: Colors.redAccent),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _errorMessage!,
                                style: const TextStyle(color: Colors.redAccent, fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Step 1: Email Form
                    if (_step == 1)
                      Form(
                        key: _formKeyStep1,
                        autovalidateMode: AutovalidateMode.onUserInteraction,
                        child: Column(
                          children: [
                            CustomTextField(
                              label: '',
                              hint: 'Email Address *',
                              controller: _emailController,
                              keyboardType: TextInputType.emailAddress,
                              inputFormatters: [LengthLimitingTextInputFormatter(254)],
                              validator: Validators.validateEmail,
                              prefixIcon: const Icon(Icons.email_outlined, size: 20),
                              borderRadius: BorderRadius.circular(30),
                              onChanged: (_) => setState(() {}),
                            ),
                            const SizedBox(height: 20),
                            CustomButton(
                              text: 'Send OTP',
                              onPressed: _isStep1Valid ? _handleSendOtp : null,
                              isLoading: _isLoading,
                            ),
                          ],
                        ),
                      ),

                    // Step 2: OTP Form
                    if (_step == 2)
                      Form(
                        key: _formKeyStep2,
                        autovalidateMode: AutovalidateMode.onUserInteraction,
                        child: Column(
                          children: [
                            CustomTextField(
                              label: '',
                              hint: '6-Digit OTP *',
                              controller: _otpController,
                              keyboardType: TextInputType.number,
                              inputFormatters: [
                                FilteringTextInputFormatter.digitsOnly,
                                LengthLimitingTextInputFormatter(6),
                              ],
                              validator: (val) {
                                if (val == null || val.trim().length != 6) {
                                  return 'Please enter 6-digit OTP code.';
                                }
                                return null;
                              },
                              prefixIcon: const Icon(Icons.security, size: 20),
                              borderRadius: BorderRadius.circular(30),
                              onChanged: (_) => setState(() {}),
                            ),
                            const SizedBox(height: 12),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                TextButton(
                                  onPressed: () {
                                    setState(() {
                                      _step = 1;
                                      _errorMessage = null;
                                    });
                                  },
                                  child: const Text('Change Email'),
                                ),
                                _resendCooldown > 0
                                    ? Text(
                                        'Resend in ${_resendCooldown}s',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                        ),
                                      )
                                    : TextButton(
                                        onPressed: _isStep1Valid ? _handleSendOtp : null,
                                        child: const Text(
                                          'Resend OTP',
                                          style: TextStyle(fontWeight: FontWeight.bold),
                                        ),
                                      ),
                              ],
                            ),
                            const SizedBox(height: 14),
                            CustomButton(
                              text: 'Verify OTP',
                              onPressed: _isStep2Valid ? _handleVerifyOtp : null,
                              isLoading: _isLoading,
                            ),
                          ],
                        ),
                      ),

                    // Step 3: Password Form
                    if (_step == 3)
                      Form(
                        key: _formKeyStep3,
                        autovalidateMode: AutovalidateMode.onUserInteraction,
                        child: Column(
                          children: [
                            CustomTextField(
                              label: '',
                              hint: 'New Password *',
                              controller: _passwordController,
                              obscureText: _obscurePassword,
                              inputFormatters: [LengthLimitingTextInputFormatter(100)],
                              validator: Validators.validatePassword,
                              prefixIcon: const Icon(Icons.lock_outline, size: 20),
                              borderRadius: BorderRadius.circular(30),
                              onChanged: (_) => setState(() {}),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword
                                      ? Icons.visibility_off_outlined
                                      : Icons.visibility_outlined,
                                  size: 20,
                                ),
                                onPressed: () {
                                  setState(() => _obscurePassword = !_obscurePassword);
                                },
                              ),
                            ),
                            const SizedBox(height: 14),
                            CustomTextField(
                              label: '',
                              hint: 'Confirm Password *',
                              controller: _confirmPasswordController,
                              obscureText: _obscureConfirmPassword,
                              inputFormatters: [LengthLimitingTextInputFormatter(100)],
                              validator: (val) => Validators.validateConfirmPassword(
                                _passwordController.text,
                                val,
                              ),
                              prefixIcon: const Icon(Icons.lock_clock_outlined, size: 20),
                              borderRadius: BorderRadius.circular(30),
                              onChanged: (_) => setState(() {}),
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscureConfirmPassword
                                      ? Icons.visibility_off_outlined
                                      : Icons.visibility_outlined,
                                  size: 20,
                                ),
                                onPressed: () {
                                  setState(
                                      () => _obscureConfirmPassword = !_obscureConfirmPassword);
                                },
                              ),
                            ),
                            const SizedBox(height: 20),
                            CustomButton(
                              text: 'Update Password',
                              onPressed: _isStep3Valid ? _handleResetPassword : null,
                              isLoading: _isLoading,
                            ),
                          ],
                        ),
                      ),

                    const SizedBox(height: 20),
                    Center(
                      child: GestureDetector(
                        onTap: () => AppNavigation.replace(context, '/login', extra: const {'isBack': true}),
                        child: Text(
                          'Back to Sign In',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppColors.darkTextPrimary : const Color(0xFF334155),
                          ),
                        ),
                      ),
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
