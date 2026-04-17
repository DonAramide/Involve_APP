import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import '../bloc/lesson_note_bloc.dart';
import '../../data/services/lesson_note_sync_service.dart';
import '../../domain/entities/lesson_note_models.dart';
import 'generate_lesson_wizard_page.dart';
import 'lesson_note_viewer_page.dart';

class LessonNotesListPage extends StatefulWidget {
  const LessonNotesListPage({super.key});

  @override
  State<LessonNotesListPage> createState() => _LessonNotesListPageState();
}

class _LessonNotesListPageState extends State<LessonNotesListPage> {
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _loadInitial();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _loadInitial() {
    context.read<LessonNoteBloc>().add(const LoadLessonNotes(refresh: true));
  }

  void _onScroll() {
    if (_isBottom) {
      context.read<LessonNoteBloc>().add(LoadMoreLessons());
    }
  }

  bool get _isBottom {
    if (!_scrollController.hasClients) return false;
    final maxScroll = _scrollController.position.maxScrollExtent;
    final currentScroll = _scrollController.offset;
    return currentScroll >= (maxScroll * 0.9);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Lesson Notes'),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            onPressed: () {
              // Trigger sync manually
              RepositoryProvider.of<LessonNoteSyncService>(context).sync().then((_) {
                _loadInitial();
              });
            },
          ),
        ],
      ),
      body: BlocBuilder<LessonNoteBloc, LessonNoteState>(
        builder: (context, state) {
          if (state.isLoading && state.lessons.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (state.error != null && state.lessons.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text(state.error!),
                  ElevatedButton(
                    onPressed: _loadInitial,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          if (state.lessons.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.note_alt_outlined, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text('No lesson notes found.', style: TextStyle(color: Colors.grey)),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () => _navigateToWizard(context),
                    icon: const Icon(Icons.add),
                    label: const Text('Generate New Lesson'),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () async {
              _loadInitial();
            },
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: state.hasReachedMax ? state.lessons.length : state.lessons.length + 1,
              itemBuilder: (context, index) {
                if (index >= state.lessons.length) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.symmetric(vertical: 16),
                      child: SizedBox(
                        width: 24,
                        height: 24,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      ),
                    ),
                  );
                }
                final note = state.lessons[index];
                return _buildLessonCard(context, note);
              },
            ),
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _navigateToWizard(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildLessonCard(BuildContext context, LessonNote note) {
    return Card(
      elevation: 2,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: CircleAvatar(
          backgroundColor: Theme.of(context).primaryColor.withOpacity(0.1),
          child: Icon(Icons.book, color: Theme.of(context).primaryColor),
        ),
        title: Text(
          note.topic,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text('${note.className} • ${note.subjectName}'),
            Text('Term: ${note.term} • Week: ${note.week}'),
            const SizedBox(height: 4),
            Row(
              children: [
                if (note.isAiGenerated)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: Colors.purple.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: const Text(
                      'AI',
                      style: TextStyle(fontSize: 10, color: Colors.purple, fontWeight: FontWeight.bold),
                    ),
                  ),
                if (note.isAiGenerated) const SizedBox(width: 8),
                Text(
                  'v${note.version}',
                  style: const TextStyle(fontSize: 12, color: Colors.grey),
                ),
                const SizedBox(width: 8),
                _buildSyncIcon(note.syncStatus),
                const Spacer(),
                Text(
                  note.createdAt != null ? DateFormat('MMM dd, yyyy').format(note.createdAt!) : '',
                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                ),
              ],
            ),
          ],
        ),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(
            builder: (_) => LessonNoteViewerPage(note: note),
          ),
        ),
      ),
    );
  }

  Widget _buildSyncIcon(SyncStatus status) {
    switch (status) {
      case SyncStatus.synced:
        return const Icon(Icons.cloud_done, size: 14, color: Colors.green);
      case SyncStatus.syncing:
        return const SizedBox(
          width: 12,
          height: 12,
          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.blue),
        );
      case SyncStatus.failed:
        return const Icon(Icons.cloud_off, size: 14, color: Colors.red);
      case SyncStatus.pending:
      default:
        return const Icon(Icons.cloud_upload_outlined, size: 14, color: Colors.orange);
    }
  }

  void _navigateToWizard(BuildContext context) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const GenerateLessonWizardPage()),
    );
  }
}
