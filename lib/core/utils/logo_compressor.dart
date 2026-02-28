import 'dart:typed_data';
import 'package:image/image.dart' as img;

class LogoCompressor {
  /// Compresses a logo image to be within safe SQLite limits (e.g., < 500KB)
  /// and resizes it to a maximum dimension (e.g., 512px).
  static Uint8List? compress(Uint8List? logoBytes, {int quality = 85, int maxDimension = 512}) {
    if (logoBytes == null || logoBytes.isEmpty) return null;

    try {
      final image = img.decodeImage(logoBytes);
      if (image == null) return logoBytes;

      // Resize if too large
      img.Image processed = image;
      if (image.width > maxDimension || image.height > maxDimension) {
        if (image.width > image.height) {
          processed = img.copyResize(image, width: maxDimension);
        } else {
          processed = img.copyResize(image, height: maxDimension);
        }
      }

      // Encode to JPG with limited quality to save space
      return Uint8List.fromList(img.encodeJpg(processed, quality: quality));
    } catch (e) {
      // If compression fails, return original or null to avoid crash
      return logoBytes;
    }
  }
}
