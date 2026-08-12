import 'package:involve_app/core/utils/app_config.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/core/services/service_locator.dart';
import 'dart:convert';
import 'package:involve_app/features/settings/domain/services/security_service.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class TwoFactorAuthPage extends StatefulWidget {
  const TwoFactorAuthPage({super.key});

  @override
  State<TwoFactorAuthPage> createState() => _TwoFactorAuthPageState();
}

class _TwoFactorAuthPageState extends State<TwoFactorAuthPage> {
  FinanceApiClient get _client {
    if (!sl.isRegistered<FinanceApiClient>()) {
      sl.registerSingleton<FinanceApiClient>(FinanceApiClient(
        baseUrl: AppConfig.baseUrl,
        getToken: () async => await SecurityService().getOfflineToken() ?? 'mock-super-admin',
        getTenantId: () async => await SecurityService().getTenantId(),
      ));
    }
    return sl<FinanceApiClient>();
  }
  bool _isLoading = false;
  String? _qrCodeDataUrl;
  String? _secretKey;
  final TextEditingController _codeController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _generateMfa();
  }

  Future<void> _generateMfa() async {
    setState(() => _isLoading = true);
    try {
      final response = await _client.post('/api/mfa/generate');
      if (response.statusCode == 200) {
        setState(() {
          _qrCodeDataUrl = response.data['qrCodeUrl'];
          _secretKey = response.data['secret'];
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyApiError(e, fallback: 'Could not set up 2FA.'))));
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _enableMfa() async {
    final code = _codeController.text.trim();
    if (code.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Please enter a valid 6-digit code')));
      return;
    }

    setState(() => _isLoading = true);
    try {
      final response = await _client.post('/api/mfa/enable', data: {'code': code});
      if (response.statusCode == 200) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('2FA Enabled Successfully!')));
          Navigator.pop(context);
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Invalid 2FA code. Please try again.')));
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Widget _buildQrCode() {
    if (_qrCodeDataUrl == null) return const SizedBox();
    
    // The qrCodeUrl is usually in the format: data:image/png;base64,iVBORw0KGgo...
    try {
      final String base64String = _qrCodeDataUrl!.split(',').last;
      final Uint8List bytes = base64Decode(base64String);
      return Image.memory(bytes, width: 200, height: 200);
    } catch (e) {
      return const Text('Error loading QR code');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('2FA Settings'),
      ),
      body: _isLoading && _qrCodeDataUrl == null
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Image.asset('assets/images/logo.png', height: 64),
                      const SizedBox(width: 16),
                      const Icon(Icons.security, size: 64, color: Colors.blue),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'Setup Google Authenticator',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    '1. Install Google Authenticator or Authy on your mobile device.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    '2. Scan the QR code below.',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 24),
                  
                  _buildQrCode(),
                  
                  const SizedBox(height: 24),
                  if (_secretKey != null) ...[
                    const Text('Or enter this secret key manually:'),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.grey[200],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(_secretKey!, style: const TextStyle(fontWeight: FontWeight.bold, letterSpacing: 2)),
                          IconButton(
                            icon: const Icon(Icons.copy, size: 16),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: _secretKey!));
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Secret copied to clipboard')));
                            },
                          ),
                        ],
                      ),
                    ),
                  ],
                  
                  const SizedBox(height: 32),
                  const Text(
                    '3. Enter the 6-digit code generated by the app to verify:',
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: 200,
                    child: TextField(
                      controller: _codeController,
                      keyboardType: TextInputType.number,
                      textAlign: TextAlign.center,
                      maxLength: 6,
                      decoration: const InputDecoration(
                        hintText: '000000',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: 200,
                    height: 48,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _enableMfa,
                      child: _isLoading 
                          ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Text('Verify & Enable'),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
