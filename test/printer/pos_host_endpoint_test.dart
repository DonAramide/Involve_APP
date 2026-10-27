import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/printer/domain/pos_host_endpoint.dart';

void main() {
  test('skips empty primary IP and uses nibssIp', () {
    final ep = PosHostEndpoint.resolve(
      activeHost: 'NIBSS',
      primaryHost: {'ip': '', 'port': ''},
      nibssIp: '196.6.103.18',
      nibssPort: 5001,
    );
    expect(ep.ip, '196.6.103.18');
    expect(ep.port, '5001');
  });

  test('uses NIBSS production defaults when sync omitted IP/port', () {
    final ep = PosHostEndpoint.resolve(
      activeHost: 'NIBSS',
      primaryHost: {'ip': '', 'port': null},
    );
    expect(ep.ip, PosHostEndpoint.defaultNibssIp);
    expect(ep.port, PosHostEndpoint.defaultNibssPort);
  });

  test('reads hostname alias', () {
    final ep = PosHostEndpoint.resolve(
      activeHost: 'NIBSS',
      primaryHost: {'hostname': '196.6.103.18', 'portNumber': '5001'},
    );
    expect(ep.ip, '196.6.103.18');
    expect(ep.port, '5001');
  });
}
