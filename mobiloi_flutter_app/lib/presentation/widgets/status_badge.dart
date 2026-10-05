import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class StatusBadge extends StatelessWidget {
  final String status;

  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    Color bg;
    Color text;
    Color border;

    switch (status.toLowerCase()) {
      case 'approved':
      case 'active':
        bg = isDark ? const Color(0xFF064E3B).withOpacity(0.6) : AppColors.approvedBg;
        text = isDark ? const Color(0xFF6EE7B7) : AppColors.approvedText;
        border = isDark ? const Color(0xFF047857) : AppColors.approvedBorder;
        break;
      case 'rejected':
      case 'blocked':
        bg = isDark ? const Color(0xFF881337).withOpacity(0.6) : AppColors.rejectedBg;
        text = isDark ? const Color(0xFFFDA4AF) : AppColors.rejectedText;
        border = isDark ? const Color(0xFFBE123C) : AppColors.rejectedBorder;
        break;
      case 'cancelled':
        bg = isDark ? const Color(0xFF1E293B) : AppColors.cancelledBg;
        text = isDark ? const Color(0xFF94A3B8) : AppColors.cancelledText;
        border = isDark ? const Color(0xFF334155) : AppColors.cancelledBorder;
        break;
      case 'completed':
        bg = isDark ? const Color(0xFF064E3B).withOpacity(0.6) : const Color(0xFFD1FAE5);
        text = isDark ? const Color(0xFF34D399) : const Color(0xFF047857);
        border = isDark ? const Color(0xFF059669) : const Color(0xFF6EE7B7);
        break;
      case 'in progress':
        bg = isDark ? const Color(0xFF581C87).withOpacity(0.6) : const Color(0xFFF3E8FF);
        text = isDark ? const Color(0xFFD8B4FE) : const Color(0xFF7E22CE);
        border = isDark ? const Color(0xFF7E22CE) : const Color(0xFFC084FC);
        break;
      case 'admin':
        bg = isDark ? const Color(0xFF581C87).withOpacity(0.6) : const Color(0xFFF3E8FF);
        text = isDark ? const Color(0xFFD8B4FE) : const Color(0xFF7E22CE);
        border = isDark ? const Color(0xFF7E22CE) : const Color(0xFFC084FC);
        break;
      case 'employee':
        bg = isDark ? const Color(0xFF1E3A8A).withOpacity(0.6) : const Color(0xFFDBEAFE);
        text = isDark ? const Color(0xFF93C5FD) : const Color(0xFF1D4ED8);
        border = isDark ? const Color(0xFF1D4ED8) : const Color(0xFF60A5FA);
        break;
      case 'pending':
      default:
        bg = isDark ? const Color(0xFF78350F).withOpacity(0.6) : AppColors.pendingBg;
        text = isDark ? const Color(0xFFFCD34D) : AppColors.pendingText;
        border = isDark ? const Color(0xFFB45309) : AppColors.pendingBorder;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: border, width: 1),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: text.withOpacity(0.8),
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 6),
          Text(
            status,
            style: TextStyle(
              color: text,
              fontSize: 12,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }
}
