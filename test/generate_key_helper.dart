import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/license/license_model.dart';
import 'package:involve_app/core/license/license_generator.dart';
import 'package:involve_app/core/utils/device_info_service.dart';

void main() {
  test('Generate Key for User', () {
    final deviceId = "9EE820";
    final businessName = "Oldies Lounge & Bar";
    
    final int licenseId = DeviceInfoService.encodeSuffix(deviceId);
    
    final license = LicenseModel(
      businessName: businessName,
      expiryDate: DateTime(2099, 12, 31),
      planType: PlanType.pro,
      licenseId: licenseId,
    );
    
    final key = LicenseGenerator.generate(license);
    
    print("\n--- LICENSE KEY GENERATED ---");
    print("Business: $businessName");
    print("Device ID: $deviceId");
    print("Plan: Lifetime PRO");
    print("Key: $key");
    print("-----------------------------\n");
  });
}
