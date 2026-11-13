/// ESC/POS code pages reject many Unicode glyphs (em dash, middle dot, etc.).
/// Normalize receipt/ID-card label text before [Generator.text].
String sanitizeEscPosText(String input) {
  final buf = StringBuffer();
  for (final rune in input.runes) {
    switch (rune) {
      case 0x2014: // —
      case 0x2013: // –
      case 0x2212: // −
      case 0x00B7: // ·
      case 0x2022: // •
        buf.write('-');
        break;
      case 0x2018: // ‘
      case 0x2019: // ’
        buf.write("'");
        break;
      case 0x201C: // “
      case 0x201D: // ”
        buf.write('"');
        break;
      case 0x2026: // …
        buf.write('...');
        break;
      case 0x20A6: // ₦
        buf.write('N');
        break;
      default:
        if (rune <= 0xFF) {
          buf.writeCharCode(rune);
        } else {
          buf.write('?');
        }
    }
  }
  return buf.toString();
}
