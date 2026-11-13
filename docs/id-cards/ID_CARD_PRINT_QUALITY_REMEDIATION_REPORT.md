# ID Card Print Quality Remediation Report

**Date:** 2026-11-04  
**Scope:** Flutter mobile preview/print/PDF + Web ID card face layout + gate token length for Code 128

## Root causes

| Issue | Cause |
|--------|--------|
| Portrait-looking “landscape” preview | Thermal strip used short-edge-across-roll math, so the PNG was taller than wide; dialog showed that strip |
| QR instead of linear barcode | ~43-char gate tokens failed Code 128 width checks; renderer fell back to QR |
| Tiny / unreadable back text | Fixed small pt sizes on a tall thin canvas with heavy B/W threshold |
| Left-aligned tenant header | Default left text paint / web `textAlign: logoPlacement` |
| No professional PDF | ID cards were thermal PNG or browser HTML only |

## Printing technology

| Path | Technology |
|------|------------|
| Flutter Preview | Canvas → PNG at **300 DPI**, true CR80 landscape **85.60 × 53.98 mm** (`1011 × 638` px) |
| Flutter PDF | `package:pdf` + `package:printing` — 2 pages, exact CR80 page size, front then back |
| Flutter thermal | Landscape PNG → rotate 90° CW → fit short edge across 58/80 mm strip → ESC/POS `imageRaster` |
| Web | HTML/CSS `IdCardFace.vue` + `window.print()` (unchanged engine; header/back typography improved) |

## Card dimensions

- Physical: **85.60 mm × 53.98 mm** (CR80), landscape  
- Preview/PDF raster: **1011 × 638** @ 300 DPI (ratio **1.585**)  
- Thermal 80 mm strip sample: **576 × 658** (rotated + margins)

## Barcode format

- **Code 128 subset B** (linear) on front and back  
- Encodes opaque **gate token** (`barcodeValue`), not name/PII  
- Human-readable **printedCode** under the bars  
- **New tokens:** 20 base64url chars (`randomBytes(15)`) so modules fit CR80 width  
- **Existing 43-char tokens:** still valid; still encoded as Code 128 (may be denser on thermal until reissue)  
- Gate scanner already accepts Code 128 + QR; QR kept for previously printed QR cards

## Scanner compatibility

- `gate_clock_page.dart`: `BarcodeFormat.code128` + `BarcodeFormat.qrCode`  
- Token regex unchanged: `^[A-Za-z0-9_-]{20,128}$`  
- No card invalidation; only SHA-256 of token is stored

## Typography (Flutter CR80 @ 300 DPI)

| Element | Approx. size |
|---------|----------------|
| Org name (header) | ~28 px (~7.5 pt @ 300 DPI scale on card) / visually prominent |
| Address | ~14 px, centered under name |
| Beneficiary name | ~26 px |
| Back terms | ~13 px, line-height 1.32, up to 9 lines |
| Back return / signatory | ~11–12 px |

Web back copy raised to ~7–7.5 pt.

## Files modified

- `lib/features/school/presentation/widgets/id_card_landscape_print.dart` — CR80 landscape renderer, thermal strip, PDF builder  
- `lib/features/school/presentation/widgets/code128_barcode.dart` — integer modules, optional min module  
- `lib/features/school/presentation/pages/id_card_admin_page.dart` — landscape preview, thermalize on print, PDF action  
- `lib/features/printer/data/esc_pos_text.dart` — (prior) ESC/POS Unicode sanitizer  
- `invify-backend/src/modules/school-gate/school-card.token.ts` — 20-char tokens  
- `invify-backend/test/school-id-cards.test.ts` — token length expectation  
- `invify-admin/src/pages/school/id-cards/IdCardFace.vue` — centered header, larger back type  
- `test/features/school/id_card_cr80_render_test.dart` — sample generation  

## Sample output paths (visually inspected)

- `docs/id-cards/samples/sample-front-cr80.png` — landscape, centered header, linear barcode  
- `docs/id-cards/samples/sample-back-cr80.png` — readable terms + signatory + Code 128  
- `docs/id-cards/samples/sample-id-card-cr80.pdf` — 2-page CR80  
- `docs/id-cards/samples/sample-front-thermal-80mm.png` — rotated thermal strip  

`flutter test test/features/school/id_card_cr80_render_test.dart` — passed.

## Mobile / web test results

| Check | Result |
|-------|--------|
| Front landscape aspect | Pass (1011×638, ratio 1.585) |
| Centered org name/address | Pass (canvas `TextAlign.center`; web `.id-card-band-centered`) |
| Linear Code 128 (not QR) | Pass on samples |
| Back terms legible at CR80 | Pass on sample PNG/PDF inspection |
| PDF front then back | Pass (`buildPdf`) |
| Thermal strip generation | Pass |
| Gate token length for new cards | 20 chars (compat with regex) |
| Physical Bluetooth scan | Pending device retest after APK install |
| Tenant logo on Flutter face | Partial — `logoBytes` supported; persistence still passes `httpsLogo(null)` until tenant logo column is wired |

## Outstanding issues

1. Wire tenant logo URL from DB into Flutter/`buildFace` persistence when a stable HTTPS logo field exists.  
2. Re-issue cards that still carry 43-char tokens if thermal Code 128 scan fails on dense bars.  
3. Physical scan + duplex printer check on device after installing the new staging APK.  
4. Portrait web templates (`modern_corporate`, etc.) unchanged by design; landscape remediation targets CR80 landscape print path / classic templates.

## Definition of done status

- Professional CR80 landscape front/back PDF + PNG samples generated and inspected: **Yes**  
- Tenant name/address centered: **Yes**  
- Linear barcode on printable card: **Yes**  
- Back-side text enlarged and readable on sample: **Yes**  
- Physical print/scan on hardware: **Requires APK install + printer/scanner**
