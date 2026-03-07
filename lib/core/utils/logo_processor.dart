import 'dart:typed_data';
import 'package:image/image.dart' as img;

class LogoProcessor {
  /// Processes a logo image to have a transparent background while keeping original colors.
  /// 
  /// Following requirements:
  /// - Background removal (near-white pixels made transparent)
  /// - Preserve original colors and proportions
  static Uint8List? processLogoWithTransparency(Uint8List originalBytes) {
    final image = img.decodeImage(originalBytes);
    if (image == null) return null;

    // Create a new image with alpha channel
    final processed = img.Image(
      width: image.width,
      height: image.height,
      numChannels: 4, // RGBA
    );

    for (var y = 0; y < image.height; y++) {
      for (var x = 0; x < image.width; x++) {
        final pixel = image.getPixel(x, y);
        final r = pixel.r;
        final g = pixel.g;
        final b = pixel.b;
        final a = pixel.a;

        // If pixel is already very transparent, keep it.
        if (a < 50) {
          processed.setPixel(x, y, img.ColorRgba8(r.toInt(), g.toInt(), b.toInt(), 0));
          continue;
        }

        // Calculate luminance (brightness) to detect white background
        final luminance = (0.299 * r + 0.587 * g + 0.114 * b);

        // If it's very light (near white), make it transparent.
        // Using 240 as threshold for "white enough"
        if (luminance > 240 && r > 230 && g > 230 && b > 230) {
          processed.setPixel(x, y, img.ColorRgba8(r.toInt(), g.toInt(), b.toInt(), 0));
        } else {
          processed.setPixel(x, y, img.ColorRgba8(r.toInt(), g.toInt(), b.toInt(), a.toInt()));
        }
      }
    }

    return Uint8List.fromList(img.encodePng(processed));
  }

  /// SVGs for colored logos are complex to generate here. 
  /// Returning a dummy SVG or just return background-less PNG.
  /// Thermal printers usually handle PNGs fine.
  static String? generateSimpleSvg(Uint8List pngBytes) {
    // For now, return null or an empty string as we don't want to force 
    // color-tracing which is beyond simple script capabilities.
    return null;
  }
}
