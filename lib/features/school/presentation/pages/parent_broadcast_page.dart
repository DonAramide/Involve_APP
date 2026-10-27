import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/core/services/service_locator.dart';
import 'package:involve_app/core/sync/domain/services/web_cloud_sync_service.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import 'package:involve_app/core/utils/app_config.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';

class ParentBroadcastPage extends StatefulWidget {
  const ParentBroadcastPage({super.key});

  @override
  State<ParentBroadcastPage> createState() => _ParentBroadcastPageState();
}

class _ParentBroadcastPageState extends State<ParentBroadcastPage> {
  final _subject = TextEditingController();
  final _message = TextEditingController();
  final _testEmail = TextEditingController();
  final _testPhone = TextEditingController();
  bool _email = true;
  bool _sms = false;
  bool _loading = true;
  bool _sending = false;
  bool _smsConfigured = false;
  int _parents = 0;
  int _emailCount = 0;
  int _smsCount = 0;
  String? _error;
  String? _result;

  FinanceApiClient _client() {
    if (!sl.isRegistered<FinanceApiClient>()) {
      sl.registerSingleton<FinanceApiClient>(FinanceApiClient(
        baseUrl: AppConfig.baseUrl,
        getToken: () async => await SecurityService().getOfflineToken() ?? '',
        getTenantId: () async => await SecurityService().getTenantId(),
      ));
    }
    return sl<FinanceApiClient>();
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  @override
  void dispose() {
    _subject.dispose();
    _message.dispose();
    _testEmail.dispose();
    _testPhone.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final db = context.read<SettingsBloc>().backupService.database;
      await WebCloudSyncService.pushSchoolRoster(database: db, client: _client());
    } catch (_) {}
    try {
      final response = await _client().get('/api/school/parent-broadcast/audience');
      final data = response.data is Map ? response.data as Map : {};
      if (!mounted) return;
      setState(() {
        _parents = int.tryParse('${data['parents']}') ?? 0;
        _emailCount = int.tryParse('${data['emailRecipients']}') ?? 0;
        _smsCount = int.tryParse('${data['smsRecipients']}') ?? 0;
        _smsConfigured = data['smsConfigured'] == true;
        if (!_smsConfigured) _sms = false;
        _loading = false;
      });
    } on FinanceApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.message;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = friendlyApiError(e, fallback: 'Could not load parents.');
      });
    }
  }

  Future<void> _send({required bool testOnly}) async {
    final message = _message.text.trim();
    if (message.isEmpty) {
      setState(() => _error = 'Enter the message to send.');
      return;
    }
    if (!_email && !_sms) {
      setState(() => _error = 'Choose email, SMS, or both.');
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
      _result = null;
    });
    try {
      final response = await _client().post('/api/school/parent-broadcast', data: {
        'channels': [
          if (_email) 'email',
          if (_sms) 'sms',
        ],
        'subject': _subject.text.trim(),
        'message': message,
        'testOnly': testOnly,
        'testEmail': _testEmail.text.trim(),
        'testPhone': _testPhone.text.trim(),
      });
      final data = response.data is Map ? response.data as Map : {};
      if (!mounted) return;
      setState(() {
        _sending = false;
        _result = _describe(data, testOnly);
      });
    } on FinanceApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _error = e.message;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _sending = false;
        _error = friendlyApiError(e, fallback: 'The message could not be sent.');
      });
    }
  }

  String _describe(Map data, bool testOnly) {
    final parts = <String>[];
    final email = data['email'];
    final sms = data['sms'];
    if (email is Map) parts.add('Email sent ${email['sent']}, failed ${email['failed']}');
    if (sms is Map) parts.add('SMS sent ${sms['sent']}, failed ${sms['failed']}');
    final prefix = testOnly ? 'Test finished. ' : 'Broadcast finished. ';
    return prefix + (parts.isEmpty ? 'No messages were sent.' : parts.join('. '));
  }

  Future<void> _confirmSendAll() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Send to all parents'),
        content: const Text(
          'This sends the message to every parent email and phone you selected. Send a test first if you have not checked it.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Send')),
        ],
      ),
    );
    if (ok == true) await _send(testOnly: false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Message parents')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  '$_parents parents · $_emailCount with email · $_smsCount with phone',
                  style: const TextStyle(fontSize: 13, color: Color(0xFF475467)),
                ),
                if (!_smsConfigured)
                  const Padding(
                    padding: EdgeInsets.only(top: 8),
                    child: Text(
                      'SMS is not configured on this server yet. Email can still be sent.',
                      style: TextStyle(fontSize: 13, color: Color(0xFFB54708)),
                    ),
                  ),
                const SizedBox(height: 16),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Email'),
                  value: _email,
                  onChanged: _sending ? null : (v) => setState(() => _email = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('SMS'),
                  value: _sms,
                  onChanged: (!_smsConfigured || _sending) ? null : (v) => setState(() => _sms = v),
                ),
                TextField(
                  controller: _subject,
                  decoration: const InputDecoration(labelText: 'Email subject'),
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _message,
                  minLines: 4,
                  maxLines: 8,
                  maxLength: 1000,
                  decoration: const InputDecoration(
                    labelText: 'Message',
                    alignLabelWithHint: true,
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 8),
                const Text('Send a test first', style: TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                TextField(
                  controller: _testEmail,
                  keyboardType: TextInputType.emailAddress,
                  decoration: const InputDecoration(labelText: 'Test email'),
                ),
                TextField(
                  controller: _testPhone,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(labelText: 'Test phone', hintText: '0803...'),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 12),
                  Text(_error!, style: const TextStyle(color: Color(0xFFB42318))),
                ],
                if (_result != null) ...[
                  const SizedBox(height: 12),
                  Text(_result!, style: const TextStyle(color: Color(0xFF067647))),
                ],
                const SizedBox(height: 16),
                OutlinedButton(
                  onPressed: _sending ? null : () => _send(testOnly: true),
                  child: _sending
                      ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Send test'),
                ),
                const SizedBox(height: 8),
                FilledButton(
                  onPressed: _sending ? null : _confirmSendAll,
                  child: const Text('Send to all parents'),
                ),
              ],
            ),
    );
  }
}
