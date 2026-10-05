import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/app_navigation.dart';
import '../../../data/models/leave_models.dart';
import '../../providers/leave_provider.dart';
import '../../widgets/enterprise_bottom_nav_bar.dart';
import '../../widgets/rejection_dialog.dart';
import '../../widgets/status_badge.dart';

class AdminLeavesScreen extends ConsumerStatefulWidget {
  const AdminLeavesScreen({super.key});

  @override
  ConsumerState<AdminLeavesScreen> createState() => _AdminLeavesScreenState();
}

class _AdminLeavesScreenState extends ConsumerState<AdminLeavesScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  late final ScrollController _allRequestsScrollController;
  String _allRequestsStatusFilter = 'All';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _allRequestsScrollController = ScrollController()..addListener(_onAllRequestsScroll);
  }

  @override
  void dispose() {
    _tabController.dispose();
    _allRequestsScrollController.removeListener(_onAllRequestsScroll);
    _allRequestsScrollController.dispose();
    super.dispose();
  }

  void _onAllRequestsScroll() {
    if (_allRequestsScrollController.position.pixels >= _allRequestsScrollController.position.maxScrollExtent - 200) {
      ref.read(paginatedAdminRequestsProvider.notifier).loadNextPage();
    }
  }

  @override
  Widget build(BuildContext context) {
    final pendingAsync = ref.watch(adminPendingRequestsProvider);
    final allRequestsState = ref.watch(paginatedAdminRequestsProvider);
    final balancesAsync = ref.watch(adminBalancesProvider);
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
            'Leave Portal (Admin)',
            style: TextStyle(
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
          bottom: TabBar(
            controller: _tabController,
            indicatorColor: AppColors.primaryPink,
            labelColor: AppColors.primaryPink,
            unselectedLabelColor: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
            tabs: const [
              Tab(text: 'Pending Queue'),
              Tab(text: 'All Requests'),
              Tab(text: 'Employee Balances'),
            ],
          ),
        ),
        bottomNavigationBar: const EnterpriseBottomNavBar(currentRoute: '/admin-leaves'),
        body: TabBarView(
          controller: _tabController,
          children: [
            // TAB 1: PENDING APPROVALS QUEUE
            RefreshIndicator(
              onRefresh: () async => ref.invalidate(adminPendingRequestsProvider),
              child: pendingAsync.when(
                data: (requests) {
                  if (requests.isEmpty) {
                    return const Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.check_circle_outline, color: Colors.green, size: 48),
                          SizedBox(height: 12),
                          Text('No pending leave requests!', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        ],
                      ),
                    );
                  }
                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: requests.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (ctx, i) => _buildPendingTile(ctx, requests[i]),
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => Center(child: Text('Error: $err')),
              ),
            ),

            // TAB 2: ALL REQUESTS
            RefreshIndicator(
              onRefresh: () async => ref.invalidate(adminAllRequestsProvider(_allRequestsStatusFilter)),
              child: Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.all(12.0),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Filter Status:', style: TextStyle(fontWeight: FontWeight.bold)),
                        DropdownButton<String>(
                          value: _allRequestsStatusFilter,
                          underline: const SizedBox(),
                          items: ['All', 'Pending', 'Approved', 'Rejected', 'Cancelled'].map((s) {
                            return DropdownMenuItem(value: s, child: Text(s));
                          }).toList(),
                          onChanged: (v) {
                            if (v != null) {
                              setState(() => _allRequestsStatusFilter = v);
                              ref.read(paginatedAdminRequestsProvider.notifier).setFilter(v);
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Builder(
                      builder: (ctx) {
                        if (allRequestsState.isLoadingFirstPage) {
                          return const Center(child: CircularProgressIndicator());
                        }
                        if (allRequestsState.error != null && allRequestsState.items.isEmpty) {
                          return Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text('Error: ${allRequestsState.error}', style: const TextStyle(color: Colors.redAccent)),
                                const SizedBox(height: 12),
                                ElevatedButton(
                                  onPressed: () => ref.read(paginatedAdminRequestsProvider.notifier).loadFirstPage(),
                                  child: const Text('Retry'),
                                ),
                              ],
                            ),
                          );
                        }
                        if (allRequestsState.items.isEmpty) {
                          return const Center(child: Text('No requests found.'));
                        }

                        final itemCount = allRequestsState.items.length + (allRequestsState.isLoadingMore ? 1 : 0);
                        return ListView.separated(
                          controller: _allRequestsScrollController,
                          physics: const AlwaysScrollableScrollPhysics(),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: itemCount,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (ctx, i) {
                            if (i == allRequestsState.items.length) {
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
                            return _buildAdminRequestTile(ctx, allRequestsState.items[i]);
                          },
                        );
                      },
                    ),
                  ),
                ],
              ),
            ),

            // TAB 3: ALL EMPLOYEE BALANCES (GROUPED BY EMPLOYEE)
            RefreshIndicator(
              onRefresh: () async => ref.invalidate(adminBalancesProvider),
              child: balancesAsync.when(
                data: (balances) {
                  if (balances.isEmpty) {
                    return const Center(child: Text('No employee balances found.'));
                  }

                  // Group balances by employee name
                  final Map<String, List<EmployeeLeaveBalanceModel>> grouped = {};
                  for (final b in balances) {
                    final empName = b.employeeName.isNotEmpty ? b.employeeName : 'Employee';
                    if (!grouped.containsKey(empName)) {
                      grouped[empName] = [];
                    }
                    grouped[empName]!.add(b);
                  }

                  final employeeList = grouped.keys.toList();

                  return ListView.separated(
                    padding: const EdgeInsets.all(16),
                    itemCount: employeeList.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 14),
                    itemBuilder: (ctx, i) {
                      final empName = employeeList[i];
                      final empBalances = grouped[empName]!;
                      final email = empBalances.first.employeeEmail;
                      final initial = empName.isNotEmpty ? empName[0].toUpperCase() : 'E';

                      return Container(
                        padding: const EdgeInsets.all(18),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkSurface : Colors.white,
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                CircleAvatar(
                                  radius: 20,
                                  backgroundColor: AppColors.primaryPink.withOpacity(0.15),
                                  child: Text(
                                    initial,
                                    style: const TextStyle(
                                      color: AppColors.primaryPink,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 16,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        empName,
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 16,
                                          color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                                        ),
                                      ),
                                      if (email.isNotEmpty)
                                        Text(
                                          email,
                                          style: TextStyle(
                                            fontSize: 12,
                                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const Divider(height: 20),
                            Wrap(
                              spacing: 10,
                              runSpacing: 10,
                              children: empBalances.map((b) {
                                return Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                  decoration: BoxDecoration(
                                    color: isDark ? AppColors.darkBackground : const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: isDark ? AppColors.darkCardBorder.withOpacity(0.5) : Colors.black12,
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        b.leaveType?.name ?? 'Leave',
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        '${b.remaining} remaining',
                                        style: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.primaryPink,
                                        ),
                                      ),
                                      Text(
                                        'Allocated: ${b.totalAllocated} | Used: ${b.used}',
                                        style: const TextStyle(fontSize: 10, color: Colors.grey),
                                      ),
                                    ],
                                  ),
                                );
                              }).toList(),
                            ),
                          ],
                        ),
                      );
                    },
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => Center(child: Text('Error loading balances: $err')),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPendingTile(BuildContext context, LeaveRequestModel req) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final startStr = DateFormat('MMM dd, yyyy').format(req.startDate);
    final endStr = DateFormat('MMM dd, yyyy').format(req.endDate);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(req.employeeName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  Text(req.employeeEmail, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                ],
              ),
              StatusBadge(status: req.status),
            ],
          ),
          const Divider(height: 20),
          Text('${req.leaveType?.name ?? 'Leave'}: $startStr - $endStr (${req.numberOfDays} Days)', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600)),
          const SizedBox(height: 4),
          Text('Reason: "${req.reason}"', style: const TextStyle(fontSize: 13, fontStyle: FontStyle.italic)),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  icon: const Icon(Icons.cancel_outlined, size: 16, color: Colors.redAccent),
                  label: const Text('Reject', style: TextStyle(color: Colors.redAccent, fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: Colors.redAccent),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () {
                    showDialog(
                      context: context,
                      builder: (ctx) => RejectionDialog(
                        onConfirm: (reason) async {
                          await ref.read(leaveActionsProvider.notifier).rejectLeave(req.id, reason);
                        },
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.check_circle_outline, size: 16, color: Colors.white),
                  label: const Text('Approve', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF10B981),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  onPressed: () async {
                    await ref.read(leaveActionsProvider.notifier).approveLeave(req.id);
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildAdminRequestTile(BuildContext context, LeaveRequestModel req) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final startStr = DateFormat('MMM dd, yyyy').format(req.startDate);
    final endStr = DateFormat('MMM dd, yyyy').format(req.endDate);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(req.employeeName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
              StatusBadge(status: req.status),
            ],
          ),
          const SizedBox(height: 6),
          Text('${req.leaveType?.name ?? 'Leave'}: $startStr - $endStr (${req.numberOfDays} Days)', style: const TextStyle(fontSize: 13)),
          Text('Reason: "${req.reason}"', style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: Colors.grey)),
          if (req.rejectionReason != null) ...[
            const SizedBox(height: 4),
            Text('Rejection Reason: ${req.rejectionReason}', style: const TextStyle(fontSize: 12, color: Colors.redAccent, fontWeight: FontWeight.bold)),
          ],
        ],
      ),
    );
  }
}
