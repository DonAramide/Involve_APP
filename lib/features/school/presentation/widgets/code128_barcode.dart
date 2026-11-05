import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';

/// Code 128 subset B — same patterns as the web ID card barcode.
const _patterns = <String>[
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
];

List<int> encodeCode128B(String text) {
  if (text.isEmpty || text.length > 80) {
    throw ArgumentError('Code 128 needs 1–80 printable characters.');
  }
  final codes = <int>[104]; // Start B
  for (final unit in text.codeUnits) {
    final value = unit - 32;
    if (value < 0 || value > 95) {
      throw ArgumentError('Code 128 subset B only supports printable ASCII.');
    }
    codes.add(value);
  }
  var sum = codes[0];
  for (var i = 1; i < codes.length; i++) {
    sum += codes[i] * i;
  }
  codes.add(sum % 103);
  codes.add(106); // Stop
  return codes;
}

/// Module widths for black/white runs (quiet zone included).
List<int> code128Modules(String text) {
  final codes = encodeCode128B(text);
  final sequence = codes.map((c) => _patterns[c]).join();
  const quiet = 10;
  final modules = <int>[quiet];
  for (var i = 0; i < sequence.length; i++) {
    modules.add(int.parse(sequence[i]));
  }
  modules.add(quiet);
  return modules;
}

class Code128Barcode extends StatelessWidget {
  final String value;
  final double height;
  final Color barColor;
  final Color backgroundColor;

  const Code128Barcode({
    super.key,
    required this.value,
    this.height = 56,
    this.barColor = Colors.black,
    this.backgroundColor = Colors.white,
  });

  @override
  Widget build(BuildContext context) {
    try {
      final modules = code128Modules(value);
      return CustomPaint(
        size: Size(double.infinity, height),
        painter: _Code128Painter(modules, barColor, backgroundColor),
      );
    } catch (_) {
      return SizedBox(
        height: height,
        child: const Center(
          child: Text('Barcode unavailable', style: TextStyle(fontSize: 12, color: Colors.black54)),
        ),
      );
    }
  }
}

class _Code128Painter extends CustomPainter {
  final List<int> modules;
  final Color barColor;
  final Color backgroundColor;

  _Code128Painter(this.modules, this.barColor, this.backgroundColor);

  @override
  void paint(Canvas canvas, Size size) {
    final total = modules.fold<int>(0, (a, b) => a + b);
    if (total <= 0 || size.width <= 0) return;
    canvas.drawRect(Offset.zero & size, Paint()..color = backgroundColor);
    // Integer module width — never thinner than 2px (thermal-test style bars).
    final modulePx = (size.width / total).floor().clamp(2, 8);
    final barcodeW = modulePx * total;
    var x = ((size.width - barcodeW) / 2).floorToDouble();
    for (var i = 0; i < modules.length; i++) {
      final w = (modules[i] * modulePx).toDouble();
      final black = i > 0 && (i % 2 == 1);
      if (black) {
        canvas.drawRect(
          Rect.fromLTWH(x, 0, w, size.height),
          Paint()
            ..color = barColor
            ..isAntiAlias = false,
        );
      }
      x += w;
    }
  }

  @override
  bool shouldRepaint(covariant _Code128Painter oldDelegate) =>
      oldDelegate.modules != modules ||
      oldDelegate.barColor != barColor ||
      oldDelegate.backgroundColor != backgroundColor;
}

/// True when Code 128 bars would stay >= [minModulePx] wide inside [widthPx].
bool code128FitsWidth(String value, double widthPx, {int minModulePx = 2}) {
  try {
    final total = code128Modules(value).fold<int>(0, (a, b) => a + b);
    return total > 0 && total * minModulePx <= widthPx;
  } catch (_) {
    return false;
  }
}

/// Rasterize Code 128 to PNG for thermal/PDF ImageCommand printing.
///
/// [minModulePx] is reserved for callers that need to decide fit; painting
/// always uses the largest integer module that fits [width] (minimum 1).
Future<Uint8List?> code128PngBytes(
  String value, {
  int width = 520,
  int height = 120,
  int minModulePx = 1,
}) async {
  try {
    final modules = code128Modules(value);
    final total = modules.fold<int>(0, (a, b) => a + b);
    if (total <= 0) return null;
    // Widen canvas if needed so [minModulePx] can be honoured for short tokens.
    final needed = total * minModulePx;
    final paintWidth = math.max(width, needed);
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final size = Size(paintWidth.toDouble(), height.toDouble());
    _Code128Painter(modules, const Color(0xFF000000), const Color(0xFFFFFFFF)).paint(canvas, size);
    final picture = recorder.endRecording();
    final image = await picture.toImage(paintWidth, height);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    return bytes?.buffer.asUint8List();
  } catch (_) {
    return null;
  }
}
