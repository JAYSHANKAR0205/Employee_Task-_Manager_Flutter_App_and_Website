import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/app_navigation.dart';
import '../../providers/auth_provider.dart';
import '../../providers/task_provider.dart';
import '../../widgets/enterprise_bottom_nav_bar.dart';
import '../../widgets/enterprise_user_avatar.dart';
import '../../widgets/status_badge.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final tasksAsync = ref.watch(tasksProvider);
    final user = authState.user;
    final isAdmin = user?.isAdmin ?? false;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      appBar: AppBar(
        backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
        elevation: 0,
        automaticallyImplyLeading: false,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                gradient: AppColors.primaryGradient,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Text(
                'ET',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                'Employee Task & Leave Manager',
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                  fontWeight: FontWeight.bold,
                  fontSize: 17,
                ),
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: const EnterpriseBottomNavBar(currentRoute: '/dashboard'),
      body: RefreshIndicator(
        onRefresh: () async => ref.invalidate(tasksProvider),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Welcome Banner Card (Highlighted Enterprise Redesign)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder,
                  ),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.primaryPink.withOpacity(0.08),
                      blurRadius: 16,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    // Left vertical accent bar
                    Container(
                      width: 4,
                      height: 56,
                      decoration: BoxDecoration(
                        gradient: AppColors.primaryGradient,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Hi, ${user?.firstName ?? 'User'} 👋',
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.w800,
                              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                              letterSpacing: -0.3,
                            ),
                          ),
                          const SizedBox(height: 6),
                          // Highlighted Subtitle Badge
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              gradient: LinearGradient(
                                colors: [
                                  AppColors.primaryPink.withOpacity(0.15),
                                  AppColors.primaryPurple.withOpacity(0.15),
                                ],
                              ),
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: AppColors.primaryPink.withOpacity(0.2),
                              ),
                            ),
                            child: Text(
                              'Have a productive day.',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w700,
                                color: isDark ? Colors.purple.shade200 : AppColors.primaryPurple,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Role & Avatar
                    Column(
                      children: [
                        EnterpriseUserAvatar(
                          user: user,
                          radius: 22,
                          fontSize: 16,
                        ),
                        const SizedBox(height: 4),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isDark ? Colors.grey.shade800 : Colors.grey.shade100,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            user?.role.toUpperCase() ?? 'EMPLOYEE',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Task Summary Cards (4 Cards)
              tasksAsync.when(
                data: (tasks) {
                  final total = tasks.length;
                  final completed = tasks.where((t) => t.status == 'Completed').length;
                  final inProgress = tasks.where((t) => t.status == 'In Progress').length;
                  final pending = tasks.where((t) => t.status == 'Pending').length;

                  return _buildSummaryCardsGrid(
                    context: context,
                    isDark: isDark,
                    total: total.toString(),
                    completed: completed.toString(),
                    inProgress: inProgress.toString(),
                    pending: pending.toString(),
                  );
                },
                loading: () => _buildSummaryCardsGrid(
                  context: context,
                  isDark: isDark,
                  total: '...',
                  completed: '...',
                  inProgress: '...',
                  pending: '...',
                ),
                error: (_, __) => _buildSummaryCardsGrid(
                  context: context,
                  isDark: isDark,
                  total: '0',
                  completed: '0',
                  inProgress: '0',
                  pending: '0',
                ),
              ),
              const SizedBox(height: 24),

              // Quick Shortcuts Header
              Text(
                'Quick Navigation',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                ),
              ),
              const SizedBox(height: 14),

              // Navigation Grid
              GridView.count(
                crossAxisCount: MediaQuery.of(context).size.width > 600 ? 4 : 2,
                crossAxisSpacing: 14,
                mainAxisSpacing: 14,
                childAspectRatio: 1.6,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                children: [
                  _buildQuickCard(
                    context: context,
                    icon: Icons.assignment_outlined,
                    title: 'Tasks',
                    subtitle: 'Manage assigned tasks',
                    color: Colors.blueAccent,
                    onTap: () => AppNavigation.go(context, '/tasks'),
                  ),
                  if (isAdmin) ...[
                    _buildQuickCard(
                      context: context,
                      icon: Icons.verified_user_outlined,
                      title: 'Leave Portal',
                      subtitle: 'Approve / Reject requests',
                      color: Colors.purpleAccent,
                      onTap: () => AppNavigation.go(context, '/admin-leaves'),
                    ),
                    _buildQuickCard(
                      context: context,
                      icon: Icons.people_outline,
                      title: 'All Users',
                      subtitle: 'Manage employee list',
                      color: Colors.tealAccent,
                      onTap: () => AppNavigation.go(context, '/employees'),
                    ),
                  ] else ...[
                    _buildQuickCard(
                      context: context,
                      icon: Icons.calendar_month_outlined,
                      title: 'My Leaves',
                      subtitle: 'Apply & check balance',
                      color: Colors.orangeAccent,
                      onTap: () => AppNavigation.go(context, '/leaves'),
                    ),
                  ],
                  _buildQuickCard(
                    context: context,
                    icon: Icons.person_outline,
                    title: 'Profile',
                    subtitle: 'Account details',
                    color: Colors.pinkAccent,
                    onTap: () => AppNavigation.go(context, '/profile'),
                  ),
                ],
              ),
              const SizedBox(height: 28),

              // Recent Tasks Preview
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Recent Tasks',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                    ),
                  ),
                  TextButton(
                    onPressed: () => AppNavigation.go(context, '/tasks'),
                    child: const Row(
                      children: [
                        Text('View All', style: TextStyle(fontWeight: FontWeight.bold, color: AppColors.primaryPink)),
                        Icon(Icons.arrow_forward_rounded, size: 16, color: AppColors.primaryPink),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              tasksAsync.when(
                data: (tasks) {
                  if (tasks.isEmpty) {
                    return Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: isDark ? AppColors.darkSurface : Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder),
                      ),
                      child: const Center(
                        child: Text('No tasks available at the moment.', style: TextStyle(color: Colors.grey)),
                      ),
                    );
                  }
                  final recent = tasks.take(3).toList();
                  return ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: recent.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, i) {
                      final t = recent[i];
                      return Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkSurface : Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    t.title,
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                      color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                                    ),
                                  ),
                                  if (t.description.isNotEmpty) ...[
                                    const SizedBox(height: 4),
                                    Text(
                                      t.description,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                                      ),
                                    ),
                                  ],
                                ],
                              ),
                            ),
                            const SizedBox(width: 12),
                            StatusBadge(status: t.status),
                          ],
                        ),
                      );
                    },
                  );
                },
                loading: () => const Center(child: CircularProgressIndicator()),
                error: (err, _) => const SizedBox(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryCard({
    required BuildContext context,
    required String title,
    required String value,
    required String icon,
    required Color titleColor,
    required Color bottomBarColor,
    required Gradient gradient,
    required Color borderColor,
    required Color iconBgColor,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            gradient: gradient,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: borderColor, width: 1.2),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(isDark ? 0.2 : 0.03),
                blurRadius: 8,
                offset: const Offset(0, 2),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(16),
            child: Stack(
              children: [
                // Decorative ambient shine
                Positioned(
                  top: -14,
                  right: -14,
                  child: Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      color: isDark ? Colors.white.withOpacity(0.04) : Colors.white.withOpacity(0.45),
                    ),
                  ),
                ),

                // Card Content
                Padding(
                  padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Title & Value Column
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text(
                              title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: titleColor,
                                letterSpacing: 0.6,
                              ),
                            ),
                            const SizedBox(height: 6),
                            Text(
                              value,
                              style: TextStyle(
                                fontSize: 26,
                                fontWeight: FontWeight.w900,
                                color: isDark ? Colors.white : AppColors.lightTextPrimary,
                                letterSpacing: -0.5,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),

                      // Styled Icon Box
                      Container(
                        width: 44,
                        height: 44,
                        decoration: BoxDecoration(
                          color: iconBgColor,
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withOpacity(0.04),
                              blurRadius: 4,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          icon,
                          style: const TextStyle(fontSize: 18),
                        ),
                      ),
                    ],
                  ),
                ),

                // Decorative Bottom Accent Bar
                Positioned(
                  bottom: 0,
                  left: 0,
                  right: 0,
                  child: Container(
                    height: 4,
                    decoration: BoxDecoration(
                      color: bottomBarColor.withOpacity(0.6),
                      borderRadius: const BorderRadius.vertical(bottom: Radius.circular(16)),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildQuickCard({
    required BuildContext context,
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(10),
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
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withOpacity(0.15),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(height: 6),
            Text(
              title,
              maxLines: 1,
              style: TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
              ),
            ),
            Text(
              subtitle,
              style: TextStyle(
                fontSize: 11,
                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryCardsGrid({
    required BuildContext context,
    required bool isDark,
    required String total,
    required String completed,
    required String inProgress,
    required String pending,
  }) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 700;
        final crossCount = isWide ? 4 : 2;
        return GridView.count(
          crossAxisCount: crossCount,
          crossAxisSpacing: 14,
          mainAxisSpacing: 14,
          childAspectRatio: isWide ? 1.8 : 1.45,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          children: [
            _buildSummaryCard(
              context: context,
              title: 'TOTAL TASKS',
              value: total,
              icon: '📁',
              titleColor: isDark ? const Color(0xFFF472B6) : const Color(0xFFDB2777),
              bottomBarColor: const Color(0xFFEC4899),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: isDark
                    ? [const Color(0xFF500724).withOpacity(0.25), const Color(0xFF4C0519).withOpacity(0.20)]
                    : [const Color(0xFFFCE7F3).withOpacity(0.65), const Color(0xFFFFF1F2).withOpacity(0.35), const Color(0xFFFCE7F3).withOpacity(0.65)],
              ),
              borderColor: isDark ? const Color(0xFF9D174D).withOpacity(0.4) : const Color(0xFFFBCFE8).withOpacity(0.7),
              iconBgColor: isDark ? const Color(0xFF831843).withOpacity(0.45) : const Color(0xFFFCE7F3).withOpacity(0.85),
              onTap: () => AppNavigation.go(context, '/tasks?status=All'),
            ),
            _buildSummaryCard(
              context: context,
              title: 'COMPLETED',
              value: completed,
              icon: '✅',
              titleColor: isDark ? const Color(0xFF34D399) : const Color(0xFF059669),
              bottomBarColor: const Color(0xFF10B981),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: isDark
                    ? [const Color(0xFF022C22).withOpacity(0.25), const Color(0xFF042F2E).withOpacity(0.20)]
                    : [const Color(0xFFD1FAE5).withOpacity(0.65), const Color(0xFFCCFBF1).withOpacity(0.35), const Color(0xFFD1FAE5).withOpacity(0.65)],
              ),
              borderColor: isDark ? const Color(0xFF065F46).withOpacity(0.4) : const Color(0xFFA7F3D0).withOpacity(0.7),
              iconBgColor: isDark ? const Color(0xFF064E3B).withOpacity(0.45) : const Color(0xFFD1FAE5).withOpacity(0.85),
              onTap: () => AppNavigation.go(context, '/tasks?status=Completed'),
            ),
            _buildSummaryCard(
              context: context,
              title: 'IN PROGRESS',
              value: inProgress,
              icon: '⏳',
              titleColor: isDark ? const Color(0xFFC084FC) : const Color(0xFF9333EA),
              bottomBarColor: const Color(0xFFA855F7),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: isDark
                    ? [const Color(0xFF2E1065).withOpacity(0.25), const Color(0xFF1E1B4B).withOpacity(0.20)]
                    : [const Color(0xFFF3E8FF).withOpacity(0.65), const Color(0xFFE0E7FF).withOpacity(0.35), const Color(0xFFF3E8FF).withOpacity(0.65)],
              ),
              borderColor: isDark ? const Color(0xFF6B21A8).withOpacity(0.4) : const Color(0xFFE9D5FF).withOpacity(0.7),
              iconBgColor: isDark ? const Color(0xFF581C87).withOpacity(0.45) : const Color(0xFFF3E8FF).withOpacity(0.85),
              onTap: () => AppNavigation.go(context, '/tasks?status=In Progress'),
            ),
            _buildSummaryCard(
              context: context,
              title: 'PENDING',
              value: pending,
              icon: '🕒',
              titleColor: isDark ? const Color(0xFFFBBF24) : const Color(0xFFD97706),
              bottomBarColor: const Color(0xFFF59E0B),
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: isDark
                    ? [const Color(0xFF451A03).withOpacity(0.25), const Color(0xFF431407).withOpacity(0.20)]
                    : [const Color(0xFFFEF3C7).withOpacity(0.65), const Color(0xFFFFEDD5).withOpacity(0.35), const Color(0xFFFEF3C7).withOpacity(0.65)],
              ),
              borderColor: isDark ? const Color(0xFF92400E).withOpacity(0.4) : const Color(0xFFFDE68A).withOpacity(0.7),
              iconBgColor: isDark ? const Color(0xFF78350F).withOpacity(0.45) : const Color(0xFFFEF3C7).withOpacity(0.85),
              onTap: () => AppNavigation.go(context, '/tasks?status=Pending'),
            ),
          ],
        );
      },
    );
  }
}
