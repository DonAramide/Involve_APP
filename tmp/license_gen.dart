import 'dart:typed_data';
import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:base32/base32.dart';

enum PlanType { basic, pro, lifetime }

class LicenseModel {
  final String businessName;
  final DateTime expiryDate;
  final PlanType planType;
  final int licenseId;

  LicenseModel({
    required this.businessName,
    required this.expiryDate,
    required this.planType,
    required this.licenseId,
  });
}

class BinaryService {
  static Uint8List pack(LicenseModel license) {
    final buffer = Uint8List(11);
    final bdata = ByteData.view(buffer.buffer);
    final expiryTs = license.expiryDate.millisecondsSinceEpoch ~/ 1000;
    bdata.setUint32(0, expiryTs);
    bdata.setUint8(4, license.planType.index);
    final bizHash = generateBusinessHash(license.businessName);
    bdata.setUint32(5, bizHash);
    bdata.setUint16(9, license.licenseId);
    return buffer;
  }

  static int generateBusinessHash(String name) {
    final bytes = utf8.encode(name.toLowerCase().trim());
    final digest = sha1.convert(bytes);
    return ByteData.view(Uint8List.fromList(digest.bytes).buffer).getUint32(0);
  }
}

class Base32Service {
  static String encode(Uint8List data) {
    return base32.encode(data).replaceAll('=', '');
  }

  static String format(String raw) {
    final blocks = <String>[];
    for (int i = 0; i < raw.length; i += 4) {
      int end = (i + 4 < raw.length) ? i + 4 : raw.length;
      blocks.add(raw.substring(i, end));
    }
    return blocks.join('-');
  }
}

class LicenseGenerator {
  static const String _hmacSecret = "INVOLVE-SECURE-HMAC-SECRET-2024";

  static String generate(LicenseModel license) {
    final payload = BinaryService.pack(license);
    final hmac = Hmac(sha256, utf8.encode(_hmacSecret));
    final signature = hmac.convert(payload);
    final truncatedSignature = Uint8List.fromList(signature.bytes.sublist(0, 4));
    final finalBytes = Uint8List(15);
    finalBytes.setRange(0, 11, payload);
    finalBytes.setRange(11, 15, truncatedSignature);
    final rawKey = Base32Service.encode(finalBytes);
    return Base32Service.format(rawKey);
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
  final businessName = "Oldies Lounge & Bar";
  final deviceId = "012";
  final licenseId = encodeSuffix(deviceId);
  
  final license = LicenseModel(
    businessName: businessName,
    expiryDate: DateTime(2099, 12, 31),
    planType: PlanType.lifetime,
    licenseId: licenseId,
  );

  final key = LicenseGenerator.generate(license);
  print("Business Name: $businessName");
  print("Device ID: $deviceId (License ID: $licenseId)");
  print("Plan: Lifetime");
  print("Activation Code: $key");
}
