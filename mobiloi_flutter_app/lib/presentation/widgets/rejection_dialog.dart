import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/constants/app_colors.dart';

class RejectionDialog extends StatefulWidget {
  final Function(String reason) onConfirm;

  const RejectionDialog({super.key, required this.onConfirm});

  @override
  State<RejectionDialog> createState() => _RejectionDialogState();
}

class _RejectionDialogState extends State<RejectionDialog> {
  final _controller = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isReasonValid = _controller.text.trim().isNotEmpty && _controller.text.trim().length <= 500;

    return AlertDialog(
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      title: Text(
        'Reject Leave Request',
        style: TextStyle(
          fontWeight: FontWeight.bold,
          color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
        ),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Please provide a reason for rejecting this leave application.',
            style: TextStyle(
              fontSize: 13,
              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _controller,
            maxLines: 3,
            inputFormatters: [LengthLimitingTextInputFormatter(500)],
            onChanged: (v) {
              setState(() {
                if (v.trim().isEmpty) {
                  _error = 'Rejection reason is required.';
                } else {
                  _error = null;
                }
              });
            },
            style: TextStyle(
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
            ),
            decoration: InputDecoration(
              hintText: 'Enter rejection reason...',
              errorText: _error,
              filled: true,
              fillColor: isDark ? AppColors.darkBackground : Colors.grey.shade50,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: Text(
            'Cancel',
            style: TextStyle(
              color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
            ),
          ),
        ),
        ElevatedButton(
          onPressed: isReasonValid
              ? () {
                  final text = _controller.text.trim();
                  Navigator.pop(context);
                  widget.onConfirm(text);
                }
              : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.redAccent,
            disabledBackgroundColor: isDark ? Colors.white10 : Colors.grey.shade300,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          child: Text(
            'Reject Request',
            style: TextStyle(
              color: isReasonValid
                  ? Colors.white
                  : (isDark ? Colors.white38 : Colors.grey.shade600),
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
      ],
    );
  }
}
