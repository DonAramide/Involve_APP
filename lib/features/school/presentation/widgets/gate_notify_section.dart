import 'package:flutter/material.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/core/services/service_locator.dart';
import 'package:involve_app/core/utils/app_config.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

enum GateNotifyKind { parent, staff }

/// Gate clock email consent for a parent (children) or staff member.
class GateNotifySection extends StatefulWidget {
  const GateNotifySection.parent({
    super.key,
    required this.guardianName,
    this.phone,
    this.email,
    this.parentSyncId,
  })  : kind = GateNotifyKind.parent,
        staffName = null,
        staffId = null;

  const GateNotifySection.staff({
    super.key,
    required this.staffName,
    this.phone,
    this.staffId,
  })  : kind = GateNotifyKind.staff,
        guardianName = null,
        email = null,
        parentSyncId = null;

  final GateNotifyKind kind;
  final String? guardianName;
  final String? staffName;
  final String? phone;
  final String? email;
  final String? parentSyncId;
  final String? staffId;

  @override
  State<GateNotifySection> createState() => _GateNotifySectionState();
}

class _GateNotifySectionState extends State<GateNotifySection> {
  final _emailCtrl = TextEditingController();
  bool _enabled = false;
  bool _loading = true;
  bool _saving = false;
  String? _error;
  String? _hint;
  int _studentCount = 0;

  FinanceApiClient _client() {
    if (!sl.isRegistered<FinanceApiClient>()) {
      sl.registerSingleton<FinanceApiClient>(FinanceApiClient(
        baseUrl: AppConfig.baseUrl,
        getToken: () async {
          final offline = await SecurityService().getOfflineToken();
          if (offline != null && offline.trim().isNotEmpty) return offline.trim();
          return Supabase.instance.client.auth.currentSession?.accessToken;
        },
        getTenantId: () async => await SecurityService().getTenantId(),
      ));
    }
    return sl<FinanceApiClient>();
  }

  @override
  void initState() {
    super.initState();
    _emailCtrl.text = (widget.email ?? '').trim();
    _load();
  }

