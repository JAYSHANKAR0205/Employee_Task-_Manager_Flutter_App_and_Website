import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class ViewActionButton extends StatelessWidget {
  final VoidCallback onPressed;
  final String tooltip;
  final String label;

  const ViewActionButton({
    super.key,
    required this.onPressed,
    this.tooltip = 'View Details',
    this.label = 'View',
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Tooltip(
      message: tooltip,
      child: OutlinedButton.icon(
        onPressed: onPressed,
        icon: const Icon(Icons.remove_red_eye_outlined, size: 16, color: AppColors.primaryPink),
        label: Text(
          label,
          style: const TextStyle(
            color: AppColors.primaryPink,
            fontWeight: FontWeight.bold,
            fontSize: 13,
          ),
        ),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: AppColors.primaryPink, width: 1.2),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
          backgroundColor: isDark
              ? AppColors.primaryPink.withOpacity(0.08)
              : AppColors.primaryPink.withOpacity(0.04),
        ),
      ),
    );
  }
}
