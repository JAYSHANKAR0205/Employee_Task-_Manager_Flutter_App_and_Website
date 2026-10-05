import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/app_navigation.dart';
import '../../providers/theme_provider.dart';
import '../../widgets/enterprise_bottom_nav_bar.dart';

class SettingsScreen extends ConsumerWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentThemeMode = ref.watch(themeModeProvider);
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        AppNavigation.popOrGo(context, '/profile');
      },
      child: Scaffold(
        backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
        appBar: AppBar(
          backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
          elevation: 0,
          leading: IconButton(
            icon: Icon(Icons.arrow_back, color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary),
            onPressed: () => AppNavigation.popOrGo(context, '/profile'),
          ),
          title: Text(
            'Settings',
            style: TextStyle(
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        bottomNavigationBar: const EnterpriseBottomNavBar(currentRoute: '/profile'),
        body: SingleChildScrollView(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Customize application preferences and appearance settings.',
                style: TextStyle(
                  fontSize: 14,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 24),

              // Appearance Section Card
              Container(
                decoration: BoxDecoration(
                  color: isDark ? AppColors.darkSurface : Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(
                    color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder,
                  ),
                ),
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.palette_outlined, color: AppColors.primaryPink, size: 22),
                        const SizedBox(width: 10),
                        Text(
                          'Appearance',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Choose how the application looks to match your display preferences.',
                      style: TextStyle(
                        fontSize: 12,
                        color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Divider(),
                    const SizedBox(height: 12),

                    Text(
                      'Theme',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                      ),
                    ),
                    const SizedBox(height: 14),

                    // Theme Mode Options
                    _buildThemeTile(
                      context: context,
                      ref: ref,
                      mode: ThemeMode.system,
                      title: 'System',
                      subtitle: 'Follow device system color theme',
                      icon: Icons.brightness_auto_outlined,
                      currentMode: currentThemeMode,
                      isDark: isDark,
                    ),
                    const SizedBox(height: 10),
                    _buildThemeTile(
                      context: context,
                      ref: ref,
                      mode: ThemeMode.light,
                      title: 'Light',
                      subtitle: 'Clean high-contrast light theme',
                      icon: Icons.light_mode_outlined,
                      currentMode: currentThemeMode,
                      isDark: isDark,
                    ),
                    const SizedBox(height: 10),
                    _buildThemeTile(
                      context: context,
                      ref: ref,
                      mode: ThemeMode.dark,
                      title: 'Dark',
                      subtitle: 'Sleek dark mode interface',
                      icon: Icons.dark_mode_outlined,
                      currentMode: currentThemeMode,
                      isDark: isDark,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildThemeTile({
    required BuildContext context,
    required WidgetRef ref,
    required ThemeMode mode,
    required String title,
    required String subtitle,
    required IconData icon,
    required ThemeMode currentMode,
    required bool isDark,
  }) {
    final isSelected = currentMode == mode;

    return InkWell(
      onTap: () {
        ref.read(themeModeProvider.notifier).setThemeMode(mode);
      },
      borderRadius: BorderRadius.circular(14),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primaryPink.withOpacity(0.08)
              : (isDark ? AppColors.darkBackground.withOpacity(0.5) : const Color(0xFFF8FAFC)),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(
            color: isSelected
                ? AppColors.primaryPink
                : (isDark ? AppColors.darkCardBorder.withOpacity(0.6) : Colors.black12),
            width: isSelected ? 1.8 : 1.0,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: isSelected ? AppColors.primaryPink : (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary),
              size: 22,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Radio<ThemeMode>(
              value: mode,
              groupValue: currentMode,
              activeColor: AppColors.primaryPink,
              onChanged: (val) {
                if (val != null) {
                  ref.read(themeModeProvider.notifier).setThemeMode(val);
                }
              },
            ),
          ],
        ),
      ),
    );
  }
}
