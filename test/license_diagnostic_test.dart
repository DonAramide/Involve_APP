import 'dart:typed_data';
import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/license/license_generator.dart';
import 'package:involve_app/core/license/license_validator.dart';
import 'package:involve_app/core/license/license_model.dart';
import 'package:involve_app/core/license/binary_service.dart';
import 'package:involve_app/core/license/base32_service.dart';

void main() {
  test('client license generation is disabled (server-minted only)', () {
    expect(
      () => LicenseGenerator.generate('Test Business', 30, 1, 'ABCDEF'),
      throwsA(isA<UnsupportedError>()),
    );
  });

  test('trusted-local decode rejects wrong business hash without client HMAC secret', () {
    final license = LicenseModel(
      businessName: 'Test Business',
      expiryDate: DateTime.now().add(const Duration(days: 30)),
      planType: PlanType.standard,
      licenseId: 12345,
    );
    final payload = BinaryService.pack(license);
    final bytes = Uint8List.fromList(<int>[...payload, 1, 2, 3, 4]);
    final key = Base32Service.encode(bytes);

    final ok = LicenseValidator.decodeTrustedLocal(key, 'Test Business');
    expect(ok, isNotNull);
    expect(ok!.licenseId, 12345);

    final wrong = LicenseValidator.decodeTrustedLocal(key, 'Wrong Business');
    expect(wrong, isNull);

    final peek = LicenseValidator.peek(key);
    expect(peek, isNotNull);
    expect(peek!['signatureTrusted'], isFalse);
  });
}
