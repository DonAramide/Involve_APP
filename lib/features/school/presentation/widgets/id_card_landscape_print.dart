import 'dart:math' as math;
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:image/image.dart' as img;
import 'package:involve_app/features/school/presentation/widgets/code128_barcode.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

/// Professional CR80 landscape ID card (85.60 × 53.98 mm) for preview, PDF and thermal.
///
/// Preview/PDF keep true landscape. Thermal rotates 90° so the short edge sits
/// across 58/80mm paper with trimable side margins.
class IdCardLandscapePrint {
  IdCardLandscapePrint._();

  static const double cardWidthMm = 85.60;
  static const double cardHeightMm = 53.98;
  static const int previewDpi = 300;

  static int get cardWidthPx => mmToPx(cardWidthMm, previewDpi);
  static int get cardHeightPx => mmToPx(cardHeightMm, previewDpi);

  static int mmToPx(double mm, int dpi) => (mm / 25.4 * dpi).round();

  static double pt(double points, int dpi) => points * dpi / 72.0;

  /// Printable dots across the thermal roll (~203 DPI class printers).
  static int paperDots(int paperWidthMm) => paperWidthMm >= 80 ? 576 : 384;

  /// Short edge of CR80 across the roll (leaves trim margins on 80mm).
  static int cardAcrossDots(int paperWidthMm) {
    final paper = paperDots(paperWidthMm);
    return (paper * 0.72).round().clamp(240, paper);
  }

  /// Landscape CR80 PNG. Preview/PDF use 300 DPI; thermal uses printer-native width.
  static Future<Uint8List?> renderSide({
    required String side,
    required int paperWidthMm,
    required String organizationName,
    required String fullName,
    required String category,
    required String printedCode,
    String? detail,
    String? hmoName,
    String? enrolleeId,
    String? address,
    String? disclaimer,
    String? returnHint,
    String? authorizedSignatory,
    String? groupFieldLabel,
    String? accentHex,
    Uint8List? photoBytes,
    Uint8List? logoBytes,
    required String barcodePayload,
    String? scanHint,
    bool forThermal = false,
    int? dpi,
  }) async {
    final renderDpi = dpi ??
        (forThermal
            ? (paperDots(paperWidthMm) / (cardWidthMm / 25.4)).round().clamp(180, 220)
            : previewDpi);
    final w = mmToPx(cardWidthMm, renderDpi);
    final h = mmToPx(cardHeightMm, renderDpi);
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder);
    final card = Rect.fromLTWH(0, 0, w.toDouble(), h.toDouble());
    canvas.drawRect(card, Paint()..color = Colors.white);

    final accent = _parseAccent(accentHex);
    if (side == 'back') {
      await _paintBack(
        canvas: canvas,
        card: card,
        accent: accent,
        dpi: renderDpi,
        organizationName: organizationName,
        address: address,
        disclaimer: disclaimer,
        returnHint: returnHint,
        authorizedSignatory: authorizedSignatory,
        logoBytes: logoBytes,
        barcodePayload: barcodePayload,
        printedCode: printedCode,
      );
    } else {
      await _paintFront(
        canvas: canvas,
        card: card,
        accent: accent,
        dpi: renderDpi,
        organizationName: organizationName,
        address: address,
        fullName: fullName,
        category: category,
        printedCode: printedCode,
        detail: detail,
        hmoName: hmoName,
        enrolleeId: enrolleeId,
        groupFieldLabel: groupFieldLabel,
        photoBytes: photoBytes,
        logoBytes: logoBytes,
        barcodePayload: barcodePayload,
        scanHint: scanHint,
      );
    }

    canvas.drawRRect(
      RRect.fromRectAndRadius(card.deflate(1.5), const Radius.circular(8)),
      Paint()
        ..color = const Color(0xFF1A1A1A)
        ..style = PaintingStyle.stroke
        ..strokeWidth = math.max(2, pt(0.5, renderDpi)),
    );

