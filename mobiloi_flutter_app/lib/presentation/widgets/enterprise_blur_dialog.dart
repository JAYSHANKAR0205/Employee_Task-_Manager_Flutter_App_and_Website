import 'dart:ui';
import 'package:flutter/material.dart';

class EnterpriseBlurDialog extends StatelessWidget {
  final Widget child;
  final double blurSigma;
  final Color? scrimColor;
  final bool barrierDismissible;

  const EnterpriseBlurDialog({
    super.key,
    required this.child,
    this.blurSigma = 10.0,
    this.scrimColor,
    this.barrierDismissible = true,
  });

  static Future<T?> show<T>({
    required BuildContext context,
    required Widget child,
    double blurSigma = 10.0,
    Color? scrimColor,
    bool barrierDismissible = true,
  }) {
    return showDialog<T>(
      context: context,
      barrierDismissible: barrierDismissible,
      barrierColor: Colors.transparent,
      builder: (ctx) => EnterpriseBlurDialog(
        blurSigma: blurSigma,
        scrimColor: scrimColor,
        barrierDismissible: barrierDismissible,
        child: child,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final defaultScrim = isDark
        ? Colors.black.withOpacity(0.65)
        : Colors.black.withOpacity(0.40);

    return Stack(
      children: [
        // Fullscreen Backdrop Blur & Scrim
        Positioned.fill(
          child: GestureDetector(
            behavior: HitTestBehavior.opaque,
            onTap: barrierDismissible ? () => Navigator.of(context).pop() : null,
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: blurSigma, sigmaY: blurSigma),
              child: Container(
                color: scrimColor ?? defaultScrim,
              ),
            ),
          ),
        ),

        // Foreground Dialog Content
        child,
      ],
    );
  }
}
