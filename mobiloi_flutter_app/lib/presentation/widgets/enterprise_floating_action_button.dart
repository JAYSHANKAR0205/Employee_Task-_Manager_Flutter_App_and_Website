import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class EnterpriseFloatingActionButton extends StatelessWidget {
  final VoidCallback onPressed;
  final String tooltip;
  final IconData icon;

  const EnterpriseFloatingActionButton({
    super.key,
    required this.onPressed,
    required this.tooltip,
    this.icon = Icons.add_rounded,
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.only(bottom: 8.0, right: 8.0),
        child: Container(
          decoration: BoxDecoration(
            gradient: AppColors.primaryGradient,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: AppColors.primaryPink.withOpacity(0.35),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: FloatingActionButton(
            onPressed: onPressed,
            tooltip: tooltip,
            elevation: 0,
            highlightElevation: 0,
            backgroundColor: Colors.transparent,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(icon, size: 28),
          ),
        ),
      ),
    );
  }
}
