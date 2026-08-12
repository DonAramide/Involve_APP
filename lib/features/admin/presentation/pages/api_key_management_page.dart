// lib/features/admin/presentation/pages/api_key_management_page.dart
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../bloc/admin_bloc.dart';
import 'package:involve_app/core/widgets/invify_loading_indicator.dart';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:http/http.dart' as http;

class ApiKeyManagementPage extends StatefulWidget {
  const ApiKeyManagementPage({super.key});

  @override
  State<ApiKeyManagementPage> createState() => _ApiKeyManagementPageState();
}

class _ApiKeyManagementPageState extends State<ApiKeyManagementPage> {
  final _storage = const FlutterSecureStorage();
  final _ipController = TextEditingController();
  final _portController = TextEditingController();
  bool _isTesting = false;

  @override
  void initState() {
    super.initState();
    context.read<AdminBloc>().add(LoadApiKeys());
    _loadConnectionSettings();
  }

  Future<void> _loadConnectionSettings() async {
    final ip = await _storage.read(key: 'quasar_ip') ?? '';
    final port = await _storage.read(key: 'quasar_port') ?? '';
    if (mounted) {
      setState(() {
        _ipController.text = ip;
        _portController.text = port;
      });
    }
  }

  Future<void> _saveAndTestConnection() async {
    final ip = _ipController.text.trim();
    final port = _portController.text.trim();
    
    if (ip.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter an IP or URL')));
      return;
    }

    await _storage.write(key: 'quasar_ip', value: ip);
    await _storage.write(key: 'quasar_port', value: port);

    setState(() => _isTesting = true);
    
    try {
      final url = port.isNotEmpty ? 'http://$ip:$port' : (ip.startsWith('http') ? ip : 'https://$ip');
      final response = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 10));
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Connection Successful! (Status: ${response.statusCode})'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Connection Failed: Unreachable'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isTesting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Quasar Settings & Keys')),
      body: BlocBuilder<AdminBloc, AdminState>(
        builder: (context, state) {
          if (state.isLoading) return const InvifyLoadingIndicator(message: 'FETCHING SECURE CREDENTIALS...');

          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Quasar Server Connection', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Configure the Quasar server IP and port to maintain connectivity.'),
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              flex: 2,
                              child: TextField(
                                controller: _ipController,
                                decoration: const InputDecoration(labelText: 'IP / URL Address', hintText: 'e.g. 192.168.1.100', border: OutlineInputBorder()),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              flex: 1,
                              child: TextField(
                                controller: _portController,
                                decoration: const InputDecoration(labelText: 'Port (Optional)', hintText: 'e.g. 4000', border: OutlineInputBorder()),
                                keyboardType: TextInputType.number,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            icon: _isTesting ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.network_check),
                            label: Text(_isTesting ? 'Testing Connection...' : 'Save & Test Connection'),
                            onPressed: _isTesting ? null : _saveAndTestConnection,
                            style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 12)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                const Text('API Keys', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
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
                ),
              ],
            ),
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
