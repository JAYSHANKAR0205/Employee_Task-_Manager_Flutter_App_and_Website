import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/app_navigation.dart';
import '../../../core/utils/validators.dart';
import '../../../data/models/leave_models.dart';
import '../../providers/leave_provider.dart';
import '../../widgets/enterprise_bottom_nav_bar.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/enterprise_blur_dialog.dart';
import '../../widgets/enterprise_floating_action_button.dart';
import '../../widgets/status_badge.dart';

class EmployeeLeavesScreen extends ConsumerStatefulWidget {
  const EmployeeLeavesScreen({super.key});

  @override
  ConsumerState<EmployeeLeavesScreen> createState() => _EmployeeLeavesScreenState();
}

class _EmployeeLeavesScreenState extends ConsumerState<EmployeeLeavesScreen> {
  String _statusFilter = 'All';
  late final ScrollController _scrollController;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController()..addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      ref.read(paginatedEmployeeRequestsProvider.notifier).loadNextPage();
    }
  }

  void _openApplyLeaveModal() {
    final modalFormKey = GlobalKey<FormState>();
    String? selectedLeaveTypeId;
    DateTime? startDate;
    DateTime? endDate;
    final reasonController = TextEditingController();
    String? modalError;
    bool isSubmitting = false;

    EnterpriseBlurDialog.show(
      context: context,
      child: StatefulBuilder(
        builder: (dialogCtx, setModalState) {
          final isDark = Theme.of(dialogCtx).brightness == Brightness.dark;
          final balancesAsync = ref.watch(employeeBalancesProvider);

          int calculatedDays = 0;
          if (startDate != null && endDate != null) {
            final sUtc = DateTime.utc(startDate!.year, startDate!.month, startDate!.day);
            final eUtc = DateTime.utc(endDate!.year, endDate!.month, endDate!.day);
            final diff = eUtc.difference(sUtc).inDays;
            if (diff >= 0) calculatedDays = diff + 1;
          }

          final now = DateTime.now();
          final today = DateTime(now.year, now.month, now.day);

          return Dialog(
            backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            child: Container(
              width: 550,
              padding: const EdgeInsets.all(24),
              child: Form(
                key: modalFormKey,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.edit_calendar_outlined, color: AppColors.primaryPink, size: 22),
                            SizedBox(width: 10),
                            Text(
                              'Apply for Leave',
                              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                        IconButton(
                          icon: const Icon(Icons.close, size: 20),
                          onPressed: isSubmitting ? null : () => Navigator.pop(dialogCtx),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    if (modalError != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        margin: const EdgeInsets.only(bottom: 14),
                        decoration: BoxDecoration(
                          color: Colors.red.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.red.withOpacity(0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.error_outline, color: Colors.redAccent, size: 18),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                modalError!,
                                style: const TextStyle(color: Colors.redAccent, fontSize: 13),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],

                    // Leave Type Dropdown
                    balancesAsync.maybeWhen(
                      data: (balances) {
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Select Leave Type *',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                              ),
                            ),
                            const SizedBox(height: 6),
                            DropdownButtonFormField<String>(
                              value: selectedLeaveTypeId,
                              items: balances.map((b) {
                                return DropdownMenuItem<String>(
                                  value: b.leaveType?.id,
                                  child: Text('${b.leaveType?.name ?? 'Leave'} (${b.remaining} days remaining)'),
                                );
                              }).toList(),
                              onChanged: (val) => setModalState(() {
                                selectedLeaveTypeId = val;
                                modalError = null;
                              }),
                              decoration: InputDecoration(
                                filled: true,
                                fillColor: isDark ? AppColors.darkBackground : Colors.grey.shade50,
                                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                              ),
                            ),
                          ],
                        );
                      },
                      orElse: () => const SizedBox(),
                    ),
                    const SizedBox(height: 16),

                    // Start & End Date Pickers
                    Row(
                      children: [
                        Expanded(
                          child: CustomTextField(
                            label: 'Start Date *',
                            hint: startDate != null ? DateFormat('yyyy-MM-dd').format(startDate!) : 'Select Date',
                            readOnly: true,
                            onTap: () async {
                              final d = await showDatePicker(
                                context: dialogCtx,
                                initialDate: startDate ?? today,
                                firstDate: today,
                                lastDate: today.add(const Duration(days: 365)),
                              );
                              if (d != null) {
                                setModalState(() {
                                  startDate = d;
                                  modalError = null;
                                  if (endDate != null && endDate!.isBefore(startDate!)) {
                                    endDate = startDate;
                                  }
                                });
                              }
                            },
                            suffixIcon: const Icon(Icons.calendar_today_outlined, size: 18),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: CustomTextField(
                            label: 'End Date *',
                            hint: endDate != null ? DateFormat('yyyy-MM-dd').format(endDate!) : 'Select Date',
                            readOnly: true,
                            onTap: () async {
                              final minEnd = startDate ?? today;
                              final d = await showDatePicker(
                                context: dialogCtx,
                                initialDate: endDate ?? minEnd,
                                firstDate: minEnd,
                                lastDate: today.add(const Duration(days: 365)),
                              );
                              if (d != null) {
                                setModalState(() {
                                  endDate = d;
                                  modalError = null;
                                });
                              }
                            },
                            suffixIcon: const Icon(Icons.calendar_today_outlined, size: 18),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Live Days Calculated Badge
                    if (calculatedDays > 0) ...[
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: AppColors.primaryPink.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.access_time, size: 16, color: AppColors.primaryPink),
                            const SizedBox(width: 6),
                            Text(
                              'Calculated Duration: $calculatedDays Day(s)',
                              style: const TextStyle(
                                color: AppColors.primaryPink,
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Reason Input Field with counter
                    CustomTextField(
                      label: 'Reason for Leave (Words/numbers only) *',
                      hint: 'e.g. Personal work or Family function',
                      controller: reasonController,
                      maxLines: 3,
                      inputFormatters: [LengthLimitingTextInputFormatter(500)],
                      validator: Validators.validateLeaveReason,
                      onChanged: (_) => setModalState(() {
                        modalError = null;
                      }),
                    ),
                    Align(
                      alignment: Alignment.centerRight,
                      child: Text(
                        '${reasonController.text.length}/500',
                        style: const TextStyle(fontSize: 10, color: Colors.grey),
                      ),
                    ),
                    const SizedBox(height: 20),

                    Builder(
                      builder: (context) {
                        final isReasonValid = reasonController.text.trim().isNotEmpty &&
                            Validators.validateLeaveReason(reasonController.text) == null;
                        final isLeaveFormValid = selectedLeaveTypeId != null &&
                            startDate != null &&
                            endDate != null &&
                            calculatedDays > 0 &&
                            isReasonValid;

                        return CustomButton(
                          text: 'Submit Application',
                          isLoading: isSubmitting,
                          icon: Icons.send,
                          onPressed: (!isLeaveFormValid || isSubmitting)
                              ? null
                              : () async {
                              if (!modalFormKey.currentState!.validate()) return;
                              if (selectedLeaveTypeId == null) {
                                setModalState(() => modalError = 'Please select a leave type.');
                                return;
                              }
                              if (startDate == null || endDate == null) {
                                setModalState(() => modalError = 'Please select both start and end dates.');
                                return;
                              }
                              if (calculatedDays <= 0) {
                                setModalState(() => modalError = 'End date must be on or after start date.');
                                return;
                              }

                              final reasonText = reasonController.text.trim();
                              final reasonErr = Validators.validateLeaveReason(reasonText);
                              if (reasonErr != null) {
                                setModalState(() => modalError = reasonErr);
                                return;
                              }

                              setModalState(() {
                                isSubmitting = true;
                                modalError = null;
                              });

                              final startStr = DateFormat('yyyy-MM-dd').format(startDate!);
                              final endStr = DateFormat('yyyy-MM-dd').format(endDate!);

                              final success = await ref.read(leaveActionsProvider.notifier).applyLeave(
                                    leaveTypeId: selectedLeaveTypeId!,
                                    startDate: startStr,
                                    endDate: endStr,
                                    reason: reasonText,
                                  );

                              if (dialogCtx.mounted) {
                                if (success) {
                                  Navigator.pop(dialogCtx);
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text('Leave request submitted successfully! Status is Pending.'),
                                        backgroundColor: Colors.green,
                                      ),
                                    );
                                  }
                                } else {
                                  final err = ref.read(leaveActionsProvider).error?.toString() ?? 'Failed to apply for leave';
                                  setModalState(() {
                                    isSubmitting = false;
                                    modalError = err;
                                  });
                                }
                              }
                            },
                        );
                      },
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

  @override
  Widget build(BuildContext context) {
    final balancesAsync = ref.watch(employeeBalancesProvider);
    final requestsState = ref.watch(paginatedEmployeeRequestsProvider);
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
            'My Leaves',
            style: TextStyle(
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        floatingActionButton: EnterpriseFloatingActionButton(
          onPressed: _openApplyLeaveModal,
          tooltip: 'Apply Leave',
        ),
        bottomNavigationBar: const EnterpriseBottomNavBar(currentRoute: '/leaves'),
        body: RefreshIndicator(
          onRefresh: () async {
            ref.invalidate(employeeBalancesProvider);
            await ref.read(paginatedEmployeeRequestsProvider.notifier).refresh();
          },
          child: SingleChildScrollView(
            controller: _scrollController,
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(18.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // 1. LEAVE BALANCES SECTION
                Text(
                  'Leave Balances',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                  ),
                ),
                const SizedBox(height: 12),
                balancesAsync.when(
                  data: (balances) {
                    if (balances.isEmpty) {
                      return const Text('No leave balances available.');
                    }
                    return SizedBox(
                      height: 120,
                      child: ListView.separated(
                        scrollDirection: Axis.horizontal,
                        itemCount: balances.length,
                        separatorBuilder: (_, __) => const SizedBox(width: 12),
                        itemBuilder: (context, i) {
                          final b = balances[i];
                          return _buildBalanceCard(context, b);
                        },
                      ),
                    );
                  },
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (err, _) => Text('Error loading balances: $err', style: const TextStyle(color: Colors.red)),
                ),
                const SizedBox(height: 24),

              // LEAVE REQUEST HISTORY TABLE / LIST
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'My Request History',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                    ),
                  ),
                  DropdownButton<String>(
                    value: _statusFilter,
                    underline: const SizedBox(),
                    items: ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map((s) {
                      return DropdownMenuItem(value: s, child: Text(s));
                    }).toList(),
                    onChanged: (v) {
                      if (v != null) {
                        setState(() => _statusFilter = v);
                        ref.read(paginatedEmployeeRequestsProvider.notifier).setFilter(v);
                      }
                    },
                  ),
                ],
              ),
              const SizedBox(height: 12),

              Builder(
                builder: (context) {
                  if (requestsState.isLoadingFirstPage) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (requestsState.error != null && requestsState.items.isEmpty) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      child: Center(
                        child: Column(
                          children: [
                            Text('Error loading requests: ${requestsState.error}', style: const TextStyle(color: Colors.red)),
                            const SizedBox(height: 8),
                            ElevatedButton(
                              onPressed: () => ref.read(paginatedEmployeeRequestsProvider.notifier).loadFirstPage(),
                              child: const Text('Retry'),
                            ),
                          ],
                        ),
                      ),
                    );
                  }
                  if (requestsState.items.isEmpty) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 20),
                      child: Center(child: Text('No leave requests found.')),
                    );
                  }

                  final itemCount = requestsState.items.length + (requestsState.isLoadingMore ? 1 : 0);
                  return ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: itemCount,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, i) {
                      if (i == requestsState.items.length) {
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
                      final req = requestsState.items[i];
                      return _buildRequestTile(context, req);
                    },
                  );
                },
              ),
            ],
          ),
        ),
      ),
    ),
  );
}

  Widget _buildBalanceCard(BuildContext context, EmployeeLeaveBalanceModel b) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      width: 170,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Text(
            b.leaveType?.name ?? 'Leave',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Remaining', style: TextStyle(fontSize: 10, color: Colors.grey)),
                  Text(
                    '${b.remaining}',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: AppColors.primaryPink),
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text('Used / Total', style: TextStyle(fontSize: 10, color: Colors.grey)),
                  Text(
                    '${b.used} / ${b.totalAllocated}',
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildRequestTile(BuildContext context, LeaveRequestModel req) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final startStr = DateFormat('MMM dd, yyyy').format(req.startDate);
    final endStr = DateFormat('MMM dd, yyyy').format(req.endDate);

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
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                req.leaveType?.name ?? 'Leave Application',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                ),
              ),
              StatusBadge(status: req.status),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.calendar_today_outlined, size: 14, color: Colors.grey),
              const SizedBox(width: 6),
              Text(
                '$startStr - $endStr (${req.numberOfDays} Days)',
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            'Reason: "${req.reason}"',
            style: TextStyle(
              fontSize: 13,
              fontStyle: FontStyle.italic,
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
            ),
          ),
          if (req.status == 'Rejected' && req.rejectionReason != null) ...[
            const SizedBox(height: 6),
            Text(
              'Rejection Reason: ${req.rejectionReason}',
              style: const TextStyle(fontSize: 12, color: Colors.redAccent, fontWeight: FontWeight.bold),
            ),
          ],
          if (req.status == 'Pending') ...[
            const SizedBox(height: 12),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                icon: const Icon(Icons.cancel_outlined, size: 16, color: Colors.redAccent),
                label: const Text('Cancel Request', style: TextStyle(color: Colors.redAccent, fontSize: 13)),
                onPressed: () async {
                  final confirm = await showDialog<bool>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: const Text('Cancel Request'),
                      content: const Text('Are you sure you want to cancel this leave application?'),
                      actions: [
                        TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('No')),
                        TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Yes, Cancel')),
                      ],
                    ),
                  );
                  if (confirm == true) {
                    await ref.read(leaveActionsProvider.notifier).cancelLeave(req.id);
                  }
                },
              ),
            ),
          ],
        ],
      ),
    );
  }
}
