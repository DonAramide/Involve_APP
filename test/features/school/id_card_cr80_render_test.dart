import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/school/presentation/widgets/id_card_landscape_print.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('renders professional CR80 landscape front/back + PDF samples', () async {
    // Code 128 must encode ONLY the 12-char Invify identity (SSSBBBBBBBBB).
    const identity = 'THMAYO000001';
    expect(identity.length, 12);
    final front = await IdCardLandscapePrint.renderSide(
      side: 'front',
      paperWidthMm: 80,
      organizationName: 'test hmo',
      address: '12 Harbour Road, Lagos',
      fullName: 'Ayo dom',
      category: 'STUDENT',
      printedCode: '0001',
      detail: 'Jss1',
      groupFieldLabel: 'Class',
      accentHex: '#1F4B99',
      barcodePayload: identity,
      disclaimer: 'This card remains the property of the issuing institution.',
    );
    final back = await IdCardLandscapePrint.renderSide(
      side: 'back',
      paperWidthMm: 80,
      organizationName: 'test hmo',
      address: '12 Harbour Road, Lagos',
      fullName: 'Ayo dom',
      category: 'STUDENT',
      printedCode: '0001',
      accentHex: '#1F4B99',
      barcodePayload: identity,
      disclaimer:
          'This card remains the property of the issuing institution. Present this card when requested by authorised personnel. Unauthorized use, alteration, or transfer is prohibited.',
      returnHint: 'If found return this card to the school. Contact: 08102393330',
      authorizedSignatory: 'School Administrator',
    );

    expect(front, isNotNull);
    expect(back, isNotNull);

    // Landscape at 300 DPI ≈ 1011 × 638
    expect(IdCardLandscapePrint.cardWidthPx, greaterThan(IdCardLandscapePrint.cardHeightPx));

    final outDir = Directory('docs/id-cards/samples');
    await outDir.create(recursive: true);
    final frontFile = File('${outDir.path}/sample-front-cr80.png');
    final backFile = File('${outDir.path}/sample-back-cr80.png');
    await frontFile.writeAsBytes(front!);
    await backFile.writeAsBytes(back!);

    final pdf = await IdCardLandscapePrint.buildPdf(frontPng: front, backPng: back);
    final pdfFile = File('${outDir.path}/sample-id-card-cr80.pdf');
    await pdfFile.writeAsBytes(pdf);

    final thermal = await IdCardLandscapePrint.prepareThermalStrip(front, 80);
    expect(thermal, isNotNull);
    await File('${outDir.path}/sample-front-thermal-80mm.png').writeAsBytes(thermal!);

    expect(frontFile.existsSync(), isTrue);
    expect(backFile.existsSync(), isTrue);
    expect(pdfFile.existsSync(), isTrue);
    expect(pdf.length, greaterThan(1000));
  });
}
