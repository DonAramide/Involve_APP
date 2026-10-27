import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/settings/domain/entities/settings.dart';

void main() {
  test('default seed phone and address are placeholders', () {
    expect(AppSettings.isPlaceholderPhone('000000'), isTrue);
    expect(AppSettings.isPlaceholderPhone('000-000'), isTrue);
    expect(AppSettings.isPlaceholderPhone('+2348012345678'), isFalse);
    expect(AppSettings.isPlaceholderEmail(''), isTrue);
    expect(AppSettings.isPlaceholderEmail('admin@school.com'), isFalse);
    expect(AppSettings.isPlaceholderAddress('123 Street'), isTrue);
    expect(AppSettings.isPlaceholderAddress('12 Marina, Lagos'), isFalse);
  });
}
