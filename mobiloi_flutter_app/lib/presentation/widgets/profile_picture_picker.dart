import 'dart:convert';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../../core/constants/app_colors.dart';

class ProfilePicturePicker extends StatefulWidget {
  final String? initialImageUrl;
  final Uint8List? initialBytes;
  final ValueChanged<ProfileImageData>? onImagePicked;
  final VoidCallback? onImageRemoved;
  final bool isLoading;
  final double radius;
  final String? label;
  final bool isHorizontal;

  const ProfilePicturePicker({
    super.key,
    this.initialImageUrl,
    this.initialBytes,
    this.onImagePicked,
    this.onImageRemoved,
    this.isLoading = false,
    this.radius = 46,
    this.label,
    this.isHorizontal = false,
  });

  @override
  State<ProfilePicturePicker> createState() => _ProfilePicturePickerState();
}

class ProfileImageData {
  final Uint8List bytes;
  final String fileName;
  final String extension;
  final String dataUrl;

  const ProfileImageData({
    required this.bytes,
    required this.fileName,
    required this.extension,
    required this.dataUrl,
  });
}

class _ProfilePicturePickerState extends State<ProfilePicturePicker> {
  Uint8List? _pickedBytes;
  String? _pickedDataUrl;
  bool _isMarkedRemoved = false;
  bool _isPicking = false;

  static const List<String> _allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
  static const int _maxFileSizeBytes = 5 * 1024 * 1024; // 5MB

