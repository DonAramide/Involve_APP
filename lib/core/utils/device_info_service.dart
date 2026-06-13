import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';

class DeviceInfoService {
  static final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();
  static const MethodChannel _mposChannel = MethodChannel('com.invify.app/mpos');

  /// Returns the last 6 uppercase alphanumeric characters of the device ID.
  /// Uses MachineGUID on Windows/Linux, AndroidID on Android, IdentifierForVendor on iOS.
  static Future<String> getDeviceSuffix() async {
    String deviceId = 'UNKNOWN';

    try {
      if (kIsWeb) {
        final webInfo = await _deviceInfo.webBrowserInfo;
        deviceId = webInfo.userAgent ?? 'WEB-CLIENT';
      } else if (defaultTargetPlatform == TargetPlatform.android) {
        try {
          var status = await Permission.phone.status;
          if (!status.isGranted) {
            status = await Permission.phone.request();
          }
          if (status.isGranted) {
            final hardwareSerial = await _mposChannel.invokeMethod<String>('getHardwareSerial');
            if (hardwareSerial != null && hardwareSerial.toLowerCase() != 'unknown' && hardwareSerial.isNotEmpty) {
              deviceId = hardwareSerial;
            } else {
              final androidInfo = await _deviceInfo.androidInfo;
              deviceId = androidInfo.id;
            }
          } else {
            final androidInfo = await _deviceInfo.androidInfo;
            deviceId = androidInfo.id;
          }
        } catch (e) {
          debugPrint('Failed to get hardware serial: $e');
          final androidInfo = await _deviceInfo.androidInfo;
          deviceId = androidInfo.id;
        }
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

    // Clean and return the full hardware serial/device ID
    final cleanId = deviceId.replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').toUpperCase();
    return cleanId.isEmpty ? 'UNKNOWN' : cleanId;
  }

  /// Returns the last 6 characters of the full device ID for activation purposes.
  static Future<String> getShortDeviceSuffix() async {
    final fullId = await getDeviceSuffix();
    if (fullId == 'UNKNOWN' || fullId.length <= 6) return fullId;
    return fullId.substring(fullId.length - 6);
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

  /// Extracts comprehensive hardware specifications and platform diagnostics.
  static Future<Map<String, dynamic>> getDeviceDetails() async {
    String deviceId = 'UNKNOWN';
    String model = 'UNKNOWN';
    String brand = 'UNKNOWN';
    String osVersion = 'UNKNOWN';
    bool isPhysicalDevice = false;
    String os = 'UNKNOWN';
    String? serialNumber;

    try {
      if (kIsWeb) {
        final webInfo = await _deviceInfo.webBrowserInfo;
        deviceId = webInfo.userAgent ?? 'WEB-CLIENT';
        os = 'Web';
        model = webInfo.browserName.name;
        brand = webInfo.appName ?? 'WebBrowser';
        osVersion = webInfo.appVersion ?? 'unknown';
      } else if (defaultTargetPlatform == TargetPlatform.android) {
        final androidInfo = await _deviceInfo.androidInfo;
        
        try {
          var status = await Permission.phone.status;
          if (!status.isGranted) {
            status = await Permission.phone.request();
          }
          if (status.isGranted) {
            final hardwareSerial = await _mposChannel.invokeMethod<String>('getHardwareSerial');
            if (hardwareSerial != null && hardwareSerial.toLowerCase() != 'unknown' && hardwareSerial.isNotEmpty) {
              deviceId = hardwareSerial;
              serialNumber = hardwareSerial;
            } else {
              deviceId = androidInfo.id;
            }
          } else {
            deviceId = androidInfo.id;
          }
        } catch (e) {
          debugPrint('Failed to get hardware serial: $e');
          deviceId = androidInfo.id;
        }

        os = 'Android';
        model = androidInfo.model;
        brand = androidInfo.brand;
        osVersion = androidInfo.version.release;
        isPhysicalDevice = androidInfo.isPhysicalDevice;
      } else if (defaultTargetPlatform == TargetPlatform.iOS) {
        final iosInfo = await _deviceInfo.iosInfo;
        deviceId = iosInfo.identifierForVendor ?? 'IOS-DEVICE';
        os = 'iOS';
        model = iosInfo.utsname.machine;
        brand = 'Apple';
        osVersion = iosInfo.systemVersion;
        isPhysicalDevice = iosInfo.isPhysicalDevice;
      } else if (defaultTargetPlatform == TargetPlatform.windows) {
        final windowsInfo = await _deviceInfo.windowsInfo;
        deviceId = windowsInfo.deviceId;
        os = 'Windows';
        model = windowsInfo.productName;
        brand = windowsInfo.registeredOwner.isEmpty ? 'Microsoft' : windowsInfo.registeredOwner;
        osVersion = '${windowsInfo.majorVersion}.${windowsInfo.minorVersion}';
        isPhysicalDevice = true;
      } else if (defaultTargetPlatform == TargetPlatform.macOS) {
        os = 'macOS';
        deviceId = 'MAC-OS-DEVICE';
      }
    } catch (e) {
      debugPrint('Error getting device details: $e');
    }

    final suffix = await getDeviceSuffix();

    return {
      'deviceId': deviceId,
      'deviceSuffix': suffix,
      'os': os,
      'model': model,
      'brand': brand,
      'osVersion': osVersion,
      'isPhysicalDevice': isPhysicalDevice,
      'androidId': defaultTargetPlatform == TargetPlatform.android ? deviceId : null,
      'serialNumber': serialNumber,
    };
  }
}
