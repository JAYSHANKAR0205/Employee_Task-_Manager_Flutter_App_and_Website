import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/models/task_model.dart';

class TaskAttachmentsPicker extends StatefulWidget {
  final List<TaskAttachment> existingAttachments;
  final List<PickedAttachment> initialNewFiles;
  final ValueChanged<List<PickedAttachment>>? onNewFilesChanged;
  final ValueChanged<List<String>>? onRemovedAttachmentIdsChanged;
  final bool isSubmitting;

  const TaskAttachmentsPicker({
    super.key,
    this.existingAttachments = const [],
    this.initialNewFiles = const [],
    this.onNewFilesChanged,
    this.onRemovedAttachmentIdsChanged,
    this.isSubmitting = false,
  });

  @override
  State<TaskAttachmentsPicker> createState() => _TaskAttachmentsPickerState();
}

class _TaskAttachmentsPickerState extends State<TaskAttachmentsPicker> {
  late List<TaskAttachment> _remainingExisting;
  late List<PickedAttachment> _newFiles;
  final Set<String> _removedIds = {};
  String? _validationError;

  static const List<String> _allowedImageExts = ['jpg', 'jpeg', 'png', 'webp'];
  static const List<String> _allowedDocExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
  static const int _maxFileSizeBytes = 10 * 1024 * 1024; // 10MB

  @override
  void initState() {
    super.initState();
    _remainingExisting = List.from(widget.existingAttachments);
    _newFiles = List.from(widget.initialNewFiles);
  }

  void _notifyChanges() {
    widget.onNewFilesChanged?.call(_newFiles);
    widget.onRemovedAttachmentIdsChanged?.call(_removedIds.toList());
  }

  String _formatFileSize(int bytes) {
    if (bytes <= 0) return '0 B';
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }

