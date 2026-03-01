import 'dart:convert';
import 'package:crypto/crypto.dart';

void main() {
  const password = "admin123invify";
  const salt = "EMERGENCY-SALT-2024";
  final bytes = utf8.encode(password + salt);
  final hash = sha256.convert(bytes).toString();
  print("Calculated Hash for '$password$salt': $hash");
  const expectedEmergencyHash = "47fe409559c55f9e83f5087a32dbbe3e36e65b4c6883e1c6628b0561585c531d";
  print("Expected Emergency Hash: $expectedEmergencyHash");
  print("Match: ${hash == expectedEmergencyHash}");
}
