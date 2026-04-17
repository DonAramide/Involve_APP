import 'package:android_id/android_id.dart';
import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';

class DeviceInfoService {
  static final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();
  static const _androidIdPlugin = AndroidId();

  /// Returns the last 6 uppercase alphanumeric characters of the device ID.
  /// Uses a combination of fields for maximum stability and uniqueness.
  static Future<String> getDeviceSuffix() async {
    String deviceId = 'UNKNOWN';

    try {
      if (kIsWeb) {
        final webInfo = await _deviceInfo.webBrowserInfo;
        deviceId = webInfo.userAgent ?? 'WEB-CLIENT';
      } else if (defaultTargetPlatform == TargetPlatform.android) {
        // Use the truly unique Android ID instead of model/fingerprint
        final String? androidId = await _androidIdPlugin.getId();
        deviceId = androidId ?? 'ANDROID-UNKNOWN';
      } else if (defaultTargetPlatform == TargetPlatform.iOS) {
        final iosInfo = await _deviceInfo.iosInfo;
        deviceId = iosInfo.identifierForVendor ?? 'IOS-DEVICE';
      } else if (defaultTargetPlatform == TargetPlatform.windows) {
        final windowsInfo = await _deviceInfo.windowsInfo;
        deviceId = windowsInfo.deviceId; // MachineGuid
      } else if (defaultTargetPlatform == TargetPlatform.macOS) {
        deviceId = 'MAC-OS-DEVICE';
      }
    } catch (e) {
      debugPrint('Error getting device info: $e');
    }

    // Clean and extract last 6 chars
    final cleanId = deviceId.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').toUpperCase();
    if (cleanId.length < 6) {
      return cleanId.padLeft(6, '0');
    }
    return cleanId.substring(cleanId.length - 6);
  }

  /// Encodes a 6-char suffix (0-9A-Z) into a 32-bit integer.
  /// Max value 36^6 = 2,176,782,336 (fits comfortably in 32-bit signed/unsigned).
  static int encodeSuffix(String suffix) {
    if (suffix.length != 6) throw ArgumentError('Suffix must be exactly 6 characters');
    
    final chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    int val = 0;
    
    for (int i = 0; i < 6; i++) {
      final char = suffix[i].toUpperCase();
      final index = chars.indexOf(char);
      if (index == -1) {
         val = val * 36 + 0;
      } else {
        val = val * 36 + index;
      }
    }
    
    return val;
  }

  /// Decodes a 32-bit integer back to a 6-char suffix.
  static String decodeSuffix(int val) {
    final chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    String result = '';
    int temp = val;
    
    for (int i = 0; i < 6; i++) {
      result = chars[temp % 36] + result;
      temp ~/= 36;
    }
    
    return result;
  }
}
