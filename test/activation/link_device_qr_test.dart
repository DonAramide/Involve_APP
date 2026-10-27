import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/activation/presentation/utils/link_device_qr.dart';

void main() {
  group('LinkDeviceQrPayload.tryParse', () {
    test('accepts a device-link JSON payload', () {
      const raw =
          '{"action":"LINK_DEVICE","token":"abc","tenantId":"tenant-1"}';
      final parsed = LinkDeviceQrPayload.tryParse(raw);
      expect(parsed, isNotNull);
      expect(parsed!.token, 'abc');
      expect(parsed.tenantId, 'tenant-1');
    });

    test('rejects a license key or other non-link QR as invalid', () {
      expect(
        LinkDeviceQrPayload.tryParse('NSAP-ZLAB-A3EP-52WO-4P5B-HCIT'),
        isNull,
      );
      expect(LinkDeviceQrPayload.tryParse('{not json'), isNull);
      expect(
        LinkDeviceQrPayload.tryParse('{"action":"SOMETHING_ELSE","token":"x","tenantId":"y"}'),
        isNull,
      );
    });
  });
}
