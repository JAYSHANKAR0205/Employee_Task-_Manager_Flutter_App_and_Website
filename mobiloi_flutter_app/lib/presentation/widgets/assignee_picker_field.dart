import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../data/models/user_model.dart';
import '../providers/auth_provider.dart';
import 'enterprise_blur_dialog.dart';
import 'enterprise_user_avatar.dart';

class AssigneePickerField extends ConsumerWidget {
  final String? selectedUserId;
  final ValueChanged<UserModel> onSelected;
  final String? errorMessage;
  final bool isRequired;
  final bool enabled;

  const AssigneePickerField({
    super.key,
    required this.selectedUserId,
    required this.onSelected,
    this.errorMessage,
    this.isRequired = true,
    this.enabled = true,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final usersAsync = ref.watch(allUsersProvider);
    final currentUser = ref.watch(authProvider).user;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Field Label
        Row(
          children: [
            Text(
              'Assignee',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
              ),
            ),
            if (isRequired)
              const Text(
                ' *',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.bold,
                  color: Colors.red,
                ),
              ),
          ],
        ),
        const SizedBox(height: 6),

        // Field Content
        usersAsync.when(
          loading: () => Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkBackground : Colors.grey.shade50,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(
                color: isDark ? AppColors.darkCardBorder : Colors.grey.shade300,
              ),
            ),
            child: const Row(
              children: [
                SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
                SizedBox(width: 10),
                Text(
                  'Loading employees...',
                  style: TextStyle(color: Colors.grey, fontSize: 13),
                ),
              ],
            ),
          ),
          error: (err, _) => Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.red.withOpacity(0.06),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.red.shade200),
            ),
            child: Row(
              children: [
                const Icon(Icons.error_outline, color: Colors.red, size: 18),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'Failed to load employees',
                    style: TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.w500),
                  ),
                ),
                TextButton(
                  onPressed: () => ref.invalidate(allUsersProvider),
                  style: TextButton.styleFrom(
                    visualDensity: VisualDensity.compact,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                  child: const Text('Retry', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
          data: (users) {
            // Requirement: Only active, non-blocked, verified Employees.
            // Admin must NOT be able to assign a task to himself.
            // Admin users must NOT appear in the assignee list.
            // Blocked/inactive employees must NOT appear.
            final activeEmployees = users.where((u) {
              if (u.role != 'Employee') return false;
              if (currentUser != null && u.id == currentUser.id) return false;
              if (u.isBlocked) return false;
              if (!u.isVerified || u.isProfileComplete == false) return false;
              return true;
            }).toList();

            // Check if currently selected employee is among active employees
            UserModel? selectedUser = activeEmployees.where((u) => u.id == selectedUserId).firstOrNull;

            // Fallback: If editing a task previously assigned to a user now blocked or unlisted
            final fallbackUser = selectedUser == null && selectedUserId != null
                ? users.where((u) => u.id == selectedUserId).firstOrNull
                : null;

            final hasError = errorMessage != null;

            if (activeEmployees.isEmpty && fallbackUser == null) {
              return Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.amber.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.amber.shade300),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.warning_amber_rounded, color: Colors.amber, size: 18),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'No active employees available to assign.',
                        style: TextStyle(color: Colors.amber, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              );
            }

            final displayedUser = selectedUser ?? fallbackUser;

            return InkWell(
              onTap: enabled
                  ? () async {
                      final picked = await EnterpriseBlurDialog.show<UserModel>(
                        context: context,
                        barrierDismissible: true,
                        child: _AssigneePickerDialog(
                          employees: activeEmployees,
                          selectedId: selectedUserId,
                        ),
                      );
                      if (picked != null) {
                        onSelected(picked);
                      }
                    }
                  : null,
              borderRadius: BorderRadius.circular(12),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkBackground : Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: hasError
                        ? Colors.red
                        : (isDark ? AppColors.darkCardBorder : Colors.grey.shade300),
                    width: hasError ? 1.5 : 1.0,
                  ),
                ),
                child: Row(
                  children: [
                    if (displayedUser != null) ...[
                      EnterpriseUserAvatar.fromUser(
                        displayedUser,
                        radius: 14,
                        fontSize: 12,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Row(
                              children: [
                                Flexible(
                                  child: Text(
                                    displayedUser.fullName.isNotEmpty
                                        ? displayedUser.fullName
                                        : displayedUser.email,
                                    style: TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      color: isDark
                                          ? AppColors.darkTextPrimary
                                          : AppColors.lightTextPrimary,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                if (displayedUser.isBlocked) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                    decoration: BoxDecoration(
                                      color: Colors.red.withOpacity(0.1),
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text(
                                      'Blocked',
                                      style: TextStyle(color: Colors.red, fontSize: 10, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                            if (displayedUser.fullName.isNotEmpty)
                              Text(
                                displayedUser.email,
                                style: const TextStyle(fontSize: 11, color: Colors.grey),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                          ],
                        ),
                      ),
                    ] else ...[
                      Icon(Icons.person_outline, size: 20, color: Colors.grey.shade400),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Select employee',
                          style: TextStyle(
                            fontSize: 13,
                            color: Colors.grey.shade500,
                          ),
                        ),
                      ),
                    ],
                    Icon(Icons.arrow_drop_down, color: Colors.grey.shade600),
                  ],
                ),
              ),
            );
          },
        ),

        // Error message text
        if (errorMessage != null)
          Padding(
            padding: const EdgeInsets.only(top: 4, left: 4),
            child: Text(
              errorMessage!,
              style: const TextStyle(color: Colors.red, fontSize: 11, fontWeight: FontWeight.w500),
            ),
          ),
      ],
    );
  }
}

