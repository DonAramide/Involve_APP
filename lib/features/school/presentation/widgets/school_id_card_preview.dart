import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';

import 'package:involve_app/core/service_mode/service_mode_terms.dart';
import 'package:involve_app/features/school/presentation/widgets/code128_barcode.dart';

/// On-device preview of an ID card (front and/or back).
class SchoolIdCardPreview extends StatelessWidget {
  final String schoolName;
  final String? address;
  final String fullName;
  final String category;
  final String printedCode;
  final String? detail;
  final String? hmoName;
  final String? enrolleeId;
  final String? accentHex;
  final Uint8List? photoBytes;
  final String? barcodeValue;
  final String? disclaimer;
  final String? lostFoundPhone;
  final String? lostFoundEmail;
  final String side; // 'front' | 'back' | 'both'
  final bool showBarcodeSecretHint;
  final ServiceModeTerms? terms;

  const SchoolIdCardPreview({
    super.key,
    required this.schoolName,
    this.address,
    required this.fullName,
    required this.category,
    required this.printedCode,
    this.detail,
    this.hmoName,
    this.enrolleeId,
    this.accentHex,
    this.photoBytes,
    this.barcodeValue,
    this.disclaimer,
    this.lostFoundPhone,
    this.lostFoundEmail,
    this.side = 'front',
    this.showBarcodeSecretHint = false,
    this.terms,
  });

  ServiceModeTerms get _terms => terms ?? const ServiceModeTerms(ServiceMode.school);

  Color get _accent {
    final raw = (accentHex ?? '#1F4B33').replaceAll('#', '');
    if (raw.length == 6) {
      final value = int.tryParse(raw, radix: 16);
      if (value != null) return Color(0xFF000000 | value);
    }
    return const Color(0xFF1F4B33);
  }

  String get _initials {
    final parts = fullName.trim().split(RegExp(r'\s+')).where((p) => p.isNotEmpty).toList();
    if (parts.isEmpty) return 'ID';
    if (parts.length == 1) return parts.first.substring(0, 1).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    if (side == 'back') return _backCard();
    if (side == 'both') {
      return Column(
        children: [
          _frontCard(),
          const SizedBox(height: 12),
          _backCard(),
        ],
      );
    }
    return _frontCard();
  }

