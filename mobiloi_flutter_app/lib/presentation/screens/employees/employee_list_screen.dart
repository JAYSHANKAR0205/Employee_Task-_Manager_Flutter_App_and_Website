import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/app_navigation.dart';
import '../../../core/utils/validators.dart';
import '../../../data/models/user_model.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/enterprise_bottom_nav_bar.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/enterprise_blur_dialog.dart';
import '../../widgets/enterprise_floating_action_button.dart';
import '../../widgets/enterprise_user_avatar.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/view_action_button.dart';

class EmployeeListScreen extends ConsumerStatefulWidget {
  const EmployeeListScreen({super.key});

  @override
  ConsumerState<EmployeeListScreen> createState() => _EmployeeListScreenState();
}

class _EmployeeListScreenState extends ConsumerState<EmployeeListScreen> {
  String _statusFilter = 'All';
  String _roleFilter = 'All';
  late final ScrollController _scrollController;
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController()..addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      ref.read(paginatedUsersProvider.notifier).loadNextPage();
    }
  }

  void _onSearchChanged(String query) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      if (mounted) {
        ref.read(paginatedUsersProvider.notifier).setFilters(search: query);
      }
    });
  }

  void _openCreateEmployeeModal() {
    final formKey = GlobalKey<FormState>();
    final fnCtrl = TextEditingController();
    final lnCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    bool isSubmitting = false;
    String? modalError;

    EnterpriseBlurDialog.show(
      context: context,
      child: StatefulBuilder(
        builder: (dialogCtx, setModalState) {
          final isDark = Theme.of(dialogCtx).brightness == Brightness.dark;
          final isFnValid = fnCtrl.text.trim().isNotEmpty && Validators.validateFirstName(fnCtrl.text.trim()) == null;
          final isLnValid = lnCtrl.text.trim().isNotEmpty && Validators.validateLastName(lnCtrl.text.trim()) == null;
          final isEmailValid = emailCtrl.text.trim().isNotEmpty && Validators.validateEmail(emailCtrl.text.trim()) == null;
          final isCreateValid = isFnValid && isLnValid && isEmailValid;

          return Dialog(
            backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: Container(
              width: 500,
              padding: const EdgeInsets.all(24),
              child: Form(
                key: formKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Create Employee Account',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 16,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, size: 18),
                          onPressed: () => Navigator.pop(dialogCtx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 15),
                    if (modalError != null) ...[
                      Container(
                        padding: const EdgeInsets.all(9),
                        margin: const EdgeInsets.only(bottom: 12),
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.red.shade300),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: Colors.red, size: 18),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                modalError!,
                                style: const TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    CustomTextField(
                      label: 'First Name *',
                      hint: 'e.g. John',
                      controller: fnCtrl,
                      validator: Validators.validateFirstName,
                      inputFormatters: [LengthLimitingTextInputFormatter(50)],
                      onChanged: (_) {
                        setModalState(() {
                          if (modalError != null) modalError = null;
                        });
                      },
                    ),
                    const SizedBox(height: 10),
                    CustomTextField(
                      label: 'Last Name *',
                      hint: 'e.g. Doe',
                      controller: lnCtrl,
                      validator: Validators.validateLastName,
                      inputFormatters: [LengthLimitingTextInputFormatter(50)],
                      onChanged: (_) {
                        setModalState(() {
                          if (modalError != null) modalError = null;
                        });
                      },
                    ),
                    const SizedBox(height: 10),
                    CustomTextField(
                      label: 'Email Address *',
                      hint: 'john.doe@company.com',
                      controller: emailCtrl,
                      keyboardType: TextInputType.emailAddress,
                      validator: Validators.validateEmail,
                      inputFormatters: [LengthLimitingTextInputFormatter(254)],
                      onChanged: (_) {
                        setModalState(() {
                          if (modalError != null) modalError = null;
                        });
                      },
                    ),
                    const SizedBox(height: 18),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: isSubmitting ? null : () => Navigator.pop(dialogCtx),
                          child: const Text('Cancel'),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.primaryPink,
                            disabledBackgroundColor: isDark ? Colors.white10 : Colors.grey.shade300,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                          ),
                          onPressed: (!isCreateValid || isSubmitting)
                              ? null
                              : () async {
                                  if (!formKey.currentState!.validate()) return;
                                  setModalState(() {
                                    isSubmitting = true;
                                    modalError = null;
                                  });
                                  final ok = await ref.read(authProvider.notifier).adminCreateUser(
                                        firstName: fnCtrl.text.trim(),
                                        lastName: lnCtrl.text.trim(),
                                        email: emailCtrl.text.trim(),
                                      );
                                  if (dialogCtx.mounted) {
                                    if (ok) {
                                      Navigator.pop(dialogCtx);
                                      if (mounted) {
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          SnackBar(content: Text('Employee credentials sent to ${emailCtrl.text.trim()}')),
                                        );
                                      }
                                    } else {
                                      final err = ref.read(authProvider).errorMessage ?? 'Failed to create employee';
                                      setModalState(() {
                                        isSubmitting = false;
                                        modalError = err;
                                      });
                                    }
                                  }
                                },
                          child: isSubmitting
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                )
                              : Text(
                                  'Create Employee',
                                  style: TextStyle(
                                    color: (!isCreateValid || isSubmitting)
                                        ? (isDark ? Colors.white38 : Colors.grey.shade600)
                                        : Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  void _showUserDetailsModal(UserModel user) {
    EnterpriseBlurDialog.show(
      context: context,
      child: EmployeeDetailsDialog(user: user),
    );
  }

  void _confirmDeleteUser(UserModel user) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Employee'),
        content: Text('Are you sure you want to delete account for "${user.fullName}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () async {
              Navigator.pop(ctx);
              await ref.read(authProvider.notifier).deleteUser(user.id);
            },
            child: const Text('Delete', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final usersState = ref.watch(paginatedUsersProvider);
    final authState = ref.watch(authProvider);
    final isAdmin = authState.user?.isAdmin ?? false;
    final isDark = Theme.of(context).brightness == Brightness.dark;

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
            'User Management',
            style: TextStyle(
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        floatingActionButton: isAdmin
            ? EnterpriseFloatingActionButton(
                onPressed: () => _openCreateEmployeeModal(),
                tooltip: 'Add User',
              )
            : null,
        bottomNavigationBar: const EnterpriseBottomNavBar(currentRoute: '/employees'),
        body: RefreshIndicator(
          onRefresh: () async => ref.read(paginatedUsersProvider.notifier).refresh(),
          child: Column(
            children: [
              // Toolbar Search & Filter
              Container(
                padding: const EdgeInsets.all(16),
                color: isDark ? AppColors.darkSurface : Colors.white,
                child: Column(
                  children: [
                    TextField(
                      onChanged: _onSearchChanged,
                      decoration: InputDecoration(
                        hintText: 'Search members by name, email or qualification...',
                        prefixIcon: const Icon(Icons.search, size: 20),
                        filled: true,
                        fillColor: isDark ? AppColors.darkBackground : Colors.grey.shade100,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: _statusFilter,
                            decoration: const InputDecoration(
                              labelText: 'Status',
                              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            ),
                            items: ['All', 'Active', 'Pending', 'Blocked'].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                            onChanged: (v) {
                              if (v != null) {
                                setState(() => _statusFilter = v);
                                ref.read(paginatedUsersProvider.notifier).setFilters(status: v);
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: _roleFilter,
                            decoration: const InputDecoration(
                              labelText: 'Role',
                              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            ),
                            items: ['All', 'Admin', 'Employee'].map((r) => DropdownMenuItem(value: r, child: Text(r))).toList(),
                            onChanged: (v) {
                              if (v != null) {
                                setState(() => _roleFilter = v);
                                ref.read(paginatedUsersProvider.notifier).setFilters(role: v);
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              Expanded(
                child: Builder(
                  builder: (context) {
                    if (usersState.isLoadingFirstPage) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    if (usersState.error != null && usersState.items.isEmpty) {
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text('Error loading employees: ${usersState.error}', style: const TextStyle(color: Colors.redAccent)),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              onPressed: () => ref.read(paginatedUsersProvider.notifier).loadFirstPage(),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      );
                    }
                    if (usersState.items.isEmpty) {
                      return const Center(child: Text('No members found matching filter.'));
                    }

                    final itemCount = usersState.items.length + (usersState.isLoadingMore ? 1 : 0);

                    return ListView.separated(
                      controller: _scrollController,
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                      itemCount: itemCount,
                      separatorBuilder: (context, index) => const SizedBox(height: 12),
                      itemBuilder: (context, i) {
                        if (i == usersState.items.length) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(
                              child: SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  valueColor: AlwaysStoppedAnimation<Color>(AppColors.primaryPink),
                                ),
                              ),
                            ),
                          );
                        }

                        final u = usersState.items[i];

                        return Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.darkSurface : Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder,
                            ),
                          ),
                          child: Column(
                            children: [
                              Row(
                                children: [
                                  EnterpriseUserAvatar.fromUser(
                                    u,
                                    radius: 20,
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          u.fullName.isNotEmpty ? u.fullName : u.email,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 15,
                                            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                                          ),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          u.email,
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  StatusBadge(status: u.role),
                                  const SizedBox(width: 6),
                                  StatusBadge(status: u.status),
                                ],
                              ),
                              const Divider(height: 20),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  ViewActionButton(
                                    onPressed: () => _showUserDetailsModal(u),
                                    tooltip: 'View user details',
                                  ),
                                  if (isAdmin && !u.isAdmin) ...[
                                    PopupMenuButton<String>(
                                      icon: const Icon(Icons.more_vert, size: 20, color: Colors.grey),
                                      tooltip: 'More actions',
                                      onSelected: (val) async {
                                        if (val == 'block') {
                                          await ref.read(authProvider.notifier).toggleBlockUser(u.id);
                                        } else if (val == 'delete') {
                                          _confirmDeleteUser(u);
                                        }
                                      },
                                      itemBuilder: (ctx) => [
                                        PopupMenuItem(
                                          value: 'block',
                                          child: Row(
                                            children: [
                                              Icon(
                                                u.isBlocked ? Icons.lock_open : Icons.block,
                                                size: 16,
                                                color: u.isBlocked ? Colors.green : Colors.amber.shade800,
                                              ),
                                              const SizedBox(width: 8),
                                              Text(
                                                u.isBlocked ? 'Unblock User' : 'Block User',
                                                style: TextStyle(
                                                  fontSize: 13,
                                                  color: u.isBlocked ? Colors.green : Colors.amber.shade800,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        const PopupMenuItem(
                                          value: 'delete',
                                          child: Row(
                                            children: [
                                              Icon(Icons.delete_outline, size: 16, color: Colors.redAccent),
                                              SizedBox(width: 8),
                                              Text('Delete User', style: TextStyle(fontSize: 13, color: Colors.redAccent)),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ],
                              ),
                            ],
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class EmployeeDetailsDialog extends StatefulWidget {
  final UserModel user;

  const EmployeeDetailsDialog({super.key, required this.user});

  @override
  State<EmployeeDetailsDialog> createState() => _EmployeeDetailsDialogState();
}

class _EmployeeDetailsDialogState extends State<EmployeeDetailsDialog> {
  bool _isBioExpanded = false;
  final _bioScrollController = ScrollController();

  @override
  void dispose() {
    _bioScrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = widget.user;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Format dateOfBirth: ISO string -> 'dd MMM yyyy'
    String formattedDob = 'Not provided';
    if (user.dateOfBirth != null && user.dateOfBirth!.trim().isNotEmpty) {
      try {
        formattedDob = DateFormat('dd MMM yyyy').format(DateTime.parse(user.dateOfBirth!.trim()));
      } catch (_) {
        formattedDob = user.dateOfBirth!.trim();
      }
    }

    // Format joined date from createdAt
    String joinedDate = 'Not provided';
    if (user.createdAt != null && user.createdAt!.trim().isNotEmpty) {
      try {
        joinedDate = DateFormat('dd MMM yyyy').format(DateTime.parse(user.createdAt!.trim()));
      } catch (_) {
        joinedDate = user.createdAt!.trim();
      }
    }

    return Dialog(
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      clipBehavior: Clip.antiAlias,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          minWidth: 280,
          maxWidth: 560,
          maxHeight: MediaQuery.of(context).size.height * 0.88,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // ── Pinned Header ──
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 12, 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  EnterpriseUserAvatar.fromUser(
                    user,
                    radius: 26,
                    fontSize: 20,
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user.fullName.trim().isNotEmpty ? user.fullName.trim() : 'Employee',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 17,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                          softWrap: true,
                        ),
                        const SizedBox(height: 3),
                        Tooltip(
                          message: user.email,
                          child: Text(
                            user.email.trim().isNotEmpty ? user.email.trim() : 'Not provided',
                            style: TextStyle(
                              fontSize: 12,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            softWrap: true,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 6),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    tooltip: 'Close',
                    padding: const EdgeInsets.all(4),
                    constraints: const BoxConstraints(minWidth: 36, minHeight: 36),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Divider(
                height: 1,
                color: isDark ? AppColors.darkCardBorder : Colors.grey.shade200,
              ),
            ),

            // ── Scrollable Body ──
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 10),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Role, Status & Verification Badges (Responsive Wrap)
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        StatusBadge(status: user.role),
                        StatusBadge(status: user.status),
                        if (user.isBlocked)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.red.withOpacity(0.12),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.block, size: 12, color: Colors.redAccent),
                                SizedBox(width: 4),
                                Text(
                                  'Blocked',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.redAccent,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: user.isVerified
                                ? Colors.green.withOpacity(0.12)
                                : Colors.orange.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                user.isVerified ? Icons.check_circle : Icons.pending_outlined,
                                size: 12,
                                color: user.isVerified ? Colors.green : Colors.orange,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                user.isVerified ? 'Verified' : 'Unverified',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: user.isVerified ? Colors.green : Colors.orange,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 18),

                    // Section: Personal & Contact Information
                    const Text(
                      'PERSONAL & CONTACT INFORMATION',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 10),

                    // Responsive Info Tiles (Adaptive 1-column on narrow screens, 2-column on wider screens)
                    LayoutBuilder(
                      builder: (context, constraints) {
                        final isCompact = constraints.maxWidth < 400;

                        final phoneTile = _buildInfoTile(
                          icon: Icons.phone_outlined,
                          label: 'PHONE',
                          value: (user.phoneNumber != null && user.phoneNumber!.trim().isNotEmpty)
                              ? user.phoneNumber!.trim()
                              : 'Not provided',
                          iconColor: Colors.blueAccent,
                          isDark: isDark,
                        );

                        final dobTile = _buildInfoTile(
                          icon: Icons.calendar_today_outlined,
                          label: 'DATE OF BIRTH',
                          value: formattedDob,
                          iconColor: Colors.amber.shade800,
                          isDark: isDark,
                        );

                        final genderTile = _buildInfoTile(
                          icon: Icons.wc_outlined,
                          label: 'GENDER',
                          value: (user.gender != null && user.gender!.trim().isNotEmpty)
                              ? user.gender!.trim()[0].toUpperCase() + user.gender!.trim().substring(1)
                              : 'Not provided',
                          iconColor: Colors.purpleAccent,
                          isDark: isDark,
                        );

                        final qualificationTile = _buildInfoTile(
                          icon: Icons.school_outlined,
                          label: 'QUALIFICATION',
                          value: (user.qualification != null && user.qualification!.trim().isNotEmpty)
                              ? user.qualification!.trim()
                              : 'Not provided',
                          iconColor: Colors.teal,
                          isDark: isDark,
                        );

                        final joinedDateTile = _buildInfoTile(
                          icon: Icons.badge_outlined,
                          label: 'JOINED DATE',
                          value: joinedDate,
                          iconColor: AppColors.primaryPink,
                          isDark: isDark,
                        );

                        if (isCompact) {
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              phoneTile,
                              const SizedBox(height: 8),
                              dobTile,
                              const SizedBox(height: 8),
                              genderTile,
                              const SizedBox(height: 8),
                              qualificationTile,
                              const SizedBox(height: 8),
                              joinedDateTile,
                            ],
                          );
                        } else {
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(child: phoneTile),
                                  const SizedBox(width: 10),
                                  Expanded(child: dobTile),
                                ],
                              ),
                              const SizedBox(height: 10),
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(child: genderTile),
                                  const SizedBox(width: 10),
                                  Expanded(child: qualificationTile),
                                ],
                              ),
                              const SizedBox(height: 10),
                              joinedDateTile,
                            ],
                          );
                        }
                      },
                    ),
                    const SizedBox(height: 18),

                    // Section: Biography & Summary
                    const Text(
                      'BIOGRAPHY & SUMMARY',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 8),

                    _buildBiographySection(user.bio, isDark),
                  ],
                ),
              ),
            ),

            // ── Pinned Footer ──
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: Align(
                alignment: Alignment.centerRight,
                child: TextButton(
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Close', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoTile({
    required IconData icon,
    required String label,
    required String value,
    required Color iconColor,
    required bool isDark,
  }) {
    final isNotProvided = value.trim().isEmpty || value.trim().toLowerCase() == 'not provided';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkBackground : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: isDark ? AppColors.darkCardBorder : Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: iconColor),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  style: const TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey,
                    letterSpacing: 0.3,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 5),
          Text(
            isNotProvided ? 'Not provided' : value.trim(),
            style: TextStyle(
              fontSize: 12,
              height: 1.3,
              fontWeight: isNotProvided ? FontWeight.normal : FontWeight.w600,
              fontStyle: isNotProvided ? FontStyle.italic : FontStyle.normal,
              color: isNotProvided
                  ? Colors.grey
                  : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
            ),
            softWrap: true,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }

  Widget _buildBiographySection(String? bio, bool isDark) {
    final cleanBio = bio?.trim() ?? '';
    final hasBio = cleanBio.isNotEmpty;
    final isLongBio = cleanBio.length > 180;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkBackground : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isDark ? AppColors.darkCardBorder : Colors.grey.shade200,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (!hasBio)
            const Text(
              'Not provided',
              style: TextStyle(
                fontSize: 13,
                height: 1.4,
                fontStyle: FontStyle.italic,
                color: Colors.grey,
              ),
            )
          else ...[
            ConstrainedBox(
              constraints: BoxConstraints(
                maxHeight: _isBioExpanded ? 240 : 80,
              ),
              child: Scrollbar(
                controller: _bioScrollController,
                thumbVisibility: _isBioExpanded && isLongBio,
                child: SingleChildScrollView(
                  controller: _bioScrollController,
                  physics: _isBioExpanded
                      ? const ClampingScrollPhysics()
                      : const NeverScrollableScrollPhysics(),
                  child: Text(
                    cleanBio,
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.4,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextPrimary,
                    ),
                    softWrap: true,
                    maxLines: _isBioExpanded ? null : 4,
                    overflow: _isBioExpanded ? TextOverflow.clip : TextOverflow.ellipsis,
                  ),
                ),
              ),
            ),
            if (isLongBio) ...[
              const SizedBox(height: 6),
              GestureDetector(
                onTap: () {
                  setState(() {
                    _isBioExpanded = !_isBioExpanded;
                  });
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        _isBioExpanded ? 'View Less' : 'View More',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryPink,
                        ),
                      ),
                      const SizedBox(width: 2),
                      Icon(
                        _isBioExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                        size: 16,
                        color: AppColors.primaryPink,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ],
      ),
    );
  }
}
