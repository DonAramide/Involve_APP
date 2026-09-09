import 'dart:async';

import 'package:geolocator/geolocator.dart';

class RequiredLocationResult {
  const RequiredLocationResult._({
    required this.ok,
    this.location,
    this.error,
    this.openAppSettings = false,
    this.openLocationSettings = false,
  });

  final bool ok;
  final String? location;
  final String? error;
  final bool openAppSettings;
  final bool openLocationSettings;

  factory RequiredLocationResult.success(String location) =>
      RequiredLocationResult._(ok: true, location: location);

  factory RequiredLocationResult.fail(
    String error, {
    bool openAppSettings = false,
    bool openLocationSettings = false,
  }) =>
      RequiredLocationResult._(
        ok: false,
        error: error,
        openAppSettings: openAppSettings,
        openLocationSettings: openLocationSettings,
      );
}

/// Always asks for location permission and a live GPS fix before the app continues.
class RequiredLocation {
  static final _gpsPattern =
      RegExp(r'Lat:\s*-?\d+(\.\d+)?,\s*Lng:\s*-?\d+(\.\d+)?');

  static bool isValid(String? location) {
    final value = (location ?? '').trim();
    return _gpsPattern.hasMatch(value);
  }

  static String format(Position position) =>
      'Lat: ${position.latitude.toStringAsFixed(6)}, Lng: ${position.longitude.toStringAsFixed(6)}';

  static Future<RequiredLocationResult> capture() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        return RequiredLocationResult.fail(
          'Turn on GPS / location services, then try again.',
          openLocationSettings: true,
        );
      }

      // Always request. If already granted, the OS returns immediately.
      var permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied) {
        return RequiredLocationResult.fail(
          'Location permission is required before you can continue.',
        );
      }
      if (permission == LocationPermission.deniedForever) {
        return RequiredLocationResult.fail(
          'Location is blocked for Invify. Enable it in Settings, then try again.',
          openAppSettings: true,
        );
      }

      final position = await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.high,
      ).timeout(const Duration(seconds: 20));

      final location = format(position);
      if (!isValid(location)) {
        return RequiredLocationResult.fail(
          'GPS returned an invalid location. Please try again.',
        );
      }
      return RequiredLocationResult.success(location);
    } on TimeoutException {
      return RequiredLocationResult.fail(
        'Could not get a GPS fix. Move outdoors or near a window, then try again.',
      );
    } catch (_) {
      return RequiredLocationResult.fail(
        'Could not capture location. Enable GPS and try again.',
      );
    }
  }

  static Future<void> openSettings(RequiredLocationResult result) async {
    if (result.openLocationSettings) {
      await Geolocator.openLocationSettings();
    } else if (result.openAppSettings) {
      await Geolocator.openAppSettings();
    }
  }
}
