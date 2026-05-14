import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';

class DeviceInfoService {
  static final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();

  /// Returns the last 6 uppercase alphanumeric characters of the device ID.
  /// Uses MachineGUID on Windows/Linux, AndroidID on Android, IdentifierForVendor on iOS.
  static Future<String> getDeviceSuffix() async {
    String deviceId = 'UNKNOWN';

    try {
      if (kIsWeb) {
        final webInfo = await _deviceInfo.webBrowserInfo;
        deviceId = webInfo.userAgent ?? 'WEB-CLIENT';
      } else if (defaultTargetPlatform == TargetPlatform.android) {
        final androidInfo = await _deviceInfo.androidInfo;
        deviceId = androidInfo.id; // unique ID
      } else if (defaultTargetPlatform == TargetPlatform.iOS) {
        final iosInfo = await _deviceInfo.iosInfo;
        deviceId = iosInfo.identifierForVendor ?? 'IOS-DEVICE';
      } else if (defaultTargetPlatform == TargetPlatform.windows) {
        final windowsInfo = await _deviceInfo.windowsInfo;
        deviceId = windowsInfo.deviceId; // MachineGuid
      } else if (defaultTargetPlatform == TargetPlatform.macOS) {
        // MacOS doesn't expose a serial easily without entitlement, fallback
        deviceId = 'MAC-OS-DEVICE';
      }
    } catch (e) {
      debugPrint('Error getting device info: $e');
    }

    // Clean and extract last 6 chars
    final cleanId = deviceId.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').toUpperCase();
    if (cleanId.length < 6) {
      // Pad if too short (rare)
      return cleanId.padLeft(6, 'X');
    }
    return cleanId.substring(cleanId.length - 6);
  }

  /// Hashes a device suffix string (e.g. 6 chars) into a robust 16-bit integer (0-65535).
  /// This fits directly into the 'licenseId' field of the binary payload natively.
  static int encodeSuffix(String suffix) {
    if (suffix.isEmpty) return 0;
    
    int hash = 5381;
    for (int i = 0; i < suffix.length; i++) {
      hash = ((hash << 5) + hash) + suffix.codeUnitAt(i);
    }
    return hash & 0xFFFF; // Ensure 16-bit unsigned integer
  }

  /// Decodes a 16-bit integer representation for viewing purposes.
  static String decodeSuffix(int val) {
    return 'HASH-${val.toRadixString(16).toUpperCase()}';
  }
}