    final picture = recorder.endRecording();
    final image = await picture.toImage(w, h);
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    image.dispose();
    picture.dispose();
    final png = bytes?.buffer.asUint8List();
    if (png == null) return null;
    if (!forThermal) return png;
    return prepareThermalStrip(png, paperWidthMm);
  }

  /// Scale landscape CR80 to the thermal roll width (no rotation).
  ///
  /// Keeps the same orientation as Preview so text/barcode stay upright and
  /// Code 128 modules stay as wide as the paper allows. ESC * (receipt logos)
  /// already prints this orientation correctly on Invify Bluetooth printers.
  static Future<Uint8List?> prepareThermalStrip(
    Uint8List landscapePng,
    int paperWidthMm,
  ) async {
    final decoded = img.decodeImage(landscapePng);
    if (decoded == null) return null;
    final paper = paperDots(paperWidthMm);
    // Leave a few dots of side margin; width must be a multiple of 8.
    final targetW = ((paper - 16) ~/ 8) * 8;
    var work = img.copyResize(
      decoded,
      width: targetW,
      height: (decoded.height * (targetW / decoded.width)).round(),
      interpolation: img.Interpolation.cubic,
    );
    final gray = img.grayscale(work);
    // Hard 1-bit: solid header/photo blocks, sharp barcode bars (no dither grain).
    for (var y = 0; y < gray.height; y++) {
      for (var x = 0; x < gray.width; x++) {
        final v = gray.getPixel(x, y).r.toInt();
        final boosted = v < 128 ? 0 : 255;
        gray.setPixelRgb(x, y, boosted, boosted, boosted);
      }
    }
    return Uint8List.fromList(img.encodePng(gray));
  }

  /// Two-page CR80 PDF (front then back) at actual physical size.
  static Future<Uint8List> buildPdf({
    required Uint8List frontPng,
    required Uint8List backPng,
  }) async {
    final doc = pw.Document();
    final pageFormat = PdfPageFormat(
      cardWidthMm * PdfPageFormat.mm,
      cardHeightMm * PdfPageFormat.mm,
      marginAll: 0,
    );
    for (final bytes in [frontPng, backPng]) {
      final image = pw.MemoryImage(bytes);
      doc.addPage(
        pw.Page(
          pageFormat: pageFormat,
          build: (_) => pw.SizedBox(
            width: pageFormat.width,
            height: pageFormat.height,
            child: pw.Image(image, fit: pw.BoxFit.fill),
          ),
        ),
      );
    }
    return doc.save();
  }

  static Color _parseAccent(String? accentHex) {
    final raw = (accentHex ?? '#1F4B99').replaceAll('#', '');
    if (raw.length == 6) {
      final value = int.tryParse(raw, radix: 16);
      if (value != null) return Color(0xFF000000 | value);
    }
    return const Color(0xFF1F4B99);
  }

  static Future<void> _paintFront({
    required Canvas canvas,
    required Rect card,
    required Color accent,
    required int dpi,
    required String organizationName,
    String? address,
    required String fullName,
    required String category,
    required String printedCode,
    String? detail,
    String? hmoName,
    String? enrolleeId,
    String? groupFieldLabel,
    Uint8List? photoBytes,
    Uint8List? logoBytes,
    required String barcodePayload,
    String? scanHint,
  }) async {
    // Physical pt targets from the thermal brief (bold, high contrast).
    final orgName = pt(12, dpi);
    final orgAddress = pt(8, dpi);
    final personName = pt(13, dpi);
    final personMeta = pt(10, dpi);
    final tokenSize = pt(10, dpi);
    final roleSize = pt(8, dpi);

    // Header band — tenant name + address centered
    final headerH = card.height * 0.22;
    final header = Rect.fromLTWH(card.left, card.top, card.width, headerH);
    canvas.drawRect(header, Paint()..color = accent);

    final logoSize = headerH * 0.68;
    if (logoBytes != null) {
      await _paintImageBytes(
        canvas,
        logoBytes,
        Rect.fromLTWH(header.left + 8, header.top + (headerH - logoSize) / 2, logoSize, logoSize),
        fit: BoxFit.contain,
      );
    }
    _drawText(
      canvas,
      organizationName.trim().isEmpty ? 'Organisation' : organizationName.trim(),
      Rect.fromLTWH(card.left + 10, header.top + 6, card.width - 20, headerH * 0.52),
      TextStyle(
        color: _inkOn(accent),
        fontWeight: FontWeight.w900,
        fontSize: orgName,
      ),
      align: TextAlign.center,
      maxLines: 1,
    );
    if ((address ?? '').trim().isNotEmpty) {
      _drawText(
        canvas,
        address!.trim(),
        Rect.fromLTWH(card.left + 12, header.top + headerH * 0.55, card.width - 24, headerH * 0.38),
        TextStyle(
          color: _inkOn(accent),
          fontWeight: FontWeight.w800,
          fontSize: orgAddress,
        ),
        align: TextAlign.center,
        maxLines: 1,
      );
    }

    // Body: photo + student/staff identity
    final bodyTop = header.bottom + pt(2, dpi);
    final bodyBottom = card.bottom - card.height * 0.30;
    final photoH = bodyBottom - bodyTop;
    final photoW = photoH * 0.72;
    final photoRect = Rect.fromLTWH(card.left + 12, bodyTop, photoW, photoH);
    canvas.drawRRect(
      RRect.fromRectAndRadius(photoRect, const Radius.circular(6)),
      Paint()..color = const Color(0xFFE6E8EC),
    );
    canvas.drawRRect(
      RRect.fromRectAndRadius(photoRect, const Radius.circular(6)),
      Paint()
        ..color = const Color(0xFF333333)
        ..style = PaintingStyle.stroke
        ..strokeWidth = 1.2,
    );
    if (photoBytes != null) {
      final ok = await _paintImageBytes(canvas, photoBytes, photoRect.deflate(1.5), fit: BoxFit.cover);
      if (!ok) _drawCenteredInitials(canvas, photoRect, fullName, accent);
    } else {
      _drawCenteredInitials(canvas, photoRect, fullName, accent);
    }

    final infoLeft = photoRect.right + 14;
    final infoWidth = card.right - infoLeft - 12;
    var y = bodyTop;
    _drawChip(
      canvas,
      Rect.fromLTWH(infoLeft, y, math.min(infoWidth * 0.7, pt(72, dpi)), pt(11, dpi)),
      category,
      accent,
      fontSize: roleSize,
    );
    y += pt(13, dpi);
    _drawText(
      canvas,
      fullName,
      Rect.fromLTWH(infoLeft, y, infoWidth, pt(16, dpi)),
      TextStyle(color: const Color(0xFF000000), fontWeight: FontWeight.w900, fontSize: personName),
      maxLines: 2,
    );
    y += pt(16, dpi);
    _drawText(
      canvas,
      'ID No: $printedCode',
      Rect.fromLTWH(infoLeft, y, infoWidth, pt(12, dpi)),
      TextStyle(color: const Color(0xFF000000), fontWeight: FontWeight.w800, fontSize: personMeta),
    );
    y += pt(12, dpi);
    if ((detail ?? '').trim().isNotEmpty) {
      final field = (groupFieldLabel ?? 'Detail').trim();
      _drawText(
        canvas,
        '$field: ${detail!.trim()}',
        Rect.fromLTWH(infoLeft, y, infoWidth, pt(11, dpi)),
        TextStyle(color: const Color(0xFF111111), fontWeight: FontWeight.w800, fontSize: personMeta),
      );
      y += pt(11, dpi);
    }
    if ((hmoName ?? '').trim().isNotEmpty) {
      _drawText(
        canvas,
        'HMO: ${hmoName!.trim()}',
        Rect.fromLTWH(infoLeft, y, infoWidth, pt(11, dpi)),
        TextStyle(color: const Color(0xFF111111), fontWeight: FontWeight.w800, fontSize: personMeta),
      );
      y += pt(11, dpi);
    }
    if ((enrolleeId ?? '').trim().isNotEmpty) {
      _drawText(
        canvas,
        'Enrollee ID: ${enrolleeId!.trim()}',
        Rect.fromLTWH(infoLeft, y, infoWidth, pt(11, dpi)),
        TextStyle(color: const Color(0xFF111111), fontWeight: FontWeight.w800, fontSize: personMeta),
      );
    }

    // Code 128: 12-char identity only, centered (~65% card width max).
    final barcodeTop = card.bottom - card.height * 0.28;
    final barcodeMaxW = card.width * 0.65;
    final barcodeArea = Rect.fromLTWH(
      card.left + (card.width - barcodeMaxW) / 2,
      barcodeTop,
      barcodeMaxW,
      card.height * 0.15,
    );
    await _drawScanableCode128(canvas, barcodeArea, barcodePayload);
    _drawText(
      canvas,
      barcodePayload.trim().isEmpty ? printedCode : barcodePayload.trim().toUpperCase(),
      Rect.fromLTWH(card.left + 20, barcodeArea.bottom + 2, card.width - 40, 30),
      TextStyle(
        color: const Color(0xFF000000),
        fontWeight: FontWeight.w900,
        fontSize: tokenSize,
        letterSpacing: 1.2,
        fontFamily: 'monospace',
      ),
      align: TextAlign.center,
    );

    final footer = Rect.fromLTWH(card.left, card.bottom - pt(2.5, dpi), card.width, pt(2.5, dpi));
    canvas.drawRect(footer, Paint()..color = accent);
  }

  static Future<void> _paintBack({
    required Canvas canvas,
    required Rect card,
    required Color accent,
    required int dpi,
    required String organizationName,
    String? address,
    String? disclaimer,
    String? returnHint,
    String? authorizedSignatory,
    Uint8List? logoBytes,
    required String barcodePayload,
    required String printedCode,
  }) async {
    final orgName = pt(12, dpi);
    final orgAddress = pt(8, dpi);
    final heading = pt(9, dpi);
    final body = pt(8, dpi);
    final meta = pt(8, dpi);
    final tokenSize = pt(9, dpi);

    final headerH = card.height * 0.20;
    final header = Rect.fromLTWH(card.left, card.top, card.width, headerH);
    canvas.drawRect(header, Paint()..color = accent);
    _drawText(
      canvas,
      organizationName.trim().isEmpty ? 'Organisation' : organizationName.trim(),
      Rect.fromLTWH(card.left + 10, header.top + 4, card.width - 20, headerH * 0.52),
      TextStyle(color: _inkOn(accent), fontWeight: FontWeight.w900, fontSize: orgName),
      align: TextAlign.center,
      maxLines: 1,
    );
    if ((address ?? '').trim().isNotEmpty) {
      _drawText(
        canvas,
        address!.trim(),
        Rect.fromLTWH(card.left + 12, header.top + headerH * 0.52, card.width - 24, headerH * 0.40),
        TextStyle(color: _inkOn(accent), fontWeight: FontWeight.w800, fontSize: orgAddress),
        align: TextAlign.center,
        maxLines: 1,
      );
    }
    if (logoBytes != null) {
      final s = headerH * 0.68;
      await _paintImageBytes(
        canvas,
        logoBytes,
        Rect.fromLTWH(header.left + 8, header.top + (headerH - s) / 2, s, s),
        fit: BoxFit.contain,
      );
    }

    // Fixed bottom bands so contact never shares Y with signatory/barcode.
    // Layout (top → bottom): header → terms → contact → divider → signatory | barcode
    final bottomPad = pt(2, dpi);
    final barcodeH = card.height * 0.11;
    final codeLabelH = pt(9, dpi);
    final sigBlockH = pt(20, dpi);
    final lowerH = math.max(barcodeH + codeLabelH, sigBlockH) + bottomPad;
    final dividerY = card.bottom - lowerH - pt(1, dpi);
    final hasContact = (returnHint ?? '').trim().isNotEmpty;
    // Two lines of meta type (~8pt × 1.15) need ~22pt of vertical room.
    final contactH = hasContact ? pt(22, dpi) : 0.0;
    final contactTop = dividerY - contactH - (hasContact ? pt(3, dpi) : 0);

    var y = header.bottom + pt(2, dpi);
    _drawText(
      canvas,
      'TERMS AND CONDITIONS',
      Rect.fromLTWH(card.left + 12, y, card.width - 24, pt(11, dpi)),
      TextStyle(color: const Color(0xFF000000), fontWeight: FontWeight.w900, fontSize: heading, letterSpacing: 0.3),
      align: TextAlign.center,
    );
    y += pt(12, dpi);

    final terms = (disclaimer ?? '').trim().isNotEmpty
        ? disclaimer!.trim()
        : 'This card remains the property of the issuing institution. '
            'Present this card when requested by authorised personnel. '
            'Unauthorized use, alteration, or transfer is prohibited.';
    final termsBottom = contactTop - pt(1, dpi);
    if (termsBottom > y + 4) {
      _drawText(
        canvas,
        terms,
        Rect.fromLTWH(card.left + 12, y, card.width - 24, termsBottom - y),
        TextStyle(color: const Color(0xFF000000), fontSize: body, height: 1.25, fontWeight: FontWeight.w700),
        maxLines: 5,
        align: TextAlign.left,
      );
    }

    if (hasContact) {
      _drawText(
        canvas,
        returnHint!.trim(),
        Rect.fromLTWH(card.left + 12, contactTop, card.width - 24, contactH),
        TextStyle(color: const Color(0xFF000000), fontSize: meta, height: 1.15, fontWeight: FontWeight.w800),
        maxLines: 2,
        align: TextAlign.left,
      );
    }

    canvas.drawLine(
      Offset(card.left + 12, dividerY),
      Offset(card.right - 12, dividerY),
      Paint()
        ..color = const Color(0xFFCCCCCC)
        ..strokeWidth = 1,
    );

    final lowerTop = dividerY + pt(2, dpi);
    final sigWidth = card.width * 0.40;
    _drawText(
      canvas,
      'Authorized signatory',
      Rect.fromLTWH(card.left + 12, lowerTop, sigWidth, pt(9, dpi)),
      TextStyle(color: const Color(0xFF000000), fontWeight: FontWeight.w900, fontSize: meta),
    );
    _drawText(
      canvas,
      (authorizedSignatory ?? 'Administrator').trim(),
      Rect.fromLTWH(card.left + 12, lowerTop + pt(9, dpi), sigWidth, pt(9, dpi)),
      TextStyle(color: const Color(0xFF111111), fontWeight: FontWeight.w800, fontSize: meta),
    );

    final backMaxW = card.width * 0.48;
    final backBarcode = Rect.fromLTWH(
      card.right - 12 - backMaxW,
      lowerTop,
      backMaxW,
      barcodeH,
    );
    await _drawScanableCode128(canvas, backBarcode, barcodePayload);
    _drawText(
      canvas,
      barcodePayload.trim().isEmpty ? printedCode : barcodePayload.trim().toUpperCase(),
      Rect.fromLTWH(backBarcode.left, backBarcode.bottom + 1, backBarcode.width, codeLabelH),
      TextStyle(
        color: const Color(0xFF000000),
        fontWeight: FontWeight.w900,
        fontSize: tokenSize,
        letterSpacing: 1.0,
        fontFamily: 'monospace',
      ),
      align: TextAlign.center,
    );
  }

  /// Code 128 for the 12-char Invify identity only.
  /// Integer modules (≥3 px), centered, quiet zones, never stretched.
  static Future<void> _drawScanableCode128(Canvas canvas, Rect area, String payload) async {
    final text = payload.trim().toUpperCase();
    // Refuse long verification tokens / URLs — only SSSBBBBBBBBB.
    if (!RegExp(r'^[A-Z0-9]{12}$').hasMatch(text)) return;
    const minModule = 3;
    const quietModules = 10;
    List<int> modules;
    try {
      modules = code128Modules(text);
    } catch (_) {
      return;
    }
    final total = modules.fold<int>(0, (a, b) => a + b);
    if (total <= 0) return;
    final withQuiet = total + quietModules * 2;
    final neededW = withQuiet * minModule;
    // Prefer ≥3 px modules; never go below 2 (scanner/printer floor).
    final modulePx = neededW <= area.width
        ? minModule
        : math.max(2, (area.width / withQuiet).floor());
    final barcodeW = total * modulePx;
    final quietPx = quietModules * modulePx;
    final barcodeH = area.height;
    final left = area.left + (area.width - barcodeW - quietPx * 2) / 2 + quietPx;
    canvas.drawRect(area.inflate(2), Paint()..color = Colors.white);
    var x = left;
    for (var i = 0; i < modules.length; i++) {
      final w = (modules[i] * modulePx).toDouble();
      final black = i > 0 && (i % 2 == 1);
      if (black) {
        canvas.drawRect(
          Rect.fromLTWH(x, area.top, w, barcodeH),
          Paint()
            ..color = const Color(0xFF000000)
            ..isAntiAlias = false,
        );
      }
      x += w;
    }
  }

  static Future<bool> _paintImageBytes(
    Canvas canvas,
    Uint8List bytes,
    Rect rect, {
    required BoxFit fit,
  }) async {
    try {
      final codec = await ui.instantiateImageCodec(bytes);
      final frame = await codec.getNextFrame();
      paintImage(canvas: canvas, rect: rect, image: frame.image, fit: fit);
      frame.image.dispose();
      return true;
    } catch (_) {
      return false;
    }
  }

  static Color _inkOn(Color bg) {
    return bg.computeLuminance() > 0.58 ? const Color(0xFF111111) : Colors.white;
  }

  static void _drawChip(
    Canvas canvas,
    Rect rect,
    String label,
    Color accent, {
    double fontSize = 18,
  }) {
    canvas.drawRRect(
      RRect.fromRectAndRadius(rect, const Radius.circular(4)),
      Paint()..color = accent.withValues(alpha: 0.14),
    );
    _drawText(
      canvas,
      label.toUpperCase(),
      rect.deflate(2),
      TextStyle(color: accent, fontWeight: FontWeight.w900, fontSize: fontSize, letterSpacing: 0.5),
      align: TextAlign.center,
    );
  }

  static void _drawCenteredInitials(Canvas canvas, Rect rect, String name, Color accent) {
    final parts = name.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    final initials = parts.isEmpty
        ? 'ID'
        : parts.length == 1
            ? parts.first.substring(0, 1).toUpperCase()
            : (parts[0][0] + parts[1][0]).toUpperCase();
    _drawText(
      canvas,
      initials,
      rect,
      TextStyle(color: accent.withValues(alpha: 0.7), fontWeight: FontWeight.w800, fontSize: 32),
      align: TextAlign.center,
    );
  }

  static void _drawText(
    Canvas canvas,
    String text,
    Rect bounds,
    TextStyle style, {
    int maxLines = 1,
    TextAlign align = TextAlign.left,
  }) {
    final tp = TextPainter(
      text: TextSpan(text: text, style: style),
      textAlign: align,
      textDirection: TextDirection.ltr,
      maxLines: maxLines,
      ellipsis: '...',
    )..layout(maxWidth: bounds.width);
    final dy = (align == TextAlign.center && maxLines == 1)
        ? bounds.top + (bounds.height - tp.height) / 2
        : bounds.top;
    final dx = align == TextAlign.center
        ? bounds.left + (bounds.width - tp.width) / 2
        : bounds.left;
    tp.paint(canvas, Offset(dx, dy));
  }
}
