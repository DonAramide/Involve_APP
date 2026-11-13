import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/school/presentation/widgets/id_card_identity_code.dart';

void main() {
  test('resolves only 12-char Invify identity — never long verification tokens', () {
    const identity = 'JMSAYO000123';
    const longToken = '5aVWs8IPu5DKv8iNEnZsg971xZOZa-XFJjOWxoABCDEF';

    expect(isInvifyIdentityCode(identity), isTrue);
    expect(isInvifyIdentityCode(longToken), isFalse);
    expect(identity.length, 12);

    expect(
      resolveCardIdentityCode(
        face: {
          'cardIdentityCode': identity,
          'verificationToken': longToken,
          'barcodeValue': longToken,
        },
        barcodeValue: longToken,
      ),
      identity,
    );

    expect(
      resolveCardIdentityCode(
        face: {'verificationToken': longToken, 'barcodeValue': longToken},
        barcodeValue: longToken,
      ),
      isNull,
    );

    expect(
      resolveCardIdentityCode(barcodeValue: identity.toLowerCase()),
      identity,
    );
  });
}
