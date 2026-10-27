import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:involve_app/core/utils/app_config.dart';

/// School owner and tenant administrator card issuing.
/// The device must already have passed the local administrator PIN.
/// The server still rejects every other signed-in role.
class IdCardAdminPage extends StatefulWidget {
  static const String routeName = '/id_card_admin';

  const IdCardAdminPage({super.key});

  @override
  State<IdCardAdminPage> createState() => _IdCardAdminPageState();
}

class _IdCardAdminPageState extends State<IdCardAdminPage> {
  static const _disclaimer =
      'This card remains the property of the issuing institution. It must be presented when requested by authorized school personnel. If found, please return it to the issuing institution. Unauthorized use, alteration, or transfer is prohibited.';

  final List<_Person> _people = [];
  String _filter = 'all';
  String? _error;
  bool _loading = true;
  String? _busyId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Dio _client() {
    final token = Supabase.instance.client.auth.currentSession?.accessToken;
    return Dio(BaseOptions(
      baseUrl: AppConfig.baseUrl,
      connectTimeout: const Duration(seconds: 20),
      receiveTimeout: const Duration(seconds: 30),
      validateStatus: (status) => status != null && status < 500,
      headers: {
        if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
      },
    ));
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await _client().get('/api/school/id-cards/eligible');
      final failure = _failure(response.statusCode, response.data);
      if (failure != null) {
        setState(() {
          _error = failure;
          _people.clear();
          _loading = false;
        });
        return;
      }
      final body = response.data is Map ? Map<String, dynamic>.from(response.data as Map) : <String, dynamic>{};
      final next = <_Person>[
        ..._readList(body['students']),
        ..._readList(body['staff']),
        ..._readList(body['administrators']),
      ];
      setState(() {
        _people
          ..clear()
          ..addAll(next);
        _loading = false;
      });
    } on DioException catch (error) {
      setState(() {
        _error = _failure(error.response?.statusCode, error.response?.data) ?? 'The ID card list could not be loaded.';
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _error = 'The ID card list could not be loaded.';
        _loading = false;
      });
    }
  }

  Future<void> _generate(_Person person) async {
    setState(() => _busyId = person.subjectId);
    try {
      var response = await _issue(person);
      if (response.statusCode == 409 && _code(response.data) == 'SETTINGS_REQUIRED') {
        final saved = await _client().put('/api/school/id-cards/settings', data: {
          'studentTemplate': 'classic_school',
          'staffTemplate': 'classic_school',
          'adminTemplate': 'classic_school',
          'notifyStudentArrival': false,
          'notifyStudentDeparture': false,
          'notifyStaffArrival': false,
          'notifyStaffDeparture': false,
          'trackAdminEntry': false,
          'disclaimer': _disclaimer,
        });
        final saveFailure = _failure(saved.statusCode, saved.data);
        if (saveFailure != null) {
          _showMessage(saveFailure);
          return;
        }
        response = await _issue(person);
      }
      final failure = _failure(response.statusCode, response.data);
      if (failure != null) {
        _showMessage(failure);
        return;
      }
      final cards = response.data is Map ? (response.data as Map)['cards'] : null;
      final first = cards is List && cards.isNotEmpty && cards.first is Map ? Map<String, dynamic>.from(cards.first as Map) : null;
      final face = first?['face'] is Map ? Map<String, dynamic>.from(first!['face'] as Map) : null;
      final barcode = first?['barcodeValue']?.toString();
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(face?['printedName']?.toString() ?? person.name),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(face?['printedCode']?.toString() ?? person.printedCode),
              if ((face?['printedDetail'] ?? person.detail ?? '').toString().isNotEmpty)
                Text((face?['printedDetail'] ?? person.detail).toString()),
              const SizedBox(height: 12),
              const Text('Show this Code 128 barcode while printing. It is not saved on this phone or on the server.'),
              const SizedBox(height: 8),
              SelectableText(barcode ?? 'The server did not return a barcode.'),
            ],
          ),
          actions: [
            if (barcode != null && barcode.isNotEmpty)
              TextButton(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: barcode));
                  Navigator.pop(context);
                },
                child: const Text('Copy barcode'),
              ),
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Done')),
          ],
        ),
      );
      await _load();
    } on DioException catch (error) {
      _showMessage(_failure(error.response?.statusCode, error.response?.data) ?? 'The card could not be generated.');
    } catch (_) {
      _showMessage('The card could not be generated.');
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  Future<Response<dynamic>> _issue(_Person person) {
    return _client().post('/api/school/id-cards/batch', data: {
      'people': [
        {'subjectType': person.subjectType, 'subjectId': person.subjectId},
      ],
    });
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  List<_Person> _readList(Object? value) {
    if (value is! List) return const [];
    return value.whereType<Map>().map((row) {
      final map = Map<String, dynamic>.from(row);
      return _Person(
        subjectType: map['subjectType']?.toString() ?? '',
        subjectId: map['subjectId']?.toString() ?? '',
        name: map['name']?.toString() ?? '',
        printedCode: map['printedCode']?.toString() ?? '',
        detail: map['detail']?.toString(),
        cardStatus: map['cardStatus']?.toString() ?? 'none',
      );
    }).where((person) => person.subjectId.isNotEmpty).toList();
  }

  String? _failure(int? status, Object? data) {
    if (status != null && status < 400) return null;
    final code = _code(data);
    if (code == 'SCHOOL_GATE_SCHEMA_UNAPPLIED' || status == 404) {
      return 'ID cards are not available from the server yet.';
    }
    if (status == 403 || code == 'FORBIDDEN') {
      return 'Only a school owner or tenant administrator can view or generate ID cards.';
    }
    if (data is Map && data['error'] != null) return data['error'].toString();
    return 'The ID card request could not be completed.';
  }

  String? _code(Object? data) => data is Map ? data['code']?.toString() : null;

  @override
  Widget build(BuildContext context) {
    final visible = _people.where((person) => _filter == 'all' || person.subjectType == _filter).toList();
    return Scaffold(
      appBar: AppBar(
        title: const Text('ID Cards'),
        actions: [IconButton(onPressed: _loading ? null : _load, icon: const Icon(Icons.refresh))],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Text('Administrator access is required. The server decides which school and which people can receive a card.'),
                ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(_error!, style: const TextStyle(color: Colors.red)),
                  ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Wrap(
                    spacing: 8,
                    children: [
                      ChoiceChip(label: const Text('All'), selected: _filter == 'all', onSelected: (_) => setState(() => _filter = 'all')),
                      ChoiceChip(label: const Text('Students'), selected: _filter == 'student', onSelected: (_) => setState(() => _filter = 'student')),
                      ChoiceChip(label: const Text('Staff'), selected: _filter == 'staff', onSelected: (_) => setState(() => _filter = 'staff')),
                      ChoiceChip(label: const Text('Administrators'), selected: _filter == 'admin', onSelected: (_) => setState(() => _filter = 'admin')),
                    ],
                  ),
                ),
                Expanded(
                  child: visible.isEmpty
                      ? const Center(child: Text('No people are available for ID cards.'))
                      : ListView.builder(
                          itemCount: visible.length,
                          itemBuilder: (context, index) {
                            final person = visible[index];
                            return ListTile(
                              title: Text(person.name),
                              subtitle: Text('${person.printedCode} · ${person.cardStatus}'),
                              trailing: _busyId == person.subjectId
                                  ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))
                                  : TextButton(
                                      onPressed: _error == null ? () => _generate(person) : null,
                                      child: Text(person.cardStatus == 'active' ? 'Replace' : 'Generate'),
                                    ),
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }
}

class _Person {
  const _Person({
    required this.subjectType,
    required this.subjectId,
    required this.name,
    required this.printedCode,
    required this.detail,
    required this.cardStatus,
  });

  final String subjectType;
  final String subjectId;
  final String name;
  final String printedCode;
  final String? detail;
  final String cardStatus;
}
