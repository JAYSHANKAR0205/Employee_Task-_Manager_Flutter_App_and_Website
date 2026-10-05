import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/app_navigation.dart';
import '../../../core/utils/validators.dart';
import '../../../data/models/task_model.dart';
import '../../providers/auth_provider.dart';
import '../../providers/task_provider.dart';
import '../../widgets/enterprise_bottom_nav_bar.dart';
import '../../widgets/custom_text_field.dart';
import '../../widgets/enterprise_blur_dialog.dart';
import '../../widgets/enterprise_floating_action_button.dart';
import '../../widgets/status_badge.dart';
import '../../widgets/view_action_button.dart';
import '../../widgets/assignee_picker_field.dart';
import '../../widgets/task_attachments_picker.dart';
import '../../../core/utils/file_downloader.dart';

class TaskListScreen extends ConsumerStatefulWidget {
  final String? initialStatusFilter;
  const TaskListScreen({super.key, this.initialStatusFilter});

  @override
  ConsumerState<TaskListScreen> createState() => _TaskListScreenState();
}

class _TaskListScreenState extends ConsumerState<TaskListScreen> {
  late String _statusFilter;
  String _priorityFilter = 'All';
  String _searchQuery = '';
  int _displayLimit = 10;
  late final ScrollController _scrollController;
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _statusFilter = _normalizeStatus(widget.initialStatusFilter);
    _scrollController = ScrollController()..addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      final tasks = ref.read(tasksProvider).value ?? [];
      final filtered = _filterTasks(tasks);
      if (_displayLimit < filtered.length) {
        setState(() {
          _displayLimit = (_displayLimit + 10).clamp(0, filtered.length);
        });
      }
    }
  }

  void _onSearchChanged(String query) {
    _debounceTimer?.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 300), () {
      if (mounted) {
        setState(() {
          _searchQuery = query.trim();
          _displayLimit = 10;
        });
      }
    });
  }

  @override
  void didUpdateWidget(covariant TaskListScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.initialStatusFilter != oldWidget.initialStatusFilter) {
      setState(() {
        _statusFilter = _normalizeStatus(widget.initialStatusFilter);
        _displayLimit = 10;
      });
    }
  }

  String _normalizeStatus(String? input) {
    if (input == null || input.isEmpty) return 'All';
    final lower = input.toLowerCase().trim();
    if (lower == 'completed') return 'Completed';
    if (lower == 'in progress' || lower == 'inprogress') return 'In Progress';
    if (lower == 'pending') return 'Pending';
    return 'All';
  }

  List<TaskModel> _filterTasks(List<TaskModel> tasks) {
    return tasks.where((task) {
      final matchesStatus = _statusFilter == 'All' ||
          task.status.toLowerCase() == _statusFilter.toLowerCase();
      final matchesPriority = _priorityFilter == 'All' ||
          task.priority.toLowerCase() == _priorityFilter.toLowerCase();
      final matchesSearch = _searchQuery.isEmpty ||
          task.title.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          task.description.toLowerCase().contains(_searchQuery.toLowerCase()) ||
          (task.assignedToName?.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false);
      return matchesStatus && matchesPriority && matchesSearch;
    }).toList();
  }

  void _openTaskModal([TaskModel? taskToEdit]) {
    EnterpriseBlurDialog.show(
      context: context,
      barrierDismissible: false,
      child: _TaskFormDialog(taskToEdit: taskToEdit),
    );
  }

  void _previewImage(BuildContext context, ImageProvider provider, String title) {
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

  String _formatFileSize(int? bytes) {
    if (bytes == null || bytes <= 0) return 'Cloud document';
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

  Future<void> _downloadSingleAttachment(BuildContext context, TaskModel task, TaskAttachment att) async {
    final repo = ref.read(taskRepositoryProvider);
    final url = repo.getAttachmentDownloadUrl(task.id, att.id);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Downloading ${att.fileName}...'),
        duration: const Duration(seconds: 2),
      ),
    );
    try {
      await FileDownloader.downloadFile(
        url: url,
        fileName: att.fileName,
      );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${att.fileName} downloaded successfully!'),
            backgroundColor: Colors.green.shade700,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to download ${att.fileName}: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  Future<void> _downloadAllAttachments(BuildContext context, TaskModel task) async {
    final repo = ref.read(taskRepositoryProvider);
    final url = repo.getAllAttachmentsDownloadUrl(task.id);
    final zipName = 'Task-${task.taskId ?? task.id}-Attachments.zip';
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Preparing and downloading $zipName...'),
        duration: const Duration(seconds: 3),
      ),
    );
    try {
      await FileDownloader.downloadFile(
        url: url,
        fileName: zipName,
      );
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('$zipName downloaded successfully!'),
            backgroundColor: Colors.green.shade700,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to download attachments ZIP: $e'),
            backgroundColor: Colors.redAccent,
          ),
        );
      }
    }
  }

  void _openViewTaskModal(TaskModel task) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final priorityColor = task.priority.toLowerCase() == 'high'
        ? Colors.redAccent
        : task.priority.toLowerCase() == 'medium'
            ? Colors.amber.shade800
            : Colors.blueAccent;

    EnterpriseBlurDialog.show(
      context: context,
      child: Dialog(
        backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            maxWidth: 550,
            maxHeight: MediaQuery.of(context).size.height * 0.82,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Pinned Header ──
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 20, 8, 0),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.blue.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '#${task.taskId ?? 5001}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: Colors.blue,
                              ),
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            task.title,
                            softWrap: true,
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                            ),
                          ),
                        ],
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, size: 20),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 20),
                child: Divider(height: 16),
              ),

              // ── Scrollable Body ──
              Flexible(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.fromLTRB(20, 0, 20, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          StatusBadge(status: task.status),
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: priorityColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${task.priority} Priority',
                              style: TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.bold,
                                color: priorityColor,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'DESCRIPTION',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.5),
                      ),
                      const SizedBox(height: 6),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isDark ? AppColors.darkBackground : Colors.grey.shade50,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: isDark ? AppColors.darkCardBorder : Colors.grey.shade200),
                        ),
                        child: Text(
                          task.description.isNotEmpty ? task.description : 'No description provided.',
                          style: TextStyle(
                            fontSize: 13,
                            height: 1.4,
                            color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextPrimary,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.darkBackground : Colors.grey.shade50,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: isDark ? AppColors.darkCardBorder : Colors.grey.shade200),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Row(
                                    children: [
                                      Icon(Icons.person_outline, size: 14, color: Colors.blue),
                                      SizedBox(width: 4),
                                      Text('ASSIGNEE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    task.assignedToName ?? 'Unassigned',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.darkBackground : Colors.grey.shade50,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: isDark ? AppColors.darkCardBorder : Colors.grey.shade200),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Row(
                                    children: [
                                      Icon(Icons.calendar_today_outlined, size: 14, color: Colors.amber),
                                      SizedBox(width: 4),
                                      Text('DUE DATE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    task.dueDate != null ? DateFormat('MMM dd, yyyy').format(task.dueDate!) : 'No due date',
                                    style: TextStyle(
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (task.attachments.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'ATTACHMENTS (${task.attachments.length})',
                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 0.5),
                            ),
                            if (task.attachments.length > 1)
                              OutlinedButton.icon(
                                onPressed: () => _downloadAllAttachments(context, task),
                                icon: const Icon(Icons.archive_outlined, size: 14),
                                label: const Text('Download All (ZIP)', style: TextStyle(fontSize: 11)),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  visualDensity: VisualDensity.compact,
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),

                        // Images
                        if (task.attachments.any((a) => a.isImage)) ...[
                          const Text(
                            'IMAGES',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
                          ),
                          const SizedBox(height: 6),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: task.attachments.where((a) => a.isImage).map((att) {
                              return Stack(
                                children: [
                                  GestureDetector(
                                    onTap: () => _previewImage(context, NetworkImage(att.fileUrl), att.fileName),
                                    child: Container(
                                      width: 74,
                                      height: 74,
                                      decoration: BoxDecoration(
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: isDark ? AppColors.darkCardBorder : Colors.grey.shade300),
                                        image: DecorationImage(
                                          image: NetworkImage(att.fileUrl),
                                          fit: BoxFit.cover,
                                        ),
                                      ),
                                    ),
                                  ),
                                  Positioned(
                                    bottom: 2,
                                    right: 2,
                                    child: GestureDetector(
                                      onTap: () => _downloadSingleAttachment(context, task, att),
                                      child: Container(
                                        padding: const EdgeInsets.all(3),
                                        decoration: BoxDecoration(
                                          color: Colors.black.withOpacity(0.7),
                                          shape: BoxShape.circle,
                                        ),
                                        child: const Icon(Icons.download, size: 14, color: Colors.white),
                                      ),
                                    ),
                                  ),
                                ],
                              );
                            }).toList(),
                          ),
                          const SizedBox(height: 12),
                        ],

                        // Documents
                        if (task.attachments.any((a) => !a.isImage)) ...[
                          const Text(
                            'DOCUMENTS',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey),
                          ),
                          const SizedBox(height: 6),
                          ...task.attachments.where((a) => !a.isImage).map((att) {
                            final docColor = _getDocumentColor(att.fileName);
                            return Container(
                              margin: const EdgeInsets.only(bottom: 6),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                              decoration: BoxDecoration(
                                color: isDark ? AppColors.darkBackground : Colors.grey.shade50,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(color: isDark ? AppColors.darkCardBorder : Colors.grey.shade200),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(6),
                                    decoration: BoxDecoration(
                                      color: docColor.withOpacity(0.12),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Icon(_getDocumentIcon(att.fileName), size: 18, color: docColor),
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          att.fileName,
                                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                          overflow: TextOverflow.ellipsis,
                                          maxLines: 1,
                                        ),
                                        Text(
                                          _formatFileSize(att.fileSize),
                                          style: const TextStyle(fontSize: 10, color: Colors.grey),
                                        ),
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.download_rounded, size: 18, color: Colors.blueAccent),
                                    tooltip: 'Download document',
                                    visualDensity: VisualDensity.compact,
                                    padding: EdgeInsets.zero,
                                    constraints: const BoxConstraints(minWidth: 28, minHeight: 28),
                                    onPressed: () => _downloadSingleAttachment(context, task, att),
                                  ),
                                ],
                              ),
                            );
                          }),
                        ],
                      ],
                      const SizedBox(height: 8),
                    ],
                  ),
                ),
              ),

              // ── Pinned Footer ──
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
                child: Align(
                  alignment: Alignment.centerRight,
                  child: TextButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Close', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmDelete(TaskModel task) {
    EnterpriseBlurDialog.show(
      context: context,
      barrierDismissible: true,
      child: AlertDialog(
        title: const Text('Delete Task'),
        content: Text('Are you sure you want to delete "${task.title}"? This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
            onPressed: () async {
              Navigator.pop(context);
              await ref.read(taskActionsProvider.notifier).deleteTask(task.id);
            },
            child: const Text('Delete', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final tasksAsync = ref.watch(tasksProvider);
    final authState = ref.watch(authProvider);
    final isAdmin = authState.user?.isAdmin ?? false;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final allTasks = tasksAsync.value ?? [];
    final filteredTasks = _filterTasks(allTasks);
    final displayedTasks = filteredTasks.take(_displayLimit).toList();
    final hasMore = displayedTasks.length < filteredTasks.length;

    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) return;
        AppNavigation.go(context, '/dashboard', extra: const {'isBack': true});
      },
      child: Scaffold(
        backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
        appBar: AppBar(
          backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
          elevation: 0,
          automaticallyImplyLeading: false,
          title: Text(
            'Tasks Portal',
            style: TextStyle(
              color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        floatingActionButton: isAdmin
            ? EnterpriseFloatingActionButton(
                onPressed: () => _openTaskModal(),
                tooltip: 'Add Task',
              )
            : null,
        bottomNavigationBar: const EnterpriseBottomNavBar(currentRoute: '/tasks'),
        body: RefreshIndicator(
          onRefresh: () async => ref.refresh(tasksProvider),
          child: Column(
            children: [
              // Toolbar (Search + Filters)
              Container(
                padding: const EdgeInsets.all(16),
                color: isDark ? AppColors.darkSurface : Colors.white,
                child: Column(
                  children: [
                    // Search TextField
                    TextField(
                      onChanged: _onSearchChanged,
                      decoration: InputDecoration(
                        hintText: 'Search tasks by title, description or assignee...',
                        prefixIcon: const Icon(Icons.search, size: 20),
                        filled: true,
                        fillColor: isDark ? AppColors.darkBackground : Colors.grey.shade100,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                      ),
                    ),
                    const SizedBox(height: 10),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: _statusFilter,
                            decoration: const InputDecoration(
                              labelText: 'Status',
                              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            ),
                            items: ['All', 'Pending', 'In Progress', 'Completed'].map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
                            onChanged: (v) {
                              if (v != null) {
                                setState(() {
                                  _statusFilter = v;
                                  _displayLimit = 10;
                                });
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            value: _priorityFilter,
                            decoration: const InputDecoration(
                              labelText: 'Priority',
                              contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            ),
                            items: ['All', 'High', 'Medium', 'Low'].map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
                            onChanged: (v) {
                              if (v != null) {
                                setState(() {
                                  _priorityFilter = v;
                                  _displayLimit = 10;
                                });
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),


              Expanded(
                child: tasksAsync.when(
                  data: (_) {
                    if (filteredTasks.isEmpty) {
                      return Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const Icon(Icons.assignment_outlined, size: 48, color: Colors.grey),
                            const SizedBox(height: 12),
                            Text(
                              'No matching tasks found.',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                              ),
                            ),
                          ],
                        ),
                      );
                    }

                    final itemCount = displayedTasks.length + (hasMore ? 1 : 0);
                    return ListView.separated(
                      controller: _scrollController,
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                      itemCount: itemCount,
                      separatorBuilder: (context, index) => const SizedBox(height: 12),
                      itemBuilder: (context, i) {
                        if (i == displayedTasks.length) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 16),
                            child: Center(
                              child: SizedBox(
                                width: 24,
                                height: 24,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2.5,
                                  valueColor: AlwaysStoppedAnimation<Color>(AppColors.primaryPink),
                                ),
                              ),
                            ),
                          );
                        }
                        final task = displayedTasks[i];
                        return _buildTaskTile(context, task, isAdmin);
                      },
                    );
                  },
                  loading: () => const Center(child: CircularProgressIndicator()),
                  error: (err, _) => Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text('Error loading tasks: $err', style: const TextStyle(color: Colors.redAccent)),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: () => ref.refresh(tasksProvider),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTaskTile(BuildContext context, TaskModel task, bool isAdmin) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isHigh = task.priority.toLowerCase() == 'high';
    final isMedium = task.priority.toLowerCase() == 'medium';
    final priorityColor = isHigh ? Colors.redAccent : (isMedium ? Colors.amber.shade800 : Colors.blueAccent);

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? AppColors.darkSurface : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isDark ? AppColors.darkCardBorder : AppColors.lightCardBorder,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Text(
                  task.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: priorityColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '${task.priority} Priority',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: priorityColor,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  StatusBadge(status: task.status),
                ],
              ),
            ],
          ),
          if (task.description.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              task.description,
              maxLines: 4,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 13,
                color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
              ),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              if (task.assignedToName != null && task.assignedToName!.isNotEmpty)
                Expanded(
                  child: Text(
                    'Assigned to: ${task.assignedToName}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                    ),
                  ),
                )
              else
                const Text('Unassigned', style: TextStyle(fontSize: 12, color: Colors.grey)),
              if (task.dueDate != null) ...[
                const SizedBox(width: 8),
                Text(
                  'Due: ${DateFormat('MMM dd, yyyy').format(task.dueDate!)}',
                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                ),
              ],
            ],
          ),
          const Divider(height: 20),

          // Actions Row (View Details, Update Status, Edit/Delete Dropdown)
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Reusable View Action Button
              ViewActionButton(
                onPressed: () => _openViewTaskModal(task),
                tooltip: 'View task details',
              ),

              Row(
                children: [
                  // Status Quick Dropdown (Employees ONLY - Admin cannot change status)
                  if (!isAdmin) ...[
                    const Text('Status: ', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                    DropdownButton<String>(
                      value: task.status,
                      underline: const SizedBox(),
                      items: ['Pending', 'In Progress', 'Completed']
                          .map((s) => DropdownMenuItem(value: s, child: Text(s, style: const TextStyle(fontSize: 12))))
                          .toList(),
                      onChanged: (newStatus) async {
                        if (newStatus != null && newStatus != task.status) {
                          await ref.read(taskActionsProvider.notifier).updateTaskStatus(task.id, newStatus);
                        }
                      },
                    ),
                  ],

                  // Three-Dot Menu (Admin ONLY for Edit / Delete)
                  if (isAdmin)
                    PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert, size: 20, color: Colors.grey),
                      tooltip: 'More actions',
                      onSelected: (val) {
                        if (val == 'edit') {
                          _openTaskModal(task);
                        } else if (val == 'delete') {
                          _confirmDelete(task);
                        }
                      },
                      itemBuilder: (ctx) => [
                        const PopupMenuItem(
                          value: 'edit',
                          child: Row(
                            children: [
                              Icon(Icons.edit_outlined, size: 16, color: Colors.blueAccent),
                              SizedBox(width: 8),
                              Text('Edit Task', style: TextStyle(fontSize: 13)),
                            ],
                          ),
                        ),
                        const PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Icon(Icons.delete_outline, size: 16, color: Colors.redAccent),
                              SizedBox(width: 8),
                              Text('Delete Task', style: TextStyle(fontSize: 13, color: Colors.redAccent)),
                            ],
                          ),
                        ),
                      ],
                    ),
                ],
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _TaskFormDialog extends ConsumerStatefulWidget {
  final TaskModel? taskToEdit;
  const _TaskFormDialog({this.taskToEdit});

  @override
  ConsumerState<_TaskFormDialog> createState() => _TaskFormDialogState();
}

class _TaskFormDialogState extends ConsumerState<_TaskFormDialog> {
  late final TextEditingController _titleCtrl;
  late final TextEditingController _descCtrl;
  late String _priority;
  late String _status;
  String? _assignedToId;
  DateTime? _dueDate;
  List<PickedAttachment> _newAttachmentFiles = [];
  List<String> _removedAttachmentIds = [];
  String? _modalError;
  String? _assigneeError;
  String? _titleError;
  String? _descError;
  bool _isSubmitting = false;

  bool get _isTaskFormValid {
    final isTitleOk = _titleCtrl.text.trim().isNotEmpty && Validators.validateTaskTitle(_titleCtrl.text) == null;
    final isDescOk = _descCtrl.text.trim().isNotEmpty && Validators.validateTaskDescription(_descCtrl.text) == null;
    final isAssigneeOk = _assignedToId != null && _assignedToId!.isNotEmpty;
    final isDateOk = _dueDate != null && Validators.validateTaskDueDate(_dueDate) == null;
    return isTitleOk && isDescOk && isAssigneeOk && isDateOk;
  }

  @override
  void initState() {
    super.initState();
    _titleCtrl = TextEditingController(text: widget.taskToEdit?.title ?? '');
    _descCtrl = TextEditingController(text: widget.taskToEdit?.description ?? '');
    _priority = widget.taskToEdit?.priority ?? 'Medium';
    _status = widget.taskToEdit?.status ?? 'Pending';
    _assignedToId = widget.taskToEdit?.assignedToId;
    _dueDate = widget.taskToEdit?.dueDate;
  }

  @override
  void dispose() {
    _titleCtrl.dispose();
    _descCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final titleError = Validators.validateTaskTitle(_titleCtrl.text);
    if (titleError != null) {
      setState(() => _modalError = titleError);
      return;
    }

    final descError = Validators.validateTaskDescription(_descCtrl.text);
    if (descError != null) {
      setState(() => _modalError = descError);
      return;
    }

    // Assignee validation: Required when creating task
    final assigneeError = Validators.validateTaskAssignee(_assignedToId);
    if (assigneeError != null) {
      setState(() {
        _assigneeError = assigneeError;
        _modalError = assigneeError;
      });
      return;
    }

    final dateError = Validators.validateTaskDueDate(_dueDate);
    if (dateError != null) {
      setState(() => _modalError = dateError);
      return;
    }

    setState(() {
      _isSubmitting = true;
      _modalError = null;
      _assigneeError = null;
    });

    try {
      if (widget.taskToEdit == null) {
        final success = await ref.read(taskActionsProvider.notifier).createTask(
              title: _titleCtrl.text.trim(),
              description: _descCtrl.text.trim(),
              priority: _priority,
              assignedTo: _assignedToId,
              dueDate: _dueDate,
              attachmentFiles: _newAttachmentFiles,
            );
        if (!mounted) return;
        if (success) {
          Navigator.pop(context);
        } else {
          final err = ref.read(taskActionsProvider).error?.toString() ?? 'Failed to create task';
          setState(() {
            _isSubmitting = false;
            _modalError = err;
          });
        }
      } else {
        final updatePayload = <String, dynamic>{
          'title': _titleCtrl.text.trim(),
          'description': _descCtrl.text.trim(),
          'priority': _priority,
          'status': _status,
        };
        if (_assignedToId != null) {
          updatePayload['assignedTo'] = _assignedToId;
        }
        if (_dueDate != null) {
          updatePayload['dueDate'] = _dueDate!.toIso8601String();
        }

        final existingIds = (widget.taskToEdit?.attachments ?? [])
            .map((a) => a.id)
            .where((id) => id.isNotEmpty && !_removedAttachmentIds.contains(id))
            .toList();

        final success = await ref.read(taskActionsProvider.notifier).updateTask(
              widget.taskToEdit!.id,
              updatePayload,
              newAttachmentFiles: _newAttachmentFiles,
              retainedAttachmentIds: existingIds,
            );
        if (!mounted) return;
        if (success) {
          Navigator.pop(context);
        } else {
          final err = ref.read(taskActionsProvider).error?.toString() ?? 'Failed to update task';
          setState(() {
            _isSubmitting = false;
            _modalError = err;
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _modalError = e.toString();
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isEdit = widget.taskToEdit != null;
    final isAdmin = ref.read(authProvider).user?.isAdmin ?? false;

    return AlertDialog(
      backgroundColor: isDark ? AppColors.darkSurface : Colors.white,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      title: Text(
        isEdit ? 'Edit Task' : 'Create New Task',
        style: TextStyle(
          fontWeight: FontWeight.bold,
          color: isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary,
        ),
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (_modalError != null) ...[
              Container(
                padding: const EdgeInsets.all(10),
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: Colors.red.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade300),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, color: Colors.red, size: 18),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _modalError!,
                        style: const TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            CustomTextField(
              label: 'Task Title *',
              hint: 'e.g. Update API docs',
              controller: _titleCtrl,
              errorText: _titleError,
              validator: Validators.validateTaskTitle,
              inputFormatters: [LengthLimitingTextInputFormatter(100)],
              onChanged: (v) {
                setState(() {
                  _titleError = Validators.validateTaskTitle(v);
                  if (_modalError != null) _modalError = null;
                });
              },
            ),
            Align(
              alignment: Alignment.centerRight,
              child: Text(
                '${_titleCtrl.text.length}/100',
                style: const TextStyle(fontSize: 10, color: Colors.grey),
              ),
            ),
            const SizedBox(height: 8),
            CustomTextField(
              label: 'Description *',
              hint: 'Enter task details...',
              controller: _descCtrl,
              maxLines: 3,
              errorText: _descError,
              validator: Validators.validateTaskDescription,
              inputFormatters: [LengthLimitingTextInputFormatter(300)],
              onChanged: (v) {
                setState(() {
                  _descError = Validators.validateTaskDescription(v);
                  if (_modalError != null) _modalError = null;
                });
              },
            ),
            Align(
              alignment: Alignment.centerRight,
              child: Text(
                '${_descCtrl.text.length}/300',
                style: const TextStyle(fontSize: 10, color: Colors.grey),
              ),
            ),
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              value: _priority,
              decoration: const InputDecoration(labelText: 'Priority'),
              items: ['Low', 'Medium', 'High']
                  .map((p) => DropdownMenuItem(value: p, child: Text('$p Priority')))
                  .toList(),
              onChanged: (v) {
                if (v != null) setState(() => _priority = v);
              },
            ),
            const SizedBox(height: 12),

            // Status (Only if non-admin is editing)
            if (isEdit && !isAdmin) ...[
              DropdownButtonFormField<String>(
                value: _status,
                decoration: const InputDecoration(labelText: 'Status'),
                items: ['Pending', 'In Progress', 'Completed']
                    .map((s) => DropdownMenuItem(value: s, child: Text(s)))
                    .toList(),
                onChanged: (v) {
                  if (v != null) setState(() => _status = v);
                },
              ),
              const SizedBox(height: 12),
            ],

            // ── ASSIGNEE SELECTION FIELD ──
            AssigneePickerField(
              selectedUserId: _assignedToId,
              errorMessage: _assigneeError,
              isRequired: true,
              onSelected: (user) {
                setState(() {
                  _assignedToId = user.id;
                  _assigneeError = null;
                  if (_modalError == 'Please select an assignee') {
                    _modalError = null;
                  }
                });
              },
            ),
            const SizedBox(height: 12),

            // Due Date
            ListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('Due Date *', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
              subtitle: Text(_dueDate != null ? DateFormat('yyyy-MM-dd').format(_dueDate!) : 'Not specified'),
              trailing: IconButton(
                icon: const Icon(Icons.calendar_today_outlined),
                onPressed: () async {
                  final now = DateTime.now();
                  final today = DateTime(now.year, now.month, now.day);
                  final picked = await showDatePicker(
                    context: context,
                    initialDate: _dueDate ?? today,
                    firstDate: today,
                    lastDate: today.add(const Duration(days: 365)),
                  );
                  if (picked != null) {
                    setState(() {
                      _dueDate = picked;
                      if (_modalError != null) _modalError = null;
                    });
                  }
                },
              ),
            ),
            const SizedBox(height: 12),

            TaskAttachmentsPicker(
              existingAttachments: widget.taskToEdit?.attachments ?? const [],
              initialNewFiles: _newAttachmentFiles,
              isSubmitting: _isSubmitting,
              onNewFilesChanged: (files) => _newAttachmentFiles = files,
              onRemovedAttachmentIdsChanged: (ids) => _removedAttachmentIds = ids,
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isSubmitting ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          style: ElevatedButton.styleFrom(
            backgroundColor: AppColors.primaryPink,
            disabledBackgroundColor: isDark ? Colors.white10 : Colors.grey.shade300,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
          ),
          onPressed: (!_isTaskFormValid || _isSubmitting) ? null : _submit,
          child: _isSubmitting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : Text(
                  isEdit ? 'Save Changes' : 'Create',
                  style: TextStyle(
                    color: (!_isTaskFormValid || _isSubmitting)
                        ? (isDark ? Colors.white38 : Colors.grey.shade600)
                        : Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
        ),
      ],
    );
  }
}
