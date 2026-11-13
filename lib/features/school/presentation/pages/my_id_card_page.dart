import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:involve_app/core/service_mode/service_mode_terms.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/core/services/service_locator.dart';
import 'package:involve_app/core/utils/app_config.dart';
import 'package:involve_app/features/school/presentation/widgets/school_id_card_preview.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';

/// Shows the signed-in administrator's own issued card layout.
/// The barcode secret is never requested or drawn here.
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
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await _client().get('/api/school/id-cards/mine');
      final body = response.data;
      final card = body is Map ? body['card'] : null;
      setState(() {
        _card = card is Map ? Map<String, dynamic>.from(card) : null;
        _message = body is Map ? body['message']?.toString() : null;
        _loading = false;
      });
    } on FinanceApiException catch (error) {
      setState(() {
        _error = error.message;
        _loading = false;
      });
    } on DioException catch (error) {
      final data = error.response?.data;
      final code = data is Map ? data['code']?.toString() : null;
      final status = error.response?.statusCode;
      setState(() {
        _error = code == 'SCHOOL_GATE_SCHEMA_UNAPPLIED'
            ? 'ID cards are not available from the server yet.'
            : status == 401
                ? 'Sign in again on this device (authorization missing).'
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

  ServiceModeTerms get _terms {
    try {
      final mode =
          context.read<SettingsBloc>().state.settings?.normalizedBusinessMode;
      return ServiceModeTerms.fromRaw(mode);
    } catch (_) {
      return const ServiceModeTerms(ServiceMode.school);
    }
  }

  @override
  Widget build(BuildContext context) {
    final terms = _terms;
    return Scaffold(
      appBar: AppBar(
        title: const Text('My ID Card'),
        actions: [
          IconButton(onPressed: _loading ? null : _load, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(20),
              children: [
                if (_error != null)
                  Text(_error!, style: const TextStyle(color: Colors.red)),
                if (_message != null && _card == null) Text(_message!),
                if (_card != null) ...[
                  SchoolIdCardPreview(
                    schoolName: _card!['schoolName']?.toString() ?? terms.organisation,
                    address: _card!['address']?.toString(),
                    fullName: _card!['printedName']?.toString() ??
                        _card!['fullName']?.toString() ??
                        'Card holder',
                    category: (_card!['category'] ?? 'ADMIN').toString(),
                    printedCode: _card!['printedCode']?.toString() ?? '',
                    detail: (_card!['printedDetail'] ?? _card!['detail'])?.toString(),
                    hmoName: _card!['hmoName']?.toString(),
                    enrolleeId: (_card!['enrolleeId'] ?? _card!['policyNumber'])?.toString(),
                    accentHex: _card!['accentColor']?.toString(),
                    barcodeValue: null,
                    terms: terms,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'This is your card layout preview. The gate barcode secret is not stored here. Use ID Card → Issue & Print to preview a ${terms.beneficiary.toLowerCase()} card with photo and print the barcode on the Bluetooth printer.',
                    style: const TextStyle(fontSize: 13, color: Colors.black54),
                  ),
                ],
              ],
            ),
    );
  }
}
