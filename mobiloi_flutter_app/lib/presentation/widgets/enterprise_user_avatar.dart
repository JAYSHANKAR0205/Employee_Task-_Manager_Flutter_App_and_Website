import 'dart:convert';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';
import '../../data/models/user_model.dart';

/// Reusable enterprise user avatar component.
///
/// Displays:
/// 1. The actual profile picture from [profilePicture] or [user.profilePicture] / [user.profilePic]
///    if valid (e.g. Cloudinary URL or data URI).
/// 2. If the picture is null, empty, missing, or fails to load from the network,
///    gracefully falls back to displaying the uppercase first letter of the user's first name.
/// 3. Never displays broken image icons, "null", "undefined", or "?".
class EnterpriseUserAvatar extends StatelessWidget {
  final UserModel? user;
  final String? profilePicture;
  final String? firstName;
  final String? lastName;
  final String? email;
  final String? fullName;
  final double radius;
  final double? fontSize;
  final FontWeight fontWeight;
  final Color? backgroundColor;
  final Color? textColor;
  final Border? border;
  final BoxShape shape;
  final BorderRadius? borderRadius;

  const EnterpriseUserAvatar({
    super.key,
    this.user,
    this.profilePicture,
    this.firstName,
    this.lastName,
    this.email,
    this.fullName,
    this.radius = 20.0,
    this.fontSize,
    this.fontWeight = FontWeight.bold,
    this.backgroundColor,
    this.textColor,
    this.border,
    this.shape = BoxShape.circle,
    this.borderRadius,
  });

  /// Factory constructor that accepts a UserModel directly.
  factory EnterpriseUserAvatar.fromUser(
    UserModel user, {
    Key? key,
    double radius = 20.0,
    double? fontSize,
    FontWeight fontWeight = FontWeight.bold,
    Color? backgroundColor,
    Color? textColor,
    Border? border,
    BoxShape shape = BoxShape.circle,
    BorderRadius? borderRadius,
  }) {
    return EnterpriseUserAvatar(
      key: key,
      user: user,
      profilePicture: user.profilePicture ?? user.profilePic,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      fullName: user.fullName,
      radius: radius,
      fontSize: fontSize,
      fontWeight: fontWeight,
      backgroundColor: backgroundColor,
      textColor: textColor,
      border: border,
      shape: shape,
      borderRadius: borderRadius,
    );
  }

  /// Calculates the fallback initial using the first letter of the first name.
  static String getInitial({
    UserModel? user,
    String? firstName,
    String? lastName,
    String? email,
    String? fullName,
  }) {
    // 1. Direct first name or user.firstName
    final rawFirst = (firstName ?? user?.firstName ?? '').trim();
    if (rawFirst.isNotEmpty && rawFirst.toLowerCase() != 'null' && rawFirst.toLowerCase() != 'undefined') {
      for (int i = 0; i < rawFirst.length; i++) {
        final char = rawFirst[i];
        if (RegExp(r'[a-zA-Z0-9]').hasMatch(char)) {
          return char.toUpperCase();
        }
      }
      return rawFirst[0].toUpperCase();
    }

    // 2. Full name if provided
    final rawFull = (fullName ?? user?.fullName ?? '').trim();
    if (rawFull.isNotEmpty && rawFull.toLowerCase() != 'null' && rawFull.toLowerCase() != 'undefined') {
      final parts = rawFull.split(RegExp(r'\s+'));
      for (final part in parts) {
        if (part.isNotEmpty && part.toLowerCase() != 'null' && part.toLowerCase() != 'undefined') {
          for (int i = 0; i < part.length; i++) {
            final char = part[i];
            if (RegExp(r'[a-zA-Z0-9]').hasMatch(char)) {
              return char.toUpperCase();
            }
          }
        }
      }
    }

    // 3. Last name fallback
    final rawLast = (lastName ?? user?.lastName ?? '').trim();
    if (rawLast.isNotEmpty && rawLast.toLowerCase() != 'null' && rawLast.toLowerCase() != 'undefined') {
      for (int i = 0; i < rawLast.length; i++) {
        final char = rawLast[i];
        if (RegExp(r'[a-zA-Z0-9]').hasMatch(char)) {
          return char.toUpperCase();
        }
      }
    }

    // 4. Email fallback
    final rawEmail = (email ?? user?.email ?? '').trim();
    if (rawEmail.isNotEmpty && rawEmail.toLowerCase() != 'null' && rawEmail.toLowerCase() != 'undefined') {
      for (int i = 0; i < rawEmail.length; i++) {
        final char = rawEmail[i];
        if (RegExp(r'[a-zA-Z0-9]').hasMatch(char)) {
          return char.toUpperCase();
        }
      }
    }

    // 5. Ultimate safe fallback
    return 'U';
  }

  @override
  Widget build(BuildContext context) {
    final effectivePicture = (profilePicture ?? user?.profilePicture ?? user?.profilePic)?.trim();
    final initial = getInitial(
      user: user,
      firstName: firstName,
      lastName: lastName,
      email: email,
      fullName: fullName,
    );

    final size = radius * 2;
    final effectiveFontSize = fontSize ?? (radius * 0.82);
    final effectiveBgColor = backgroundColor ?? AppColors.primaryPink.withOpacity(0.15);
    final effectiveTextColor = textColor ?? AppColors.primaryPink;

    final fallbackWidget = Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      color: effectiveBgColor,
      child: Text(
        initial,
        style: TextStyle(
          fontSize: effectiveFontSize,
          fontWeight: fontWeight,
          color: effectiveTextColor,
          height: 1.0,
        ),
      ),
    );

    Widget content;
    final hasUrl = effectivePicture != null &&
        effectivePicture.isNotEmpty &&
        effectivePicture.toLowerCase() != 'null' &&
        effectivePicture.toLowerCase() != 'undefined';

    if (!hasUrl) {
      content = fallbackWidget;
    } else if (effectivePicture.startsWith('data:image/')) {
      // Base64 Data URI
      try {
        final commaIdx = effectivePicture.indexOf(',');
        final base64Str = commaIdx != -1 ? effectivePicture.substring(commaIdx + 1) : effectivePicture;
        final bytes = base64Decode(base64Str);
        content = Image.memory(
          bytes,
          width: size,
          height: size,
          fit: BoxFit.cover,
          errorBuilder: (_, __, ___) => fallbackWidget,
        );
      } catch (_) {
        content = fallbackWidget;
      }
    } else {
      // Remote Network Image (Cloudinary or any URL)
      content = Image.network(
        effectivePicture,
        width: size,
        height: size,
        fit: BoxFit.cover,
        errorBuilder: (_, __, ___) => fallbackWidget,
      );
    }

    final effectiveRadius = shape == BoxShape.circle
        ? BorderRadius.circular(radius)
        : (borderRadius ?? BorderRadius.circular(8));

    return Container(
      width: size,
      height: size,
      decoration: BoxDecoration(
        shape: shape,
        borderRadius: shape == BoxShape.rectangle ? effectiveRadius : null,
        border: border,
      ),
      child: ClipRRect(
        borderRadius: effectiveRadius,
        child: content,
      ),
    );
  }
}
