import 'package:geolocator/geolocator.dart';

/// NUS Field 120 TLV for POS geo-coordinates (CBN / NIBSS geo-tagging).
/// Sample: 010806.524400209003.37921
class NibssGeoFix {
  const NibssGeoFix({required this.latitude, required this.longitude});

  final double latitude;
  final double longitude;

  String get field120 => NibssGeo.toField120(latitude, longitude);

  Map<String, dynamic> toJson() => {
        'latitude': latitude,
        'longitude': longitude,
        'field120': field120,
      };
}

class NibssGeo {
  static String formatLatitude(double latitude) =>
      _formatCoordinate(latitude, degreeWidth: 2);

  static String formatLongitude(double longitude) =>
      _formatCoordinate(longitude, degreeWidth: 3);

  static String toField120(double latitude, double longitude) {
    final lat = formatLatitude(latitude);
    final lon = formatLongitude(longitude);
    return '01${lat.length.toString().padLeft(2, '0')}$lat'
        '02${lon.length.toString().padLeft(2, '0')}$lon';
  }

  static String _formatCoordinate(double value, {required int degreeWidth}) {
    final sign = value < 0 ? '-' : '';
    final formatted = value.abs().toStringAsFixed(5);
    final separator = formatted.indexOf('.');
    final degrees = formatted.substring(0, separator).padLeft(degreeWidth, '0');
    final fraction = formatted.substring(separator + 1);
    return '$sign$degrees.$fraction';
  }

  static Future<NibssGeoFix?> capture() async {
    try {
      final serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return null;

      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.denied ||
          permission == LocationPermission.deniedForever) {
        return null;
      }

      Position? position = await Geolocator.getLastKnownPosition();
      position ??= await Geolocator.getCurrentPosition(
        desiredAccuracy: LocationAccuracy.medium,
        timeLimit: const Duration(seconds: 12),
      );
      return NibssGeoFix(
        latitude: position.latitude,
        longitude: position.longitude,
      );
    } catch (_) {
      return null;
    }
  }
}