class _AssigneePickerDialog extends StatefulWidget {
  final List<UserModel> employees;
  final String? selectedId;

  const _AssigneePickerDialog({
    required this.employees,
    required this.selectedId,
  });

  @override
  State<_AssigneePickerDialog> createState() => _AssigneePickerDialogState();
}

class _AssigneePickerDialogState extends State<_AssigneePickerDialog> {
  final TextEditingController _searchCtrl = TextEditingController();
  late List<UserModel> _filtered;

  @override
  void initState() {
    super.initState();
    _filtered = List.of(widget.employees);
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  void _onSearchChanged(String query) {
    final q = query.toLowerCase().trim();
    setState(() {
      if (q.isEmpty) {
        _filtered = List.of(widget.employees);
      } else {
        _filtered = widget.employees.where((u) {
          final first = u.firstName.toLowerCase();
          final last = u.lastName.toLowerCase();
          final full = u.fullName.toLowerCase();
          final email = u.email.toLowerCase();
          return first.contains(q) ||
              last.contains(q) ||
              full.contains(q) ||
              email.contains(q);
        }).toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final size = MediaQuery.of(context).size;

    return Dialog(
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: 460,
          maxHeight: (size.height * 0.75).clamp(320.0, 520.0),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Modal Header
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 12, 12),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Select Assignee',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '${widget.employees.length} active employee${widget.employees.length == 1 ? '' : 's'} available',
                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(height: 1),

            // Search Bar
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
              child: TextField(
                controller: _searchCtrl,
                onChanged: _onSearchChanged,
                autofocus: false,
                decoration: InputDecoration(
                  hintText: 'Search by name or email...',
                  hintStyle: TextStyle(fontSize: 13, color: Colors.grey.shade400),
                  prefixIcon: const Icon(Icons.search, size: 20),
                  suffixIcon: _searchCtrl.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(Icons.clear, size: 18),
                          onPressed: () {
                            _searchCtrl.clear();
                            _onSearchChanged('');
                          },
                        )
                      : null,
                  filled: true,
                  fillColor: isDark ? AppColors.darkBackground : Colors.grey.shade100,
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                    borderSide: BorderSide.none,
                  ),
                ),
              ),
            ),

            // Employee List
            Flexible(
              child: _filtered.isEmpty
                  ? Center(
                      child: Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.person_search_outlined, size: 40, color: Colors.grey.shade400),
                            const SizedBox(height: 10),
                            Text(
                              _searchCtrl.text.isNotEmpty
                                  ? 'No matching employees found'
                                  : 'No assignable employees available',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                              ),
                            ),
                            if (_searchCtrl.text.isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(
                                'No employee matches "${_searchCtrl.text}"',
                                style: const TextStyle(fontSize: 12, color: Colors.grey),
                              ),
                            ],
                          ],
                        ),
                      ),
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      itemCount: _filtered.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (ctx, index) {
                        final employee = _filtered[index];
                        final isSelected = employee.id == widget.selectedId;

                        return InkWell(
                          onTap: () => Navigator.pop(context, employee),
                          borderRadius: BorderRadius.circular(10),
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: isSelected
                                  ? AppColors.primaryPink.withOpacity(0.08)
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Row(
                              children: [
                                EnterpriseUserAvatar.fromUser(
                                  employee,
                                  radius: 18,
                                  fontSize: 14,
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        employee.fullName.isNotEmpty
                                            ? employee.fullName
                                            : employee.email,
                                        style: TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.bold,
                                          color: isDark
                                              ? AppColors.darkTextPrimary
                                              : AppColors.lightTextPrimary,
                                        ),
                                        maxLines: 1,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                      if (employee.fullName.isNotEmpty) ...[
                                        const SizedBox(height: 2),
                                        Text(
                                          employee.email,
                                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                                          maxLines: 1,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                if (isSelected)
                                  const Icon(
                                    Icons.check_circle,
                                    color: AppColors.primaryPink,
                                    size: 20,
                                  )
                                else
                                  const SizedBox(width: 20),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}
