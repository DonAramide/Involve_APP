import 'dart:convert';

class LinkDeviceQrPayload {
  const LinkDeviceQrPayload({required this.token, required this.tenantId});

  final String token;
  final String tenantId;

  static const invalidMessage = 'Invalid QR code';

  /// Expected payload: `{"action":"LINK_DEVICE","token":"...","tenantId":"..."}`.
  static LinkDeviceQrPayload? tryParse(String raw) {
    try {
      final data = jsonDecode(raw.trim());
      if (data is! Map) return null;
      if (data['action'] != 'LINK_DEVICE') return null;
      final token = data['token']?.toString().trim() ?? '';
      final tenantId = data['tenantId']?.toString().trim() ?? '';
      if (token.isEmpty || tenantId.isEmpty) return null;
      return LinkDeviceQrPayload(token: token, tenantId: tenantId);
    } catch (_) {
      return null;
    }
  }
}
