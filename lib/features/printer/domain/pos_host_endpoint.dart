/// Resolves POS switch IP/port from terminal sync JSON.
/// Empty strings and alias field names (hostname / ipAddress) are treated as missing.
class PosHostEndpoint {
  static const defaultNibssIp = '196.6.103.18';
  static const defaultNibssPort = '5001';

  static String? nonEmpty(dynamic value) {
    if (value == null) return null;
    final s = value.toString().trim();
    if (s.isEmpty || s == '—' || s.toLowerCase() == 'null') return null;
    return s;
  }

  static int? parsePort(dynamic value) {
    final s = nonEmpty(value);
    if (s == null) return null;
    return int.tryParse(s);
  }

  static String? ipFromHost(Map<String, dynamic>? host) {
    if (host == null) return null;
    return nonEmpty(host['ip']) ??
        nonEmpty(host['ipAddress']) ??
        nonEmpty(host['hostIp']) ??
        nonEmpty(host['hostname']) ??
        nonEmpty(host['host']);
  }

  static String? portFromHost(Map<String, dynamic>? host) {
    if (host == null) return null;
    return nonEmpty(host['port']) ?? nonEmpty(host['portNumber']);
  }

  static ({String? ip, String? port}) resolve({
    required String activeHost,
    Map<String, dynamic>? primaryHost,
    String? nibssIp,
    int? nibssPort,
    String? expressPayHost,
    int? expressPayPort,
  }) {
    final isNibss = activeHost.toUpperCase().contains('NIBSS');
    final ip = ipFromHost(primaryHost) ??
        nonEmpty(nibssIp) ??
        (isNibss ? null : nonEmpty(expressPayHost)) ??
        (isNibss ? defaultNibssIp : nonEmpty(expressPayHost));
    final port = portFromHost(primaryHost) ??
        nonEmpty(nibssPort?.toString()) ??
        (isNibss ? null : nonEmpty(expressPayPort?.toString())) ??
        (isNibss ? defaultNibssPort : nonEmpty(expressPayPort?.toString()));
    return (ip: ip, port: port);
  }
}
