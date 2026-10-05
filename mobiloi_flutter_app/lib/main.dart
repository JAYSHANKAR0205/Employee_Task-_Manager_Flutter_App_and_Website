import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import 'app_router.dart';
import 'core/constants/app_colors.dart';
import 'presentation/providers/theme_provider.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: MobiloiApp()));
}

class MobiloiApp extends ConsumerWidget {
  const MobiloiApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(appRouterProvider);
    final themeMode = ref.watch(themeModeProvider);

    final textTheme = GoogleFonts.interTextTheme();

    const pageTransitionsTheme = PageTransitionsTheme(
      builders: {
        TargetPlatform.android: AppSlidePageTransitionsBuilder(),
        TargetPlatform.iOS: AppSlidePageTransitionsBuilder(),
        TargetPlatform.windows: AppSlidePageTransitionsBuilder(),
        TargetPlatform.macOS: AppSlidePageTransitionsBuilder(),
        TargetPlatform.linux: AppSlidePageTransitionsBuilder(),
        TargetPlatform.fuchsia: AppSlidePageTransitionsBuilder(),
      },
    );

    return MaterialApp.router(
      title: 'Employee Task & Leave Manager',
      debugShowCheckedModeBanner: false,
      themeMode: themeMode,
      theme: ThemeData(
        brightness: Brightness.light,
        scaffoldBackgroundColor: AppColors.lightBackground,
        primaryColor: AppColors.primaryPink,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primaryPink,
          brightness: Brightness.light,
          primary: AppColors.primaryPink,
          secondary: AppColors.primaryPurple,
        ),
        textTheme: textTheme,
        pageTransitionsTheme: pageTransitionsTheme,
        useMaterial3: true,
      ),
      darkTheme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: AppColors.darkBackground,
        primaryColor: AppColors.primaryPink,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primaryPink,
          brightness: Brightness.dark,
          primary: AppColors.primaryPink,
          secondary: AppColors.primaryPurple,
          surface: AppColors.darkSurface,
        ),
        textTheme: GoogleFonts.interTextTheme(ThemeData.dark().textTheme),
        pageTransitionsTheme: pageTransitionsTheme,
        useMaterial3: true,
      ),
      routerConfig: router,
    );
  }
}

/// Fallback / MaterialPageRoute transitions builder ensuring horizontal slide:
/// Push: Right → Left
/// Pop: Left → Right
class AppSlidePageTransitionsBuilder extends PageTransitionsBuilder {
  const AppSlidePageTransitionsBuilder();

  @override
  Widget buildTransitions<T>(
    PageRoute<T> route,
    BuildContext context,
    Animation<double> animation,
    Animation<double> secondaryAnimation,
    Widget child,
  ) {
    final curvedAnimation = CurvedAnimation(
      parent: animation,
      curve: Curves.easeInOutCubic,
      reverseCurve: Curves.easeInOutCubic,
    );

    final curvedSecondary = CurvedAnimation(
      parent: secondaryAnimation,
      curve: Curves.easeInOutCubic,
      reverseCurve: Curves.easeInOutCubic,
    );

    return SlideTransition(
      position: Tween<Offset>(
        begin: Offset.zero,
        end: const Offset(-0.25, 0.0),
      ).animate(curvedSecondary),
      child: SlideTransition(
        position: Tween<Offset>(
          begin: const Offset(1.0, 0.0),
          end: Offset.zero,
        ).animate(curvedAnimation),
        child: child,
      ),
    );
  }
}
