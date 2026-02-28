import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';

class DeviceInfoService {
  static final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();

  /// Returns the last 3 uppercase alphanumeric characters of the device ID.
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

    // Clean and extract last 3 chars
    final cleanId = deviceId.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').toUpperCase();
    if (cleanId.length < 3) {
      // Pad if too short (rare)
      return cleanId.padLeft(3, 'X');
    }
    return cleanId.substring(cleanId.length - 3);
  }

  /// Encodes a 3-char suffix (0-9A-Z) into a 16-bit integer (0-46655).
  /// This fits into the 'licenseId' field of the binary payload.
  static int encodeSuffix(String suffix) {
    if (suffix.length != 3) throw ArgumentError('Suffix must be exactly 3 characters');
    
    final chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; // Base36
    int val = 0;
    
    for (int i = 0; i < 3; i++) {
      final char = suffix[i].toUpperCase();
      final index = chars.indexOf(char);
      if (index == -1) {
         // Fallback for unexpected chars: treat as '0'
         val = val * 36 + 0;
      } else {
        val = val * 36 + index;
      }
    }
    
    return val & 0xFFFF; // Ensure 16-bit
  }

  /// Decodes a 16-bit integer back to a 3-char suffix.
  static String decodeSuffix(int val) {
    final chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    String result = '';
    int temp = val;
    
    for (int i = 0; i < 3; i++) {
      result = chars[temp % 36] + result;
      temp ~/= 36;
    }
    
    return result;
  }
}
