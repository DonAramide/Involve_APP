import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/utils/device_info_service.dart';

void main() {
  group('DeviceInfoService.isUsableDeviceId', () {
    test('accepts hardware serials', () {
      expect(DeviceInfoService.isUsableDeviceId('R52M413KTQK'), isTrue);
      expect(DeviceInfoService.isUsableDeviceId('ab-cd:ef12'), isTrue);
    });

    test('rejects null, empty, and placeholder serials', () {
      expect(DeviceInfoService.isUsableDeviceId(null), isFalse);
      expect(DeviceInfoService.isUsableDeviceId(''), isFalse);
      expect(DeviceInfoService.isUsableDeviceId('unknown'), isFalse);
      expect(DeviceInfoService.isUsableDeviceId('null'), isFalse);
      expect(DeviceInfoService.isUsableDeviceId('none'), isFalse);
      expect(DeviceInfoService.isUsableDeviceId('0'), isFalse);
      expect(DeviceInfoService.isUsableDeviceId('M1AJQ'), isFalse);
    });
  });
}