  Widget _shell({required Widget child}) {
    final accent = _accent;
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.black12),
        boxShadow: const [
          BoxShadow(color: Color(0x22000000), blurRadius: 10, offset: Offset(0, 4)),
        ],
      ),
      clipBehavior: Clip.antiAlias,
      child: child,
    );
  }

  Widget _header() {
    final accent = _accent;
    return Container(
      padding: const EdgeInsets.fromLTRB(14, 12, 14, 12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [accent, Color.lerp(accent, Colors.black, 0.25)!],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            alignment: Alignment.center,
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(8)),
            child: Text(
              schoolName.trim().isEmpty
                  ? 'SC'
                  : schoolName
                      .trim()
                      .split(RegExp(r'\s+'))
                      .take(2)
                      .map((w) => w.isEmpty ? '' : w[0])
                      .join()
                      .toUpperCase(),
              style: TextStyle(color: accent, fontWeight: FontWeight.w800, fontSize: 13),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  schoolName,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15),
                ),
                if ((address ?? '').trim().isNotEmpty)
                  Text(address!.trim(), style: const TextStyle(color: Colors.white70, fontSize: 11)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _footer() {
    return Container(
      alignment: Alignment.center,
      padding: const EdgeInsets.symmetric(vertical: 8),
      color: _accent,
      child: Text(
        schoolName,
        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 11),
      ),
    );
  }

  Widget _barcodeBlock() {
    final raw = (barcodeValue ?? '').trim().toUpperCase();
    final isIdentity = RegExp(r'^[A-Z0-9]{12}$').hasMatch(raw);
    if (!isIdentity) {
      return Text(
        '12-character identity barcode appears after issue (re-issue after invify_code migration if needed).',
        textAlign: TextAlign.center,
        style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
      );
    }
    return Column(
      children: [
        Center(
          child: SizedBox(
            height: 56,
            width: 220,
            child: Code128Barcode(value: raw, height: 56),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          raw,
          style: const TextStyle(
            fontWeight: FontWeight.w700,
            letterSpacing: 1.2,
            fontSize: 13,
            fontFamily: 'monospace',
          ),
        ),
        if (showBarcodeSecretHint)
          const Padding(
            padding: EdgeInsets.only(top: 4),
            child: Text(
              'Code 128 encodes the 12-character identity only.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, color: Colors.black54),
            ),
          ),
      ],
    );
  }

  Widget _frontCard() {
    final accent = _accent;
    return _shell(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _header(),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 92,
                  height: 112,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE8E8E8),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.black12),
                  ),
                  clipBehavior: Clip.antiAlias,
                  child: photoBytes != null
                      ? Image.memory(photoBytes!, fit: BoxFit.cover)
                      : Center(
                          child: Text(
                            _initials,
                            style: TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w700,
                              color: accent.withValues(alpha: 0.7),
                            ),
                          ),
                        ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                        decoration: BoxDecoration(
                          color: accent.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          category.toUpperCase(),
                          style: TextStyle(
                            color: accent,
                            fontWeight: FontWeight.w800,
                            fontSize: 11,
                            letterSpacing: 0.6,
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        fullName,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: Color(0xFF122018),
                        ),
                      ),
                      const SizedBox(height: 8),
                      _meta('ID No', printedCode),
                      if ((detail ?? '').trim().isNotEmpty)
                        _meta(
                          category.toUpperCase() == 'STUDENT'
                              ? _terms.beneficiaryGroup
                              : 'Role',
                          detail!.trim(),
                        ),
                      if (category.toUpperCase() == 'STUDENT' && (hmoName ?? '').trim().isNotEmpty)
                        _meta('HMO', hmoName!.trim()),
                      if (category.toUpperCase() == 'STUDENT' && (enrolleeId ?? '').trim().isNotEmpty)
                        _meta('Enrollee ID', enrolleeId!.trim()),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
            child: _barcodeBlock(),
          ),
          _footer(),
        ],
      ),
    );
  }

  Widget _backCard() {
    final terms = (disclaimer ?? '').trim().isNotEmpty
        ? disclaimer!.trim()
        : 'This card remains the property of the issuing institution. It must be presented when requested by authorized personnel. If found, please return it to the issuing institution.';
    final contact = [
      if ((lostFoundPhone ?? '').trim().isNotEmpty) lostFoundPhone!.trim(),
      if ((lostFoundEmail ?? '').trim().isNotEmpty) lostFoundEmail!.trim(),
    ].join(' · ');

    return _shell(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _header(),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 14, 14, 8),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'TERMS AND CONDITIONS',
                  style: TextStyle(fontWeight: FontWeight.w800, fontSize: 13, letterSpacing: 0.4),
                ),
                const SizedBox(height: 8),
                Text(terms, style: const TextStyle(fontSize: 12.5, height: 1.35, color: Color(0xFF243028))),
                if ((address ?? '').trim().isNotEmpty) ...[
                  const SizedBox(height: 8),
                  Text(address!.trim(), style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
                ],
                const SizedBox(height: 8),
                Text(
                  contact.isEmpty
                      ? _terms.idCardReturnHint
                      : '${_terms.idCardReturnHint} Contact: $contact',
                  style: const TextStyle(fontSize: 12.5, height: 1.35),
                ),
                const SizedBox(height: 12),
                const Text('Authorized signatory', style: TextStyle(fontWeight: FontWeight.w700)),
                Text(_terms.idCardAuthorizedSignatory, style: TextStyle(fontSize: 12, color: Colors.grey.shade700)),
              ],
            ),
          ),
          const Divider(height: 1),
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
            child: _barcodeBlock(),
          ),
          _footer(),
        ],
      ),
    );
  }

  Widget _meta(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: RichText(
        text: TextSpan(
          style: const TextStyle(fontSize: 13, color: Color(0xFF243028)),
          children: [
            TextSpan(text: '$label: ', style: TextStyle(color: Colors.grey.shade700)),
            TextSpan(text: value, style: const TextStyle(fontWeight: FontWeight.w700)),
          ],
        ),
      ),
    );
  }
}

/// Renders a QR payload to PNG bytes for thermal ImageCommand printing.
Future<Uint8List?> qrPngBytes(String data, {double size = 280}) async {
  final trimmed = data.trim();
  if (trimmed.isEmpty) return null;
  final painter = QrPainter(
    data: trimmed,
    version: QrVersions.auto,
    gapless: true,
    errorCorrectionLevel: QrErrorCorrectLevel.M,
    eyeStyle: const QrEyeStyle(eyeShape: QrEyeShape.square, color: Color(0xFF000000)),
    dataModuleStyle: const QrDataModuleStyle(
      dataModuleShape: QrDataModuleShape.square,
      color: Color(0xFF000000),
    ),
  );
  final imageData = await painter.toImageData(size, format: ui.ImageByteFormat.png);
  return imageData?.buffer.asUint8List();
}
