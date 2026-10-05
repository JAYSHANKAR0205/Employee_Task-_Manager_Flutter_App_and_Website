import 'package:flutter/material.dart';

class AppColors {
  // Brand Gradients
  static const LinearGradient primaryGradient = LinearGradient(
    colors: [Color(0xFFEA4C89), Color(0xFFA855F7)],
    begin: Alignment.centerLeft,
    end: Alignment.centerRight,
  );

  static const Color primaryPink = Color(0xFFEA4C89);
  static const Color primaryPurple = Color(0xFFA855F7);

  // Dark Theme Colors (Slate 900 / 800)
  static const Color darkBackground = Color(0xFF0F172A);
  static const Color darkSurface = Color(0xFF1E293B);
  static const Color darkCardBorder = Color(0xFF334155);
  static const Color darkTextPrimary = Color(0xFFF8FAFC);
  static const Color darkTextSecondary = Color(0xFF94A3B8);

  // Light Theme Colors (Slate 50 / White)
  static const Color lightBackground = Color(0xFFF8FAFC);
  static const Color lightSurface = Color(0xFFFFFFFF);
  static const Color lightCardBorder = Color(0xFFE2E8F0);
  static const Color lightTextPrimary = Color(0xFF0F172A);
  static const Color lightTextSecondary = Color(0xFF64748B);

  // Status Badge Colors
  static const Color pendingBg = Color(0xFFFEF3C7);
  static const Color pendingText = Color(0xFFB45309);
  static const Color pendingBorder = Color(0xFFFCD34D);

  static const Color approvedBg = Color(0xFFD1FAE5);
  static const Color approvedText = Color(0xFF047857);
  static const Color approvedBorder = Color(0xFF6EE7B7);

  static const Color rejectedBg = Color(0xFFFFE4E6);
  static const Color rejectedText = Color(0xFFBE123C);
  static const Color rejectedBorder = Color(0xFFFDA4AF);

  static const Color cancelledBg = Color(0xFFF1F5F9);
  static const Color cancelledText = Color(0xFF475569);
  static const Color cancelledBorder = Color(0xFFCBD5E1);
}
