import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'dart:convert';
import 'license_model.dart';

class BinaryService {
  /// Packs the license data into a 11-byte buffer (before HMAC)
  /// [Expiry: 4][Plan: 1][BizHash: 4][LicenseID: 2] = 11 bytes
  static Uint8List pack(LicenseModel license) {
    final buffer = Uint8List(11);
    final bdata = ByteData.view(buffer.buffer);

    // 1. Expiry (4 bytes - 32-bit Unix timestamp)
    final expiryTs = license.expiryDate.millisecondsSinceEpoch ~/ 1000;
    bdata.setUint32(0, expiryTs);

    // 2. Plan Type (1 byte)
    bdata.setUint8(4, license.planType.index);

    // 3. Business Hash (4 bytes - truncated SHA1)
    final bizHash = generateBusinessHash(license.businessName);
    bdata.setUint32(5, bizHash);

    // 4. License ID (2 bytes - 16-bit int)
    bdata.setUint16(9, license.licenseId);

    return buffer;
  }

  /// Calculates a 32-bit hash of the business name for verification
  static int generateBusinessHash(String name) {
    final bytes = utf8.encode(name.toLowerCase().trim());
    final digest = sha1.convert(bytes);
    return ByteData.view(Uint8List.fromList(digest.bytes).buffer).getUint32(0);
  }

  /// Unpacks an 11-byte buffer back into components
  /// Returns a Map for validation purposes since we don't have the full business name yet
  static Map<String, dynamic> unpack(Uint8List data) {
    if (data.length != 11) throw Exception("Invalid payload length: ${data.length}");
    final bdata = ByteData.view(data.buffer, data.offsetInBytes, data.length);

    return {
      'expiryTs': bdata.getUint32(0),
      'planIndex': bdata.getUint8(4),
      'bizHash': bdata.getUint32(5),
      'licenseId': bdata.getUint16(9),
    };
  }
}
