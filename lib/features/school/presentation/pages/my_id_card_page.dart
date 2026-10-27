import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:involve_app/core/utils/app_config.dart';

/// Shows the signed-in administrator's own issued card.
/// The barcode secret is never requested or drawn.
class MyIdCardPage extends StatefulWidget {
  static const String routeName = '/my_id_card';

  const MyIdCardPage({super.key});

  @override
  State<MyIdCardPage> createState() => _MyIdCardPageState();
}

class _MyIdCardPageState extends State<MyIdCardPage> {
  Map<String, dynamic>? _card;
  String? _message;
  String? _error;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final token = Supabase.instance.client.auth.currentSession?.accessToken;
      final response = await Dio(BaseOptions(baseUrl: AppConfig.baseUrl)).get(
        '/api/school/id-cards/mine',
        options: Options(headers: {
          if (token != null && token.isNotEmpty) 'Authorization': 'Bearer $token',
        }),
      );
      final body = response.data;
      final card = body is Map ? body['card'] : null;
      setState(() {
        _card = card is Map ? Map<String, dynamic>.from(card) : null;
        _message = body is Map ? body['message']?.toString() : null;
        _loading = false;
      });
    } on DioException catch (error) {
      final data = error.response?.data;
      final code = data is Map ? data['code']?.toString() : null;
      final status = error.response?.statusCode;
      setState(() {
        _error = code == 'SCHOOL_GATE_SCHEMA_UNAPPLIED'
            ? 'ID cards are not available from the server yet.'
            : status == 403
                ? 'Only a school owner or tenant administrator can open this card.'
                : 'The ID card could not be loaded.';
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _error = 'The ID card could not be loaded.';
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('My ID Card')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                if (_error != null)
                  Text(_error!, style: const TextStyle(color: Colors.red)),
                if (_error == null && _card == null)
                  const Text('No administrator card has been issued for this signed-in account.'),
                if (_card != null) _CardFace(card: _card!),
                if (_message != null) ...[
                  const SizedBox(height: 16),
                  Text(_message!, style: const TextStyle(color: Colors.black54)),
                ],
              ],
            ),
    );
  }
}

class _CardFace extends StatelessWidget {
  const _CardFace({required this.card});

  final Map<String, dynamic> card;

  @override
  Widget build(BuildContext context) {
    final name = (card['printedName'] ?? '').toString();
    final parts = name.split(RegExp(r'\s+')).where((part) => part.isNotEmpty).toList();
    final initials = ((parts.isNotEmpty ? parts.first[0] : '') + (parts.length > 1 ? parts[1][0] : '')).toUpperCase();
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(radius: 28, child: Text(initials.isEmpty ? '?' : initials)),
            const SizedBox(height: 12),
            Text(name, style: Theme.of(context).textTheme.titleLarge),
            Text(card['printedCode']?.toString() ?? ''),
            if ((card['printedDetail'] ?? '').toString().isNotEmpty)
              Text(card['printedDetail'].toString()),
            const SizedBox(height: 8),
            Text('Status: ${card['status'] ?? 'unknown'}'),
            const SizedBox(height: 12),
            const Text('The printed barcode is not shown here.'),
          ],
        ),
      ),
    );
  }
}
