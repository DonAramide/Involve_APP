import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/utils/validators.dart';

void main() {
  group('InputValidator.validateStreetAddress', () {
    test('rejects empty input', () {
      expect(InputValidator.validateStreetAddress(''), isNotNull);
      expect(InputValidator.validateStreetAddress('   '), isNotNull);
      expect(InputValidator.validateStreetAddress(null), isNotNull);
    });

    test('rejects short or single-word junk like telll', () {
      expect(InputValidator.validateStreetAddress('telll'), isNotNull);
      expect(InputValidator.validateStreetAddress('12 street'), isNotNull);
    });

    test('requires 9 characters, 2 spaces, and 2 letters', () {
      expect(InputValidator.validateStreetAddress('12 34 56 78'), isNotNull);
      expect(InputValidator.validateStreetAddress('12 Adeola Street'), isNull);
    });
  });
}
