import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:involve_app/core/utils/app_config.dart';

/// Scans a Code 128 card token and asks the server to clock in or out.
/// The token is not stored on the device after the request.
class GateClockPage extends StatefulWidget {
  static const String routeName = '/gate_clock';

  const GateClockPage({super.key});

  @override
  State<GateClockPage> createState() => _GateClockPageState();
}

class _GateClockPageState extends State<GateClockPage> {
  String? _message;
  bool _busy = false;

  Future<void> _scan(String direction) async {
    final token = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => const _Code128ScanPage()),
    );
    if (token == null || token.isEmpty || !mounted) return;
    setState(() {
      _busy = true;
      _message = null;
    });
    try {
      final access = Supabase.instance.client.auth.currentSession?.accessToken;
      final response = await Dio(BaseOptions(
        baseUrl: AppConfig.baseUrl,
        validateStatus: (status) => status != null && status < 500,
      )).post(
        '/api/school/gate/scans',
        data: {'direction': direction, 'token': token, 'deviceLabel': 'mobile'},
        options: Options(headers: {
          if (access != null && access.isNotEmpty) 'Authorization': 'Bearer $access',
        }),
      );
      final body = response.data;
      final code = body is Map ? body['code']?.toString() : null;
      final outcome = body is Map ? body['outcome']?.toString() : null;
      setState(() {
        _message = _text(response.statusCode, code, outcome, body is Map ? body['person'] : null);
        _busy = false;
      });
    } on DioException catch (error) {
      final data = error.response?.data;
      final code = data is Map ? data['code']?.toString() : null;
      setState(() {
        _message = code == 'SCHOOL_GATE_SCHEMA_UNAPPLIED'
            ? 'Gate scans are not being saved yet.'
            : 'The scan could not be sent.';
        _busy = false;
      });
    } catch (_) {
      setState(() {
        _message = 'The scan could not be sent.';
        _busy = false;
      });
    }
  }

  String _text(int? status, String? code, String? outcome, Object? person) {
    if (code == 'SCHOOL_GATE_SCHEMA_UNAPPLIED') return 'Gate scans are not being saved yet.';
    final name = person is Map ? (person['printedName']?.toString() ?? '') : '';
    switch (outcome) {
      case 'arrival_accepted':
        return name.isEmpty ? 'Clock-in saved.' : 'Clock-in saved for $name.';
      case 'departure_accepted':
        return name.isEmpty ? 'Clock-out saved.' : 'Clock-out saved for $name.';
      case 'duplicate_open':
      case 'duplicate_window':
        return 'This person is already clocked in.';
      case 'departure_without_session':
        return 'There is no open clock-in to close.';
      case 'unknown_token':
        return 'This barcode is not an active card for this school.';
      case 'revoked_card':
        return 'This card has been revoked.';
      case 'expired_card':
        return 'This card has expired.';
      case 'inactive_subject':
        return 'This card is not active for a current student or staff member.';
      case 'tracking_disabled':
        return 'Administrator entry tracking is off.';
      default:
        return status == 403 ? 'This account cannot scan the gate.' : 'The scan was not accepted.';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Gate clock')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Scan the Code 128 barcode on a school ID card. Clock-in and clock-out are saved only by the server.'),
            const SizedBox(height: 20),
            FilledButton(
              onPressed: _busy ? null : () => _scan('arrival'),
              child: const Text('Clock in'),
            ),
            const SizedBox(height: 12),
            FilledButton.tonal(
              onPressed: _busy ? null : () => _scan('departure'),
              child: const Text('Clock out'),
            ),
            const SizedBox(height: 20),
            if (_busy) const Center(child: CircularProgressIndicator()),
            if (_message != null) Text(_message!),
          ],
        ),
      ),
    );
  }
}

class _Code128ScanPage extends StatefulWidget {
  const _Code128ScanPage();

  @override
  State<_Code128ScanPage> createState() => _Code128ScanPageState();
}

class _Code128ScanPageState extends State<_Code128ScanPage> {
  final MobileScannerController _controller = MobileScannerController(formats: const [BarcodeFormat.code128]);
  bool _sent = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_sent) return;
    for (final barcode in capture.barcodes) {
      final value = barcode.rawValue;
      if (value != null && value.isNotEmpty) {
        _sent = true;
        Navigator.of(context).pop(value);
        return;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan card')),
      body: MobileScanner(controller: _controller, onDetect: _onDetect),
    );
  }
}