  @override
  void didUpdateWidget(covariant ProfilePicturePicker oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.initialImageUrl != widget.initialImageUrl ||
        oldWidget.initialBytes != widget.initialBytes) {
      if (widget.initialBytes != null) {
        _pickedBytes = widget.initialBytes;
        _isMarkedRemoved = false;
      } else if (widget.initialImageUrl != null && widget.initialImageUrl!.isNotEmpty) {
        _isMarkedRemoved = false;
      }
    }
  }

  bool get _hasImage {
    if (_isMarkedRemoved) return false;
    if (_pickedBytes != null) return true;
    if (_pickedDataUrl != null && _pickedDataUrl!.isNotEmpty) return true;
    if (widget.initialBytes != null) return true;
    return widget.initialImageUrl != null && widget.initialImageUrl!.trim().isNotEmpty;
  }

  ImageProvider? _resolveImageProvider() {
    if (_isMarkedRemoved) return null;
    if (_pickedBytes != null) {
      return MemoryImage(_pickedBytes!);
    }
    if (widget.initialBytes != null) {
      return MemoryImage(widget.initialBytes!);
    }
    final url = _pickedDataUrl ?? widget.initialImageUrl;
    if (url == null || url.trim().isEmpty) return null;

    final trimmed = url.trim();
    if (trimmed.startsWith('data:image/')) {
      try {
        final commaIdx = trimmed.indexOf(',');
        if (commaIdx != -1) {
          final base64Str = trimmed.substring(commaIdx + 1);
          return MemoryImage(base64Decode(base64Str));
        }
      } catch (_) {
        return null;
      }
    } else if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return NetworkImage(trimmed);
    }
    return null;
  }

  Future<void> _pickImage() async {
    if (_isPicking || widget.isLoading) return;
    setState(() => _isPicking = true);

    try {
      final file = await FilePicker.pickFile(
        type: FileType.image,
      );

      if (file == null) {
        if (mounted) setState(() => _isPicking = false);
        return;
      }

      final ext = (file.extension ?? 'png').toLowerCase();

      if (!_allowedExtensions.contains(ext)) {
        _showError('Unsupported format. Please select a JPG, JPEG, PNG, or WEBP image.');
        if (mounted) setState(() => _isPicking = false);
        return;
      }

      final bytes = await file.readAsBytes();
      if (bytes.isEmpty) {
        _showError('Could not read image file data. Please choose another image.');
        if (mounted) setState(() => _isPicking = false);
        return;
      }

      if (bytes.length > _maxFileSizeBytes) {
        _showError('Image size exceeds 5MB. Please choose a smaller image.');
        if (mounted) setState(() => _isPicking = false);
        return;
      }

      final base64Str = base64Encode(bytes);
      final mimeSubtype = ext == 'jpg' ? 'jpeg' : ext;
      final dataUrl = 'data:image/$mimeSubtype;base64,$base64Str';

      setState(() {
        _pickedBytes = bytes;
        _pickedDataUrl = dataUrl;
        _isMarkedRemoved = false;
        _isPicking = false;
      });

      widget.onImagePicked?.call(
        ProfileImageData(
          bytes: bytes,
          fileName: file.name,
          extension: ext,
          dataUrl: dataUrl,
        ),
      );
    } catch (e) {
      if (mounted) {
        setState(() => _isPicking = false);
        _showError('Failed to select image: $e');
      }
    }
  }

  void _removeImage() {
    setState(() {
      _pickedBytes = null;
      _pickedDataUrl = null;
      _isMarkedRemoved = true;
    });

    widget.onImageRemoved?.call();
  }

  void _showError(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).hideCurrentSnackBar();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.redAccent,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final imageProvider = _resolveImageProvider();
    final hasImage = _hasImage && imageProvider != null;

    if (widget.isHorizontal) {
      return _buildHorizontalLayout(isDark, imageProvider, hasImage);
    }

    return _buildVerticalLayout(isDark, imageProvider, hasImage);
  }

  Widget _buildAvatar(bool isDark, ImageProvider? imageProvider, bool hasImage) {
    return GestureDetector(
      onTap: _pickImage,
      child: Stack(
        alignment: Alignment.center,
        children: [
          Container(
            width: widget.radius * 2,
            height: widget.radius * 2,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isDark ? AppColors.darkBackground : Colors.grey.shade200,
              border: Border.all(
                color: hasImage
                    ? AppColors.primaryPink
                    : (isDark ? AppColors.darkCardBorder : Colors.grey.shade300),
                width: 2,
              ),
              image: imageProvider != null
                  ? DecorationImage(
                      image: imageProvider,
                      fit: BoxFit.cover,
                    )
                  : null,
            ),
            child: !hasImage
                ? Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.camera_alt_outlined,
                        size: widget.radius * 0.55,
                        color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Upload',
                        style: TextStyle(
                          fontSize: widget.radius * 0.24,
                          fontWeight: FontWeight.bold,
                          color: isDark ? Colors.grey.shade400 : Colors.grey.shade600,
                        ),
                      ),
                    ],
                  )
                : null,
          ),
          if (_isPicking || widget.isLoading)
            Container(
              width: widget.radius * 2,
              height: widget.radius * 2,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: Colors.black.withOpacity(0.45),
              ),
              child: const Center(
                child: SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildVerticalLayout(bool isDark, ImageProvider? imageProvider, bool hasImage) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildAvatar(isDark, imageProvider, hasImage),
          const SizedBox(height: 8),
          if (hasImage) ...[
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                ElevatedButton.icon(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryPink,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                    elevation: 0,
                  ),
                  onPressed: (widget.isLoading || _isPicking) ? null : _pickImage,
                  icon: const Icon(Icons.camera_alt, size: 14),
                  label: const Text('Change', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
                const SizedBox(width: 8),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    foregroundColor: Colors.redAccent,
                    side: const BorderSide(color: Colors.redAccent),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                  ),
                  onPressed: (widget.isLoading || _isPicking) ? null : _removeImage,
                  icon: const Icon(Icons.delete_outline, size: 14),
                  label: const Text('Remove', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ] else ...[
            Text(
              'JPG, PNG, WEBP. Maximum size 5MB',
              style: TextStyle(
                fontSize: 11,
                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildHorizontalLayout(bool isDark, ImageProvider? imageProvider, bool hasImage) {
    return Row(
      children: [
        _buildAvatar(isDark, imageProvider, hasImage),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                widget.label ?? 'Profile Photo',
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                ),
              ),
              const SizedBox(height: 2),
              Text(
                'JPG, PNG, WEBP. Maximum size 5MB',
                style: TextStyle(
                  fontSize: 11,
                  color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                ),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryPink,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      elevation: 0,
                    ),
                    onPressed: (widget.isLoading || _isPicking) ? null : _pickImage,
                    icon: Icon(hasImage ? Icons.camera_alt : Icons.upload, size: 14),
                    label: Text(hasImage ? 'Change' : 'Upload Picture',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                  ),
                  if (hasImage) ...[
                    const SizedBox(width: 8),
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.redAccent,
                        side: const BorderSide(color: Colors.redAccent),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      ),
                      onPressed: (widget.isLoading || _isPicking) ? null : _removeImage,
                      icon: const Icon(Icons.delete_outline, size: 14),
                      label: const Text('Remove', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    ),
                  ],
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }
}
