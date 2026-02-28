import 'dart:typed_data';

class SharingUtils {
  static Future<void> shareFile(Uint8List bytes, String fileName, {String? text}) async {
    // No-op on Web (or could implement generic download)
  }

  static Future<Uint8List?> readFileBytes(String path) async {
    return null;
  }
}
