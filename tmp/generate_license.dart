import 'dart:typed_data';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:base32/base32.dart';

// Copying necessary logic from the codebase to avoid dependency issues in a standalone script
enum PlanType { basic, pro, lifetime }

class BinaryService {
  static Uint8List pack(String businessName, DateTime expiryDate, PlanType planType, int licenseId) {
    final buffer = Uint8List(11);
    final bdata = ByteData.view(buffer.buffer);

    final expiryTs = expiryDate.millisecondsSinceEpoch ~/ 1000;
    bdata.setUint32(0, expiryTs);

    bdata.setUint8(4, planType.index);

    final bizHash = generateBusinessHash(businessName);
    bdata.setUint32(5, bizHash);

    bdata.setUint16(9, licenseId);

    return buffer;
  }

  static int generateBusinessHash(String name) {
    final bytes = utf8.encode(name.toLowerCase().trim());
    final digest = sha1.convert(bytes);
    return ByteData.view(Uint8List.fromList(digest.bytes).buffer).getUint32(0);
  }
}

int encodeSuffix(String suffix) {
  final chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  int val = 0;
  for (int i = 0; i < 3; i++) {
    final char = suffix[i].toUpperCase();
    final index = chars.indexOf(char);
    val = val * 36 + (index == -1 ? 0 : index);
  }
  return val & 0xFFFF;
}

void main() {
  const String businessName = "Wendy International School";
  const String suffix = "011";
  final DateTime expiryDate = DateTime(2099, 12, 31);
  const PlanType planType = PlanType.lifetime;
  const String hmacSecret = "INVOLVE-SECURE-HMAC-SECRET-2024";

  final int licenseId = encodeSuffix(suffix);
  final Uint8List payload = BinaryService.pack(businessName, expiryDate, planType, licenseId);

  final hmac = Hmac(sha256, utf8.encode(hmacSecret));
  final signature = hmac.convert(payload).bytes.sublist(0, 4);

  final Uint8List totalBytes = Uint8List(15);
  totalBytes.setRange(0, 11, payload);
  totalBytes.setRange(11, 15, signature);

  final String base32Key = base32.encode(totalBytes).replaceAll('=', '');
  
  // Format into blocks of 4
  final blocks = <String>[];
  for (int i = 0; i < base32Key.length; i += 4) {
    int end = (i + 4 < base32Key.length) ? i + 4 : base32Key.length;
    blocks.add(base32Key.substring(i, end));
  }
  final String formattedKey = blocks.join('-');

  print('Business Name: $businessName');
  print('Device Suffix: $suffix');
  print('License Key: $formattedKey');
}
