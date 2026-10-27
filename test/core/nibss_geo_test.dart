import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/pos/nibss_geo.dart';

void main() {
  test('Field 120 matches NUS Lagos sample', () {
    expect(
      NibssGeo.toField120(6.52440, 3.37921),
      '010806.524400209003.37921',
    );
  });

  test('pads latitude and longitude degrees', () {
    expect(NibssGeo.formatLatitude(6.5), '06.50000');
    expect(NibssGeo.formatLongitude(3.37921), '003.37921');
  });

  test('uses signed values for south and west', () {
    expect(
      NibssGeo.toField120(-6.52440, -3.37921),
      '0109-06.524400210-003.37921',
    );
  });
}
