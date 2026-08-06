import 'package:flutter_dotenv/flutter_dotenv.dart';

class AppConfig {
  // Fallback IP address if not found in .env:
  static const String defaultIp = '192.168.1.193';

  static String get baseUrl {
    final envUrl = dotenv.env['BASE_URL'];
    if (envUrl != null && envUrl.isNotEmpty) {
      return envUrl;
    }
    return 'http://$defaultIp:3004';
  }

  // Fallback for some tests or specific endpoints that use port 3000
  static String get baseUrl3000 {
    final envUrl = dotenv.env['BASE_URL'];
    if (envUrl != null && envUrl.isNotEmpty) {
      return envUrl.replaceAll(':3004', ':3000');
    }
    return 'http://$defaultIp:3000';
  }
}
