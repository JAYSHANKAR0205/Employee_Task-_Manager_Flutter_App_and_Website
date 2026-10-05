import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class EnterpriseSkeletonCard extends StatefulWidget {
  final double height;
  final double? width;
  final double borderRadius;
  final EdgeInsetsGeometry? margin;

  const EnterpriseSkeletonCard({
    super.key,
    this.height = 100,
    this.width,
    this.borderRadius = 16,
    this.margin,
  });

  @override
  State<EnterpriseSkeletonCard> createState() => _EnterpriseSkeletonCardState();
}

class _EnterpriseSkeletonCardState extends State<EnterpriseSkeletonCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _animation = Tween<double>(begin: 0.35, end: 0.85).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final baseColor = isDark ? const Color(0xFF261D2C) : const Color(0xFFF1F5F9);
    final highlightColor = isDark ? const Color(0xFF382A40) : const Color(0xFFE2E8F0);

    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Container(
          height: widget.height,
          width: widget.width,
          margin: widget.margin ?? const EdgeInsets.only(bottom: 12),
          decoration: BoxDecoration(
            color: Color.lerp(baseColor, highlightColor, _animation.value),
            borderRadius: BorderRadius.circular(widget.borderRadius),
            border: Border.all(
              color: isDark
                  ? AppColors.darkCardBorder.withOpacity(0.5)
                  : AppColors.lightCardBorder.withOpacity(0.5),
            ),
          ),
        );
      },
    );
  }
}