  IconData _getDocumentIcon(String fileName) {
    final lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) return Icons.picture_as_pdf;
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) return Icons.description;
    if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return Icons.table_chart;
    if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return Icons.slideshow;
    if (lower.endsWith('.txt')) return Icons.text_snippet;
    return Icons.insert_drive_file;
  }

  Color _getDocumentColor(String fileName) {
    final lower = fileName.toLowerCase();
    if (lower.endsWith('.pdf')) return Colors.red.shade700;
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) return Colors.blue.shade700;
    if (lower.endsWith('.xls') || lower.endsWith('.xlsx')) return Colors.green.shade700;
    if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return Colors.orange.shade800;
    return Colors.grey.shade700;
  }

  bool _isDuplicate(String name, int size) {
    // Check pending new files
    for (final file in _newFiles) {
      if (file.name.toLowerCase() == name.toLowerCase() && (file.size == size || size == 0)) {
        return true;
      }
    }
    // Check remaining existing attachments
    for (final att in _remainingExisting) {
      if (att.fileName.toLowerCase() == name.toLowerCase()) {
        return true;
      }
    }
    return false;
  }

  Future<void> _pickFiles({required bool isImages}) async {
    if (widget.isSubmitting) return;

    setState(() => _validationError = null);

    try {
      final List<String> extensions = isImages ? _allowedImageExts : _allowedDocExts;
      final result = await FilePicker.pickFiles(
        type: FileType.custom,
        allowedExtensions: extensions,
      );

      if (result.isEmpty) return;

      int addedCount = 0;
      int duplicateCount = 0;
      String? firstError;

      final updatedNew = List<PickedAttachment>.from(_newFiles);

      for (final file in result) {
        final ext = (file.extension ?? file.name.split('.').last).toLowerCase();

        // Validate extension
        if (!extensions.contains(ext)) {
          firstError ??= '${file.name} cannot be uploaded: unsupported format (.${ext.isEmpty ? 'unknown' : ext}).';
          continue;
        }

        final bytes = await file.readAsBytes();
        final fileSize = file.lengthSync() ?? bytes.length;

        // Validate size
        if (fileSize > _maxFileSizeBytes) {
          firstError ??= '${file.name} exceeds the 10MB limit (${_formatFileSize(fileSize)}).';
          continue;
        }

        // Check duplicates
        if (_isDuplicate(file.name, fileSize)) {
          duplicateCount++;
          continue;
        }

        updatedNew.add(PickedAttachment(
          name: file.name,
          bytes: bytes,
          size: fileSize,
          extension: ext,
        ));
        addedCount++;
      }

      setState(() {
        _newFiles = updatedNew;
        if (firstError != null) {
          _validationError = firstError;
        } else if (duplicateCount > 0 && addedCount == 0) {
          _validationError = 'Selected file(s) are already attached.';
        }
      });

      _notifyChanges();
    } catch (e) {
      setState(() => _validationError = 'Failed to select files: $e');
    }
  }

  void _removeExisting(int index) {
    if (widget.isSubmitting) return;
    setState(() {
      final removed = _remainingExisting.removeAt(index);
      if (removed.id.isNotEmpty) {
        _removedIds.add(removed.id);
      }
      _validationError = null;
    });
    _notifyChanges();
  }

  void _removeNewFile(int index) {
    if (widget.isSubmitting) return;
    setState(() {
      _newFiles.removeAt(index);
      _validationError = null;
    });
    _notifyChanges();
  }

  void _previewImage(ImageProvider provider, String title) {
    showDialog(
      context: context,
      builder: (ctx) => Dialog(
        backgroundColor: Colors.transparent,
        insetPadding: const EdgeInsets.all(16),
        child: Stack(
          alignment: Alignment.topRight,
          children: [
            Container(
              constraints: const BoxConstraints(maxWidth: 800, maxHeight: 600),
              decoration: BoxDecoration(
                color: Colors.black.withOpacity(0.9),
                borderRadius: BorderRadius.circular(16),
              ),
              padding: const EdgeInsets.all(12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8, right: 36),
                    child: Text(
                      title,
                      style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  Flexible(
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image(
                        image: provider,
                        fit: BoxFit.contain,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              icon: const Icon(Icons.close, color: Colors.white, size: 24),
              onPressed: () => Navigator.of(ctx).pop(),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    // Filter images and documents
    final existingImages = _remainingExisting.where((a) => a.isImage).toList();
    final existingDocs = _remainingExisting.where((a) => !a.isImage).toList();

    final newImages = _newFiles.where((f) => f.isImage).toList();
    final newDocs = _newFiles.where((f) => !f.isImage).toList();

    final totalImages = existingImages.length + newImages.length;
    final totalDocs = existingDocs.length + newDocs.length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Header & Action Buttons
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Attachments (${totalImages + totalDocs})',
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.bold,
                color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
              ),
            ),
            Wrap(
              spacing: 6,
              children: [
                OutlinedButton.icon(
                  onPressed: widget.isSubmitting ? null : () => _pickFiles(isImages: true),
                  icon: const Icon(Icons.photo_library_outlined, size: 15),
                  label: const Text('Add Images', style: TextStyle(fontSize: 11)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    visualDensity: VisualDensity.compact,
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: widget.isSubmitting ? null : () => _pickFiles(isImages: false),
                  icon: const Icon(Icons.note_add_outlined, size: 15),
                  label: const Text('Add Docs', style: TextStyle(fontSize: 11)),
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    visualDensity: VisualDensity.compact,
                  ),
                ),
              ],
            ),
          ],
        ),

        // Validation Error Banner
        if (_validationError != null) ...[
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.red.withOpacity(0.1),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.red.shade300),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline, size: 16, color: Colors.red),
                const SizedBox(width: 6),
                Expanded(
                  child: Text(
                    _validationError!,
                    style: const TextStyle(fontSize: 11, color: Colors.red, fontWeight: FontWeight.bold),
                  ),
                ),
                GestureDetector(
                  onTap: () => setState(() => _validationError = null),
                  child: const Icon(Icons.close, size: 14, color: Colors.red),
                ),
              ],
            ),
          ),
        ],

        // ── IMAGES SECTION ──
        if (totalImages > 0) ...[
          const SizedBox(height: 10),
          Text(
            'IMAGES ($totalImages)',
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.5),
          ),
          const SizedBox(height: 6),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              // Existing server images
              for (int i = 0; i < existingImages.length; i++) ...[
                _buildImageThumbnail(
                  imageProvider: NetworkImage(existingImages[i].fileUrl),
                  name: existingImages[i].fileName,
                  onRemove: () {
                    final originalIndex = _remainingExisting.indexOf(existingImages[i]);
                    if (originalIndex != -1) _removeExisting(originalIndex);
                  },
                ),
              ],
              // New local images
              for (int i = 0; i < newImages.length; i++) ...[
                _buildImageThumbnail(
                  imageProvider: MemoryImage(newImages[i].bytes),
                  name: newImages[i].name,
                  isNew: true,
                  onRemove: () {
                    final originalIndex = _newFiles.indexOf(newImages[i]);
                    if (originalIndex != -1) _removeNewFile(originalIndex);
                  },
                ),
              ],
            ],
          ),
        ],

        // ── DOCUMENTS SECTION ──
        if (totalDocs > 0) ...[
          const SizedBox(height: 12),
          Text(
            'DOCUMENTS ($totalDocs)',
            style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.5),
          ),
          const SizedBox(height: 6),
          // Existing server docs
          for (int i = 0; i < existingDocs.length; i++) ...[
            _buildDocumentTile(
              name: existingDocs[i].fileName,
              sizeText: existingDocs[i].fileSize != null ? _formatFileSize(existingDocs[i].fileSize!) : 'Cloud document',
              icon: _getDocumentIcon(existingDocs[i].fileName),
              color: _getDocumentColor(existingDocs[i].fileName),
              onRemove: () {
                final originalIndex = _remainingExisting.indexOf(existingDocs[i]);
                if (originalIndex != -1) _removeExisting(originalIndex);
              },
            ),
          ],
          // New local docs
          for (int i = 0; i < newDocs.length; i++) ...[
            _buildDocumentTile(
              name: newDocs[i].name,
              sizeText: _formatFileSize(newDocs[i].size),
              icon: _getDocumentIcon(newDocs[i].name),
              color: _getDocumentColor(newDocs[i].name),
              isNew: true,
              onRemove: () {
                final originalIndex = _newFiles.indexOf(newDocs[i]);
                if (originalIndex != -1) _removeNewFile(originalIndex);
              },
            ),
          ],
        ],

        if (totalImages == 0 && totalDocs == 0) ...[
          const SizedBox(height: 6),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
            decoration: BoxDecoration(
              color: isDark ? AppColors.darkBackground : Colors.grey.shade100,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: isDark ? AppColors.darkCardBorder : Colors.grey.shade300, style: BorderStyle.solid),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.attach_file, size: 16, color: Colors.grey.shade500),
                const SizedBox(width: 6),
                Text(
                  'No attachments selected yet',
                  style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildImageThumbnail({
    required ImageProvider imageProvider,
    required String name,
    required VoidCallback onRemove,
    bool isNew = false,
  }) {
    return Stack(
      children: [
        GestureDetector(
          onTap: () => _previewImage(imageProvider, name),
          child: Container(
            width: 74,
            height: 74,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: isNew ? Colors.blue.shade300 : Colors.grey.shade300, width: 1.5),
              image: DecorationImage(
                image: imageProvider,
                fit: BoxFit.cover,
              ),
            ),
          ),
        ),
        Positioned(
          top: 2,
          right: 2,
          child: GestureDetector(
            onTap: onRemove,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: Colors.redAccent.withOpacity(0.9),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.close, size: 13, color: Colors.white),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildDocumentTile({
    required String name,
    required String sizeText,
    required IconData icon,
    required Color color,
    required VoidCallback onRemove,
    bool isNew = false,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkBackground : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: isNew ? Colors.blue.withOpacity(0.3) : (isDark ? AppColors.darkCardBorder : Colors.grey.shade200)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  name,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 2),
                Text(
                  sizeText,
                  style: const TextStyle(fontSize: 10, color: Colors.grey),
                ),
              ],
            ),
          ),
          IconButton(
            icon: const Icon(Icons.delete_outline, size: 18, color: Colors.redAccent),
            visualDensity: VisualDensity.compact,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
            tooltip: 'Remove document',
            onPressed: onRemove,
          ),
        ],
      ),
    );
  }
}
