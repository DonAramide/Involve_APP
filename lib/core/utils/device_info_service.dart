import 'package:device_info_plus/device_info_plus.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:permission_handler/permission_handler.dart';

import 'package:involve_app/features/settings/domain/services/security_service.dart';
class DeviceInfoService {
  static final DeviceInfoPlugin _deviceInfo = DeviceInfoPlugin();
  static const MethodChannel _mposChannel = MethodChannel('com.invify.app/mpos');

  static bool isUsableDeviceId(String? raw) {
    final clean = (raw ?? '').replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').toUpperCase();
    if (clean.length < 4) return false;
    const blocked = {
      'UNKNOWN',
      'NULL',
      'NONE',
      '0',
      'M1AJQ',
      'WEBCLIENT',
      'IOSDEVICE',
      'MACOSDEVICE',
      'UNASSIGNED',
      'WEBPORTAL',
    };
    return !blocked.contains(clean);
  }

  static String _clean(String? raw) =>
      (raw ?? '').replaceAll(RegExp(r'[^a-zA-Z0-9]'), '').toUpperCase();

  static Future<String?> _invokeSerial(String method) async {
    try {
      final value = await _mposChannel.invokeMethod<String>(method);
      final clean = _clean(value);
      return isUsableDeviceId(clean) ? clean : null;
    } catch (e) {
      debugPrint('Device serial $method failed: $e');
      return null;
    }
  }

  /// Always try native serial first. If it is null/unknown, request phone
  /// permission and read the hardware serial again before any UUID fallback.
  static Future<String?> _forceAndroidSerial() async {
    var serial = await _invokeSerial('getHardwareSerial');
    if (serial != null) return serial;

    var status = await Permission.phone.status;
    if (!status.isGranted) {
      status = await Permission.phone.request();
    }
    if (status.isGranted) {
      serial = await _invokeSerial('getHardwareSerial');
      if (serial != null) return serial;
    }

    serial = await _invokeSerial('getMposSerialNumber');
    if (serial != null) return serial;

    // Last native retry — serial can be empty for a moment at boot.
    for (var i = 0; i < 2; i++) {
      await Future<void>.delayed(const Duration(milliseconds: 350));
      serial = await _invokeSerial('getHardwareSerial');
      if (serial != null) return serial;
    }
    return null;
  }

  /// Returns the hardware serial / device ID. Never returns null.
  static Future<String> getDeviceSuffix() async {
    String deviceId = 'UNKNOWN';

    try {
      if (kIsWeb) {
        final webInfo = await _deviceInfo.webBrowserInfo;
        deviceId = webInfo.userAgent ?? 'WEB-CLIENT';
      } else if (defaultTargetPlatform == TargetPlatform.android) {
        deviceId = await _forceAndroidSerial() ?? 'UNKNOWN';
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

    final cleanId = _clean(deviceId);
    if (isUsableDeviceId(cleanId)) return cleanId;

    final persistentId = await SecurityService().getPersistentDeviceId();
    return persistentId.replaceAll('-', '').toUpperCase();
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
        final forced = await _forceAndroidSerial();
        if (forced != null) {
          deviceId = forced;
          serialNumber = forced;
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
    if (!isUsableDeviceId(_clean(deviceId))) {
      deviceId = suffix;
    }
    serialNumber ??= isUsableDeviceId(suffix) ? suffix : null;

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
