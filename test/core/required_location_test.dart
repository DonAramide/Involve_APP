import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/utils/required_location.dart';

void main() {
  test('accepts a captured GPS string', () {
    expect(
      RequiredLocation.isValid('Lat: 6.625549, Lng: 3.351200'),
      isTrue,
    );
  });

  test('rejects missing or placeholder location', () {
    expect(RequiredLocation.isValid(null), isFalse);
    expect(RequiredLocation.isValid(''), isFalse);
    expect(RequiredLocation.isValid('Unknown Location'), isFalse);
    expect(RequiredLocation.isValid('Lagos, Nigeria'), isFalse);
  });
}
