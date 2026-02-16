import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/license/license_model.dart';
import 'package:involve_app/core/license/license_generator.dart';
import 'package:involve_app/core/license/license_validator.dart';
import 'package:involve_app/core/license/binary_service.dart';
import 'package:involve_app/core/license/base32_service.dart';

void main() {
  test('License Cycle Verification', () {
    final businessName = "Test Business";
    final expiry = DateTime.now().add(Duration(days: 30));
    final license = LicenseModel(
      businessName: businessName,
      expiryDate: expiry,
      planType: PlanType.pro,
      licenseId: 12345,
    );

    // 1. Generate
    print("Generating license for: $businessName");
    final key = LicenseGenerator.generate(license);
    print("Generated Key: $key");

    // 2. Normalize
    final normalized = Base32Service.normalize(key);
    print("Normalized Key: $normalized (Length: ${normalized.length})");

    // 3. Validate
    final validated = LicenseValidator.validate(key, businessName);
    
    expect(validated, isNotNull, reason: "Validation failed with correct business name");
    expect(validated!.businessName, businessName);
    expect(validated.licenseId, 12345);
    
    // 4. Test Case Sensitivity & Trim
    final validated2 = LicenseValidator.validate(key, "  TEST BUSINESS  ");
    expect(validated2, isNotNull, reason: "Validation failed with case/space difference");

    // 5. Test Wrong Business
    final validatedWrong = LicenseValidator.validate(key, "Wrong Business");
    expect(validatedWrong, isNull, reason: "Validation should have failed for wrong business");

    // 6. Test Tampered Key
    final tamperedKey = key.replaceFirst(key[0], key[0] == 'A' ? 'B' : 'A');
    final validatedTampered = LicenseValidator.validate(tamperedKey, businessName);
    expect(validatedTampered, isNull, reason: "Validation should fail for tampered key");
  });
}
