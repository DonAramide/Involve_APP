import 'dart:typed_data';
import 'package:image/image.dart' as img;

class LogoProcessor {
  /// Processes a logo image and returns a high-contrast black version with a transparent background.
  /// 
  /// Following requirements:
  /// - Background removal (transparency)
  /// - Convert all visible elements to solid black (#000000)
  /// - Remove shadows, gradients, and colors
  /// - Preserve shape and proportions
  /// - Smooth edges (via simple antialiasing/blur)
  static Uint8List? processToBlackPng(Uint8List originalBytes) {
    final image = img.decodeImage(originalBytes);
    if (image == null) return null;

    // 1. Convert to black and white with transparency
    // We iterate through every pixel.
    // We treat "brightness" as the trigger for "logo vs background"
    // or we respect existing transparency.
    
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

        // Calculate luminance (brightness)
        final luminance = (0.299 * r + 0.587 * g + 0.114 * b);

        // Thresholding for background removal
        // If it's transparent OR very light, make it transparent.
        // Otherwise, make it solid black.
        if (a < 128 || luminance > 200) {
          processed.setPixel(x, y, img.ColorRgba8(0, 0, 0, 0));
        } else {
          processed.setPixel(x, y, img.ColorRgba8(0, 0, 0, 255));
        }
      }
    }

    // Optional: Smooth edges with a small blur and re-threshold
    final smoothed = img.gaussianBlur(processed, radius: 1);
    for (var y = 0; y < smoothed.height; y++) {
      for (var x = 0; x < smoothed.width; x++) {
        final p = smoothed.getPixel(x, y);
        if (p.a > 128) {
          smoothed.setPixel(x, y, img.ColorRgba8(0, 0, 0, 255));
        } else {
          smoothed.setPixel(x, y, img.ColorRgba8(0, 0, 0, 0));
        }
      }
    }

    return Uint8List.fromList(img.encodePng(smoothed));
  }

  /// Generates a vector SVG version of the logo by tracing horizontal segments.
  static String generateBlackSvg(Uint8List pngBytes) {
    final image = img.decodeImage(pngBytes);
    if (image == null) return '';

    final width = image.width;
    final height = image.height;
    final buffer = StringBuffer();
    buffer.write('<svg xmlns="http://www.w3.org/2000/svg" width="$width" height="$height" viewBox="0 0 $width $height">');
    buffer.write('<path d="');

    for (var y = 0; y < height; y++) {
      int? startX;
      for (var x = 0; x < width; x++) {
        final alpha = image.getPixel(x, y).a;
        final isBlack = alpha > 128;

        if (isBlack && startX == null) {
          startX = x;
        } else if (!isBlack && startX != null) {
          // Draw rect as sub-path M x y H x2 V y2 H x Z
          buffer.write('M$startX ${y}h${x - startX}v1h-${x - startX}z ');
          startX = null;
        }
      }
      if (startX != null) {
        buffer.write('M$startX ${y}h${width - startX}v1h-${width - startX}z ');
      }
    }

    buffer.write('" fill="black"/>');
    buffer.write('</svg>');
    return buffer.toString();
  }
}