  @override
  void didUpdateWidget(covariant GateNotifySection oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.phone != widget.phone ||
        oldWidget.email != widget.email ||
        oldWidget.parentSyncId != widget.parentSyncId ||
        oldWidget.staffId != widget.staffId ||
        oldWidget.staffName != widget.staffName) {
      if (_emailCtrl.text.trim().isEmpty && (widget.email ?? '').trim().isNotEmpty) {
        _emailCtrl.text = widget.email!.trim();
      }
      _load();
    }
  }

  @override
  void dispose() {
    _emailCtrl.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
      _hint = null;
    });
    try {
      final path = widget.kind == GateNotifyKind.parent
          ? '/api/school/gate/notify/parent'
          : '/api/school/gate/notify/staff';
      final query = <String, dynamic>{
        if ((widget.phone ?? '').trim().isNotEmpty) 'phone': widget.phone!.trim(),
        if ((widget.email ?? '').trim().isNotEmpty) 'email': widget.email!.trim(),
        if ((widget.parentSyncId ?? '').trim().isNotEmpty) 'parentSyncId': widget.parentSyncId!.trim(),
        if ((widget.staffId ?? '').trim().isNotEmpty) 'staffId': widget.staffId!.trim(),
        if ((widget.staffName ?? '').trim().isNotEmpty) 'name': widget.staffName!.trim(),
      };
      final response = await _client().get(path, queryParameters: query);
      final body = response.data is Map
          ? Map<String, dynamic>.from(response.data as Map)
          : <String, dynamic>{};
      if (response.statusCode != null && response.statusCode! >= 400) {
        setState(() {
          _error = _apiMessage(body) ?? 'Could not load gate email settings.';
          _loading = false;
        });
        return;
      }

      if (widget.kind == GateNotifyKind.parent) {
        final email = (body['email'] ?? '').toString().trim();
        final students = body['students'] is List ? body['students'] as List : const [];
        setState(() {
          if (email.isNotEmpty) _emailCtrl.text = email;
          _enabled = body['consent'] == true;
          _studentCount = students.length;
          _hint = students.isEmpty
              ? 'No linked children found on the server yet. Sync students, then refresh.'
              : 'Applies to ${students.length} linked ${students.length == 1 ? 'child' : 'children'}.';
          _loading = false;
        });
      } else {
        final email = (body['email'] ?? '').toString().trim();
        final found = body['found'] == true;
        setState(() {
          if (email.isNotEmpty) _emailCtrl.text = email;
          _enabled = body['accepts'] == true;
          _hint = found
              ? 'Sends clock-in and clock-out emails for this staff member.'
              : 'Staff was not found on the server roster. Sync staff, then refresh.';
          _loading = false;
        });
      }
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _loading = false;
      });
    }
  }

  Future<void> _save() async {
    final email = _emailCtrl.text.trim();
    if (_enabled && (email.isEmpty || !email.contains('@'))) {
      setState(() => _error = 'Enter a valid email address to enable gate emails.');
      return;
    }
    setState(() {
      _saving = true;
      _error = null;
    });
    try {
      final path = widget.kind == GateNotifyKind.parent
          ? '/api/school/gate/notify/parent'
          : '/api/school/gate/notify/staff';
      final data = widget.kind == GateNotifyKind.parent
          ? <String, dynamic>{
              'phone': widget.phone ?? '',
              'email': email,
              'guardianName': widget.guardianName ?? 'Parent / Guardian',
              'parentSyncId': widget.parentSyncId ?? '',
              'consent': _enabled,
            }
          : <String, dynamic>{
              'phone': widget.phone ?? '',
              'email': email,
              'name': widget.staffName ?? '',
              'staffId': widget.staffId ?? '',
              'accepts': _enabled,
            };
      final response = await _client().put(path, data: data);
      final body = response.data is Map
          ? Map<String, dynamic>.from(response.data as Map)
          : <String, dynamic>{};
      if (response.statusCode != null && response.statusCode! >= 400) {
        setState(() {
          _error = _apiMessage(body) ?? 'Could not save gate email settings.';
          _saving = false;
        });
        return;
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_enabled
              ? 'Gate clock emails enabled.'
              : 'Gate clock emails turned off.'),
        ),
      );
      setState(() => _saving = false);
      await _load();
    } catch (e) {
      setState(() {
        _error = e.toString().replaceFirst('Exception: ', '');
        _saving = false;
      });
    }
  }

  String? _apiMessage(Map<String, dynamic> body) {
    final error = body['error'];
    if (error is String && error.trim().isNotEmpty) return error.trim();
    final message = body['message'];
    if (message is String && message.trim().isNotEmpty) return message.trim();
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final title = widget.kind == GateNotifyKind.parent
        ? 'Gate clock emails (parent)'
        : 'Gate clock emails (staff)';
    final toggleLabel = widget.kind == GateNotifyKind.parent
        ? 'Email parent on student clock-in / out'
        : 'Email staff on clock-in / out';

    return Card(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
                IconButton(
                  tooltip: 'Refresh',
                  onPressed: _loading || _saving ? null : _load,
                  icon: _loading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.refresh, size: 20),
                ),
              ],
            ),
            const Text(
              'Verified mailbox used when the school gate clock records entry or exit.',
              style: TextStyle(color: Colors.blueGrey, height: 1.3),
            ),
            if (_hint != null) ...[
              const SizedBox(height: 8),
              Text(_hint!, style: TextStyle(color: Colors.blueGrey.shade700, fontSize: 13)),
            ],
            const SizedBox(height: 12),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: Text(toggleLabel),
              value: _enabled,
              onChanged: _loading || _saving
                  ? null
                  : (v) => setState(() {
                        _enabled = v;
                        _error = null;
                      }),
            ),
            TextField(
              controller: _emailCtrl,
              enabled: !_loading && !_saving,
              keyboardType: TextInputType.emailAddress,
              autofillHints: const [AutofillHints.email],
              decoration: const InputDecoration(
                labelText: 'Gate notify email',
                prefixIcon: Icon(Icons.mark_email_read_outlined),
                border: OutlineInputBorder(),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 8),
              Text(_error!, style: TextStyle(color: Colors.red.shade700, height: 1.3)),
            ],
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: _loading || _saving ? null : _save,
                icon: _saving
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.save_outlined),
                label: Text(_saving ? 'Saving…' : 'Save gate email'),
              ),
            ),
            if (widget.kind == GateNotifyKind.parent && _studentCount > 0) ...[
              const SizedBox(height: 6),
              Text(
                'Consent is stored per linked child ($_studentCount).',
                style: const TextStyle(fontSize: 12, color: Colors.blueGrey),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
