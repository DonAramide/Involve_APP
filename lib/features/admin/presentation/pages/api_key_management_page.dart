// lib/features/admin/presentation/pages/api_key_management_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/admin_bloc.dart';

class ApiKeyManagementPage extends StatefulWidget {
  const ApiKeyManagementPage({super.key});

  @override
  State<ApiKeyManagementPage> createState() => _ApiKeyManagementPageState();
}

class _ApiKeyManagementPageState extends State<ApiKeyManagementPage> {
  @override
  void initState() {
    super.initState();
    context.read<AdminBloc>().add(LoadApiKeys());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Quaser API Keys')),
      body: BlocBuilder<AdminBloc, AdminState>(
        builder: (context, state) {
          if (state.isLoading) return const Center(child: CircularProgressIndicator());

          return ListView.separated(
            padding: const EdgeInsets.all(20),
            itemCount: state.apiKeys.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final key = state.apiKeys[index];
              return _KeyCard(
                label: key['label'] ?? 'API Key',
                prefix: key['prefix'] ?? 'key_...',
                maskedValue: key['masked'] ?? '************',
                createdAt: key['createdAt'] ?? '',
                onRevoke: () => _confirmRevoke(context, key['id']),
              );
            },
          );
        },
      ),
      floatingActionButton: BlocBuilder<AdminBloc, AdminState>(
        builder: (context, state) {
          return FloatingActionButton.extended(
            onPressed: state.isMasterMode ? () => _showCreateDialog(context) : null,
            icon: const Icon(Icons.add),
            label: const Text('NEW KEY'),
            backgroundColor: state.isMasterMode ? Colors.orange : Colors.grey,
          );
        },
      ),
    );
  }

  void _showCreateDialog(BuildContext context) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (diagContext) => AlertDialog(
        title: const Text('Create New API Key'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(labelText: 'Key Label (e.g. Mobile App)'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(diagContext), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () {
              context.read<AdminBloc>().add(CreateApiKey(controller.text));
              Navigator.pop(diagContext);
            },
            child: const Text('CREATE'),
          ),
        ],
      ),
    );
  }

  void _confirmRevoke(BuildContext context, String id) {
    showDialog(
      context: context,
      builder: (diagContext) => AlertDialog(
        title: const Text('Revoke API Key?'),
        content: const Text('This will immediately invalidate the key. This action cannot be undone.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(diagContext), child: const Text('CANCEL')),
          ElevatedButton(
            onPressed: () {
              context.read<AdminBloc>().add(RevokeApiKey(id));
              Navigator.pop(diagContext);
            },
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red, foregroundColor: Colors.white),
            child: const Text('REVOKE'),
          ),
        ],
      ),
    );
  }
}

class _KeyCard extends StatelessWidget {
  final String label;
  final String prefix;
  final String maskedValue;
  final String createdAt;
  final VoidCallback onRevoke;

  const _KeyCard({required this.label, required this.prefix, required this.maskedValue, required this.createdAt, required this.onRevoke});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(label, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                IconButton(icon: const Icon(Icons.delete_outline, color: Colors.red), onPressed: onRevoke),
              ],
            ),
            const SizedBox(height: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.grey.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  const Icon(Icons.code, size: 16, color: Colors.grey),
                  const SizedBox(width: 8),
                  Text('$prefix$maskedValue', style: const TextStyle(fontFamily: 'monospace', fontSize: 12)),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Text('Created: $createdAt', style: const TextStyle(color: Colors.grey, fontSize: 12)),
          ],
        ),
      ),
    );
  }
}
