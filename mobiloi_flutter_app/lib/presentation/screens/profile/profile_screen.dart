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
import '../../providers/theme_provider.dart';
import '../../widgets/enterprise_bottom_nav_bar.dart';
import '../../widgets/enterprise_user_avatar.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  String _activeTab = 'profile'; // 'profile', 'edit', 'reset-password'

  // Edit profile form controllers
  final _editFormKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _dobController = TextEditingController();
  final _bioController = TextEditingController();

  CountryInfo _selectedCountry = CountryData.defaultCountry;
  String? _selectedGender;
  String? _selectedQualification;

  // Selected new avatar image (local memory bytes or base64)
  Uint8List? _newAvatarBytes;
  String? _newAvatarDataUrl;
  bool _removeAvatarRequested = false;

  // Reset password form controllers
  final _passwordFormKey = GlobalKey<FormState>();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _populateUserControllers();
    Future.microtask(() {
      ref.read(authProvider.notifier).fetchProfile();
    });
  }

  /// Updates all edit-profile form controllers and dropdown values from the
  /// currently loaded user. Uses `.text = ...` on existing controllers so Form
  /// field widgets that already hold a reference to the controller reflect the
  /// updated values immediately.
  void _populateUserControllers() {
    final user = ref.read(authProvider).user;

    _firstNameController.text = user?.firstName ?? '';
    _lastNameController.text = user?.lastName ?? '';

    // Parse phone number into country code & national number
    final phone = user?.phoneNumber ?? '';
    _selectedCountry = CountryData.countries.firstWhere(
      (c) => phone.startsWith(c.callingCode),
      orElse: () => CountryData.defaultCountry,
    );
    final rawNumber = phone.startsWith(_selectedCountry.callingCode)
        ? phone.substring(_selectedCountry.callingCode.length)
        : phone;
    _phoneController.text = rawNumber;

    _dobController.text =
        user?.dateOfBirth != null ? _formatDateForInput(user!.dateOfBirth!) : '';
    if (user?.gender != null && user!.gender!.isNotEmpty) {
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
    _selectedQualification = user?.qualification;
    _bioController.text = user?.bio ?? '';

    _newAvatarBytes = null;
    _newAvatarDataUrl = null;
    _removeAvatarRequested = false;
  }

  String _formatDateForInput(String rawDate) {
    try {
      final d = DateTime.parse(rawDate);
      return DateFormat('yyyy-MM-dd').format(d);
    } catch (_) {
      return rawDate;
    }
  }

  String _formatDateDisplay(String? rawDate) {
    if (rawDate == null || rawDate.isEmpty) return 'Not provided';
    try {
      final d = DateTime.parse(rawDate);
      return DateFormat('dd MMM yyyy').format(d);
    } catch (_) {
      return rawDate;
    }
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _lastNameController.dispose();
    _phoneController.dispose();
    _dobController.dispose();
    _bioController.dispose();

    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleSaveProfile() async {
    final user = ref.read(authProvider).user;
    final phoneDigits = _phoneController.text.trim();
    final fullPhone = phoneDigits.isNotEmpty ? '${_selectedCountry.callingCode}$phoneDigits' : '';
    final origDob = user?.dateOfBirth != null ? _formatDateForInput(user!.dateOfBirth!) : '';

    final hasChanges =
        _firstNameController.text.trim() != (user?.firstName ?? '').trim() ||
        _lastNameController.text.trim() != (user?.lastName ?? '').trim() ||
        fullPhone != (user?.phoneNumber ?? '').trim() ||
        _dobController.text.trim() != origDob ||
        _selectedGender != user?.gender ||
        _selectedQualification != user?.qualification ||
        _bioController.text.trim() != (user?.bio ?? '').trim() ||
        _newAvatarBytes != null ||
        _newAvatarDataUrl != null ||
        (_removeAvatarRequested && (user?.profilePicture != null && user!.profilePicture!.isNotEmpty));

    if (!hasChanges) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('No changes to save'),
          duration: Duration(seconds: 2),
        ),
      );
      return;
    }

    if (!_editFormKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    final payload = <String, dynamic>{
      'firstName': _firstNameController.text.trim(),
      'lastName': _lastNameController.text.trim(),
      if (fullPhone.isNotEmpty) 'phoneNumber': fullPhone,
      if (_dobController.text.trim().isNotEmpty) 'dateOfBirth': _dobController.text.trim(),
      if (_selectedGender != null) 'gender': _selectedGender,
      if (_selectedQualification != null) 'qualification': _selectedQualification,
      'bio': _bioController.text.trim(),
    };

    if (_removeAvatarRequested) {
      payload['profilePicture'] = null;
      payload['profilePic'] = null;
    } else if (_newAvatarDataUrl != null) {
      payload['profilePicture'] = _newAvatarDataUrl;
      payload['profilePic'] = _newAvatarDataUrl;
    }

    final success = await ref.read(authProvider.notifier).updateProfile(payload);
    setState(() => _isSubmitting = false);

    if (mounted) {
      if (success) {
        await ref.read(authProvider.notifier).fetchProfile();
        if (mounted) {
          _populateUserControllers();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Profile updated successfully!'),
              backgroundColor: Colors.green,
            ),
          );
          setState(() => _activeTab = 'profile');
        }
      } else {
        final error = ref.read(authProvider).errorMessage ?? 'Failed to update profile';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _handleChangePassword() async {
    if (!_passwordFormKey.currentState!.validate()) return;

    if (_newPasswordController.text != _confirmPasswordController.text) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('New passwords do not match'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final success = await ref.read(authProvider.notifier).changePassword(
          currentPassword: _currentPasswordController.text,
          newPassword: _newPasswordController.text,
        );

    setState(() => _isSubmitting = false);

    if (mounted) {
      if (success) {
        _currentPasswordController.clear();
        _newPasswordController.clear();
        _confirmPasswordController.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Password changed successfully!'),
            backgroundColor: Colors.green,
          ),
        );
        setState(() => _activeTab = 'profile');
      } else {
        final error = ref.read(authProvider).errorMessage ?? 'Failed to change password';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _handleDeleteAccount() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Your Account?'),
        content: const Text(
          'Are you sure you want to permanently delete your account? Your profile data will be removed from active databases.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Delete My Account'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    setState(() => _isSubmitting = true);
    final success = await ref.read(authProvider.notifier).deleteAccount();
    setState(() => _isSubmitting = false);

    if (mounted) {
      if (success) {
        AppNavigation.replace(context, '/login');
      } else {
        final error = ref.read(authProvider).errorMessage ?? 'Failed to delete account';
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(error),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  Future<void> _handleLogout() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Log Out'),
        content: const Text('Are you sure you want to log out of your account?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.redAccent,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Log Out'),
          ),
        ],
      ),
    );

    if (confirm != true) return;

    await ref.read(authProvider.notifier).logout();
    if (mounted) {
      AppNavigation.replace(context, '/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AuthState>(authProvider, (previous, next) {
      if (previous?.user != next.user && next.user != null) {
        _populateUserControllers();
        if (mounted) setState(() {});
      }
    });

    final authState = ref.watch(authProvider);
    final user = authState.user;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    if (authState.isLoading) {
      return Scaffold(
        backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
        appBar: AppBar(
          backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
          elevation: 0,
          automaticallyImplyLeading: false,
          title: Text(
            'Profile Settings',
            style: TextStyle(
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        bottomNavigationBar: const EnterpriseBottomNavBar(currentRoute: '/profile'),
        body: const Center(
          child: CircularProgressIndicator(),
        ),
      );
    }

    if (user == null) {
      return Scaffold(
        backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
        appBar: AppBar(
          backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
          elevation: 0,
          automaticallyImplyLeading: false,
          title: Text(
            'Profile Settings',
            style: TextStyle(
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        bottomNavigationBar: const EnterpriseBottomNavBar(currentRoute: '/profile'),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
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
                  await ref.read(authProvider.notifier).checkAuthStatus();
                  _populateUserControllers();
                },
              ),
            ],
          ),
        ),
      );
    }

    final initials = (user.firstName.isNotEmpty ? user.firstName[0].toUpperCase() : '') +
        (user.lastName.isNotEmpty ? user.lastName[0].toUpperCase() : 'U');

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        AppNavigation.go(context, '/dashboard', extra: const {'isBack': true});
      },
      child: Scaffold(
        backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
        appBar: AppBar(
          backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
          elevation: 0,
          automaticallyImplyLeading: false,
          title: Text(
            'Profile Settings',
            style: TextStyle(
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
          actions: [
            _buildSettingsMenu(context, isDark),
            const SizedBox(width: 6),
          ],
        ),
        bottomNavigationBar: const EnterpriseBottomNavBar(currentRoute: '/profile'),
        body: RefreshIndicator(
          onRefresh: () async {
            await ref.read(authProvider.notifier).fetchProfile();
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(20),
            child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Manage your personal information, contact credentials, and account settings.',
                style: TextStyle(
                  fontSize: 14,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 20),

              // Navigation Tabs
              Container(
                padding: const EdgeInsets.all(6),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder,
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () {
                          _populateUserControllers();
                          setState(() => _activeTab = 'profile');
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            gradient: (_activeTab == 'profile' || _activeTab == 'edit')
                                ? const LinearGradient(
                                    colors: [AppColors.primaryPink, AppColors.primaryPurple],
                                  )
                                : null,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          alignment: Alignment.center,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.person_outline,
                                size: 18,
                                color: (_activeTab == 'profile' || _activeTab == 'edit')
                                    ? Colors.white
                                    : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Overview',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: (_activeTab == 'profile' || _activeTab == 'edit')
                                      ? Colors.white
                                      : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                    const SizedBox(width: 6),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _activeTab = 'reset-password'),
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 10),
                          decoration: BoxDecoration(
                            gradient: _activeTab == 'reset-password'
                                ? const LinearGradient(
                                    colors: [AppColors.primaryPink, AppColors.primaryPurple],
                                  )
                                : null,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          alignment: Alignment.center,
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.lock_outline,
                                size: 18,
                                color: _activeTab == 'reset-password'
                                    ? Colors.white
                                    : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'Reset Password',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: _activeTab == 'reset-password'
                                      ? Colors.white
                                      : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Tab Content
              if (_activeTab == 'profile') _buildOverviewTab(context, user, initials, isDark),
              if (_activeTab == 'edit') _buildEditTab(context, user, isDark),
              if (_activeTab == 'reset-password') _buildResetPasswordTab(context, isDark),

              const SizedBox(height: 24),

              // Security Card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.verified_user_outlined, size: 20, color: AppColors.primaryPink),
                        const SizedBox(width: 8),
                        Text(
                          'Security & Status',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Your account is active and protected with verified contact authentication.',
                      style: TextStyle(
                        fontSize: 13,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Row(
                      children: [
                        Icon(Icons.check_circle, size: 16, color: Colors.green),
                        SizedBox(width: 6),
                        Text(
                          'Verified Account',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: Colors.green,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              if (user.role.toLowerCase() != 'admin') ...[
                const SizedBox(height: 24),
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: isDark ? const Color(0xFF2A1519) : const Color(0xFFFFF1F2),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(
                      color: isDark ? const Color(0xFF4C1D24) : const Color(0xFFFECDD3),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Danger Zone',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                          color: Colors.red,
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        'Permanently delete your account and profile data.',
                        style: TextStyle(
                          fontSize: 12,
                          color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                        ),
                      ),
                      const SizedBox(height: 14),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.red,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                          onPressed: _isSubmitting ? null : _handleDeleteAccount,
                          icon: const Icon(Icons.delete_forever, size: 18),
                          label: const Text(
                            'Delete Account',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              // ── Session & Logout Section ──
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder,
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.logout, size: 20, color: Colors.redAccent),
                        const SizedBox(width: 8),
                        Text(
                          'Account Session',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Log out of your session on this device. You will need to sign in again with your credentials.',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                    ),
                    const SizedBox(height: 14),
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.redAccent,
                          side: const BorderSide(color: Colors.redAccent),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        onPressed: _isSubmitting ? null : _handleLogout,
                        icon: const Icon(Icons.logout, size: 18),
                        label: const Text(
                          'Log Out',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],
          ),
        ),
        ),
      ),
    );
  }

  Widget _buildOverviewTab(BuildContext context, dynamic user, String initials, bool isDark) {
    final avatarUrl = user?.profilePicture;

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurface : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder,
            ),
          ),
          child: Column(
            children: [
              Row(
                children: [
                    EnterpriseUserAvatar(
                      profilePicture: avatarUrl?.toString(),
                      firstName: user?.firstName?.toString(),
                      lastName: user?.lastName?.toString(),
                      email: user?.email?.toString(),
                      radius: 36,
                      fontSize: 26,
                      backgroundColor: AppColors.primaryPink,
                      textColor: Colors.white,
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            user?.fullName ?? 'User Name',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            user?.email ?? '',
                            style: TextStyle(
                              fontSize: 13,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.blue.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  user?.role.toUpperCase() ?? 'EMPLOYEE',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.blue,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: Colors.green.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: const Text(
                                  'Verified',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.green,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [AppColors.primaryPink, AppColors.primaryPurple],
                      ),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      onPressed: () async {
                        await AppNavigation.push<bool>(context, '/profile/edit');
                        if (mounted) {
                          await ref.read(authProvider.notifier).fetchProfile();
                          if (mounted) {
                            _populateUserControllers();
                          }
                        }
                      },
                      icon: const Icon(Icons.edit_outlined, size: 16, color: Colors.white),
                      label: const Text(
                        'Edit Profile',
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        const SizedBox(height: 24),

        Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: isDark ? AppColors.darkSurface : Colors.white,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder,
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'PERSONAL & CONTACT DETAILS',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 16),

              _buildDetailTile(
                Icons.person_outline,
                'First Name',
                (user?.firstName != null && user!.firstName.isNotEmpty) ? user.firstName : 'Not provided',
                isDark,
              ),
              _buildDetailTile(
                Icons.person_outline,
                'Last Name',
                (user?.lastName != null && user!.lastName.isNotEmpty) ? user.lastName : 'Not provided',
                isDark,
              ),
              _buildDetailTile(
                Icons.email_outlined,
                'Email Address',
                (user?.email != null && user!.email.isNotEmpty) ? user.email : 'Not provided',
                isDark,
              ),
              _buildDetailTile(
                Icons.phone_outlined,
                'Phone Number',
                (user?.phoneNumber != null && user!.phoneNumber!.isNotEmpty) ? user.phoneNumber! : 'Not provided',
                isDark,
              ),
              _buildDetailTile(
                Icons.calendar_today_outlined,
                'Date of Birth',
                _formatDateDisplay(user?.dateOfBirth),
                isDark,
              ),
              _buildDetailTile(
                Icons.wc_outlined,
                'Gender',
                (user?.gender != null && user!.gender!.isNotEmpty)
                    ? user.gender![0].toUpperCase() + user.gender!.substring(1)
                    : 'Not provided',
                isDark,
              ),
              _buildDetailTile(
                Icons.school_outlined,
                'Qualification',
                (user?.qualification != null && user!.qualification!.isNotEmpty) ? user.qualification! : 'Not provided',
                isDark,
              ),
              _buildDetailTile(
                Icons.notes_outlined,
                'Bio',
                (user?.bio != null && user!.bio!.isNotEmpty) ? user.bio! : 'Not provided',
                isDark,
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildDetailTile(IconData icon, String label, String value, bool isDark) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: isDark ? AppColors.darkBackground.withOpacity(0.5) : const Color(0xFFF8FAFC),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isDark ? AppColors.darkCardBorder.withOpacity(0.5) : Colors.black12,
          ),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Icon(icon, size: 18, color: AppColors.primaryPink),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    label.toUpperCase(),
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    value,
                    softWrap: true,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEditTab(BuildContext context, dynamic user, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder,
        ),
      ),
      child: Form(
        key: _editFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Edit Profile Details',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Update your personal information, profile photo, and contact credentials.',
              style: TextStyle(
                fontSize: 12,
                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
              ),
            ),
            const SizedBox(height: 20),

            // Profile Image Picker & Delete Section
            ProfilePicturePicker(
              initialImageUrl: user?.profilePicture,
              initialBytes: _newAvatarBytes,
              radius: 40,
              onImagePicked: (img) {
                setState(() {
                  _newAvatarBytes = img.bytes;
                  _newAvatarDataUrl = img.dataUrl;
                  _removeAvatarRequested = false;
                });
              },
              onImageRemoved: () {
                setState(() {
                  _newAvatarBytes = null;
                  _newAvatarDataUrl = null;
                  _removeAvatarRequested = true;
                });
              },
            ),
            const SizedBox(height: 20),

            // First Name
            TextFormField(
              controller: _firstNameController,
              inputFormatters: [LengthLimitingTextInputFormatter(50)],
              decoration: const InputDecoration(
                labelText: 'First Name *',
                prefixIcon: Icon(Icons.person_outline),
              ),
              validator: Validators.validateFirstName,
            ),
            const SizedBox(height: 14),

            // Last Name
            TextFormField(
              controller: _lastNameController,
              inputFormatters: [LengthLimitingTextInputFormatter(50)],
              decoration: const InputDecoration(
                labelText: 'Last Name *',
                prefixIcon: Icon(Icons.person_outline),
              ),
              validator: Validators.validateLastName,
            ),
            const SizedBox(height: 14),

            // Phone Number with Country Selector
            UnifiedPhoneInput(
              controller: _phoneController,
              selectedCountry: _selectedCountry,
              onCountryChanged: (CountryInfo c) {
                setState(() {
                  _selectedCountry = c;
                });
              },
            ),
            const SizedBox(height: 14),

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
                  lastDate: DateTime.now(),
                );
                if (picked != null) {
                  _dobController.text = DateFormat('yyyy-MM-dd').format(picked);
                }
              },
            ),
            const SizedBox(height: 14),

            // Gender Dropdown
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
            const SizedBox(height: 14),

            // Qualification Dropdown
            DropdownButtonFormField<String>(
              value: ['10th', '12th', 'Graduation', 'Post Graduation', 'PhD', 'Other', "Bachelor's", "Master's"].contains(_selectedQualification)
                  ? _selectedQualification
                  : null,
              decoration: const InputDecoration(
                labelText: 'Qualification',
                prefixIcon: Icon(Icons.school_outlined),
              ),
              items: ['10th', '12th', 'Graduation', 'Post Graduation', 'PhD', 'Other', "Bachelor's", "Master's"]
                  .map((q) => DropdownMenuItem(value: q, child: Text(q)))
                  .toList(),
              onChanged: (val) {
                if (val != null) {
                  setState(() => _selectedQualification = val);
                }
              },
            ),
            const SizedBox(height: 14),

            // Bio
            TextFormField(
              controller: _bioController,
              maxLength: 500,
              maxLines: 3,
              inputFormatters: [LengthLimitingTextInputFormatter(500)],
              decoration: const InputDecoration(
                labelText: 'Bio (Optional, max 500 chars)',
                prefixIcon: Icon(Icons.notes_outlined),
              ),
              validator: Validators.validateBio,
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
                    onPressed: () => setState(() => _activeTab = 'profile'),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: InkWell(
                    onTap: _isSubmitting ? null : _handleSaveProfile,
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        gradient: const LinearGradient(
                          colors: [AppColors.primaryPink, AppColors.primaryPurple],
                        ),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      alignment: Alignment.center,
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Text(
                              'Save Changes',
                              style: TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResetPasswordTab(BuildContext context, bool isDark) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder,
        ),
      ),
      child: Form(
        key: _passwordFormKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Change Security Password',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Ensure your account is using a strong, unique password.',
              style: TextStyle(
                fontSize: 12,
                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
              ),
            ),
            const SizedBox(height: 20),

            // Current Password
            TextFormField(
              controller: _currentPasswordController,
              autovalidateMode: AutovalidateMode.onUserInteraction,
              obscureText: _obscureCurrent,
              inputFormatters: [LengthLimitingTextInputFormatter(100)],
              decoration: InputDecoration(
                labelText: 'Current Password',
                prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  icon: Icon(_obscureCurrent ? Icons.visibility_off : Icons.visibility),
                  onPressed: () => setState(() => _obscureCurrent = !_obscureCurrent),
                ),
              ),
              validator: (v) => (v == null || v.isEmpty) ? 'Current password is required' : null,
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 14),

            // New Password
            TextFormField(
              controller: _newPasswordController,
              autovalidateMode: AutovalidateMode.onUserInteraction,
              obscureText: _obscureNew,
              inputFormatters: [LengthLimitingTextInputFormatter(100)],
              decoration: InputDecoration(
                labelText: 'New Password',
                prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  icon: Icon(_obscureNew ? Icons.visibility_off : Icons.visibility),
                  onPressed: () => setState(() => _obscureNew = !_obscureNew),
                ),
              ),
              validator: Validators.validatePassword,
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 14),

            // Confirm New Password
            TextFormField(
              controller: _confirmPasswordController,
              autovalidateMode: AutovalidateMode.onUserInteraction,
              obscureText: _obscureConfirm,
              inputFormatters: [LengthLimitingTextInputFormatter(100)],
              decoration: InputDecoration(
                labelText: 'Confirm New Password',
                prefixIcon: const Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  icon: Icon(_obscureConfirm ? Icons.visibility_off : Icons.visibility),
                  onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                ),
              ),
              validator: (v) => Validators.validateConfirmPassword(_newPasswordController.text, v),
              onChanged: (_) => setState(() {}),
            ),
            const SizedBox(height: 24),

            // Save Password Button
            Builder(
              builder: (context) {
                final isCurrentOk = _currentPasswordController.text.isNotEmpty;
                final isNewOk = _newPasswordController.text.isNotEmpty &&
                    Validators.validatePassword(_newPasswordController.text) == null;
                final isConfirmOk = _confirmPasswordController.text.isNotEmpty &&
                    Validators.validateConfirmPassword(_newPasswordController.text, _confirmPasswordController.text) == null;
                final isPasswordFormValid = isCurrentOk && isNewOk && isConfirmOk;
                final canUpdate = isPasswordFormValid && !_isSubmitting;

                return InkWell(
                  onTap: canUpdate ? _handleChangePassword : null,
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    decoration: BoxDecoration(
                      gradient: canUpdate
                          ? const LinearGradient(
                              colors: [AppColors.primaryPink, AppColors.primaryPurple],
                            )
                          : null,
                      color: canUpdate
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
                            'Update Password',
                            style: TextStyle(
                              color: canUpdate
                                  ? Colors.white
                                  : (isDark ? Colors.white38 : Colors.grey.shade600),
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSettingsMenu(BuildContext context, bool isDark) {
    final currentTheme = ref.watch(themeModeProvider);

    return PopupMenuButton<String>(
      icon: Icon(
        Icons.more_vert,
        color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
      ),
      tooltip: 'Preferences & Settings',
      onSelected: (val) {
        if (val == 'settings') {
          AppNavigation.push(context, '/settings');
        } else if (val == 'theme_light') {
          ref.read(themeModeProvider.notifier).setThemeMode(ThemeMode.light);
        } else if (val == 'theme_dark') {
          ref.read(themeModeProvider.notifier).setThemeMode(ThemeMode.dark);
        } else if (val == 'theme_system') {
          ref.read(themeModeProvider.notifier).setThemeMode(ThemeMode.system);
        }
      },
      itemBuilder: (ctx) => [
        PopupMenuItem(
          value: 'settings',
          child: Row(
            children: [
              Icon(Icons.settings_outlined, size: 18, color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
              const SizedBox(width: 10),
              const Text('All Settings', style: TextStyle(fontSize: 13)),
            ],
          ),
        ),
        const PopupMenuDivider(),
        PopupMenuItem(
          value: 'theme_system',
          child: Row(
            children: [
              Icon(
                Icons.brightness_auto_outlined,
                size: 18,
                color: currentTheme == ThemeMode.system ? AppColors.primaryPink : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
              ),
              const SizedBox(width: 10),
              Text(
                'System Theme',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: currentTheme == ThemeMode.system ? FontWeight.bold : FontWeight.normal,
                  color: currentTheme == ThemeMode.system ? AppColors.primaryPink : null,
                ),
              ),
            ],
          ),
        ),
        PopupMenuItem(
          value: 'theme_light',
          child: Row(
            children: [
              Icon(
                Icons.light_mode_outlined,
                size: 18,
                color: currentTheme == ThemeMode.light ? AppColors.primaryPink : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
              ),
              const SizedBox(width: 10),
              Text(
                'Light Theme',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: currentTheme == ThemeMode.light ? FontWeight.bold : FontWeight.normal,
                  color: currentTheme == ThemeMode.light ? AppColors.primaryPink : null,
                ),
              ),
            ],
          ),
        ),
        PopupMenuItem(
          value: 'theme_dark',
          child: Row(
            children: [
              Icon(
                Icons.dark_mode_outlined,
                size: 18,
                color: currentTheme == ThemeMode.dark ? AppColors.primaryPink : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
              ),
              const SizedBox(width: 10),
              Text(
                'Dark Theme',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: currentTheme == ThemeMode.dark ? FontWeight.bold : FontWeight.normal,
                  color: currentTheme == ThemeMode.dark ? AppColors.primaryPink : null,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
