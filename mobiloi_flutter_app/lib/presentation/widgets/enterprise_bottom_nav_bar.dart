import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/app_navigation.dart';
import '../providers/auth_provider.dart';
import 'enterprise_user_avatar.dart';

class EnterpriseBottomNavBar extends ConsumerWidget {
  final String currentRoute;

  const EnterpriseBottomNavBar({
    super.key,
    required this.currentRoute,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final isAdmin = user?.isAdmin ?? false;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final leaveRoute = isAdmin ? '/admin-leaves' : '/leaves';

    final items = <_BottomNavItemData>[
      const _BottomNavItemData(
        label: 'Home',
        route: '/dashboard',
        activeIcon: Icons.home_rounded,
        inactiveIcon: Icons.home_outlined,
      ),
      const _BottomNavItemData(
        label: 'Tasks',
        route: '/tasks',
        activeIcon: Icons.assignment,
        inactiveIcon: Icons.assignment_outlined,
      ),
      _BottomNavItemData(
        label: 'Leave',
        route: leaveRoute,
        activeIcon: Icons.calendar_month,
        inactiveIcon: Icons.calendar_month_outlined,
      ),
      if (isAdmin)
        const _BottomNavItemData(
          label: 'All Users',
          route: '/employees',
          activeIcon: Icons.people,
          inactiveIcon: Icons.people_outline,
        ),
      const _BottomNavItemData(
        label: 'Profile',
        route: '/profile',
        isProfile: true,
      ),
    ];

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        border: Border(
          top: BorderSide(
            color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder,
            width: 1,
          ),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(isDark ? 0.2 : 0.05),
            offset: const Offset(0, -2),
            blurRadius: 10,
          ),
        ],
      ),
      child: SafeArea(
        top: false,
        child: SizedBox(
          height: 62,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: items.map((item) {
              final isSelected = currentRoute == item.route;

              return Expanded(
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () {
                      if (!isSelected) {
                        final currentIndex = items.indexWhere((i) => i.route == currentRoute);
                        final newIndex = items.indexOf(item);
                        final isBack = currentIndex >= 0 && newIndex < currentIndex;
                        AppNavigation.go(
                          context,
                          item.route,
                          extra: isBack ? const {'isBack': true} : null,
                        );
                      }
                    },
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        if (item.isProfile)
                          Container(
                            padding: const EdgeInsets.all(2),
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              border: Border.all(
                                color: isSelected ? AppColors.primaryPink : Colors.transparent,
                                width: 2,
                              ),
                            ),
                            child: EnterpriseUserAvatar(
                              user: user,
                              profilePicture: user?.profilePicture,
                              firstName: user?.firstName,
                              email: user?.email,
                              radius: 12,
                              fontSize: 10,
                              textColor: isSelected
                                  ? AppColors.primaryPink
                                  : (isDark
                                      ? AppColors.darkTextSecondary
                                      : AppColors.lightTextSecondary),
                            ),
                          )
                        else
                          Icon(
                            isSelected ? item.activeIcon : item.inactiveIcon,
                            size: 24,
                            color: isSelected
                                ? AppColors.primaryPink
                                : (isDark
                                    ? AppColors.darkTextSecondary
                                    : AppColors.lightTextSecondary),
                          ),
                        const SizedBox(height: 3),
                        Text(
                          item.label,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                            color: isSelected
                                ? AppColors.primaryPink
                                : (isDark
                                    ? AppColors.darkTextSecondary
                                    : AppColors.lightTextSecondary),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
        ),
      ),
    );
  }
}

class _BottomNavItemData {
  final String label;
  final String route;
  final IconData? activeIcon;
  final IconData? inactiveIcon;
  final bool isProfile;

  const _BottomNavItemData({
    required this.label,
    required this.route,
    this.activeIcon,
    this.inactiveIcon,
    this.isProfile = false,
  });
}
