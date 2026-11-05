# ID Card Thermal Print Optimisation Report

**Date:** 2026-11-05  
**Acceptance target:** Physical CR80 thermal print + gate scanner (not preview alone)

## Previous printing problems

1. On-card Code 128 encoded a long opaque gate token (~20–43 chars) → bars too dense to scan after thermal.
2. Thermal path banded/rotated bitmaps → shredded layout (sideways photo, overlapping banners).
3. Preview at 300 DPI downscaled for 80mm → thin strokes and grainy headers.
4. Human-readable under barcode showed admission `0001` instead of the scan payload.

## Root causes

| Symptom | Cause |
|---------|--------|
| Unreadable barcode | Long Code 128 payload + soft raster bars |
| Tiny body text on paper | Absolute px fonts designed for 300 DPI then shrunk |
| Layout shredding | Band + per-band rotate before ESC * |
| Gate only accepted long tokens | `gateTokenHash` required 20–128 char secrets |

## Final barcode payload (required)

| Field | Role |
|-------|------|
| `card_identity_code` / `invifyCode` / `barcodeValue` | Permanent **12-character** Code 128 payload |
| `card_verification_token` / `verificationToken` | Opaque secret for legacy QR / verification only — **never printed as Code 128** |

Required payload format:

```text
Payload: SSSBBBBBBBBB
Length: 12
Format: 3 organisation characters + 9 beneficiary characters
Symbology: Code 128
```

Example: `JMSAYO000123`

### Separation rules

- Flutter `resolveCardIdentityCode` accepts **only** `^[A-Z0-9]{12}$`.
- `_drawScanableCode128` refuses any other payload (no long-token fallback).
- Issue/batch API returns `barcodeValue` = identity, plus `verificationToken` once for Copy token / legacy workflows.
- Existing verification tokens remain valid; they are not deleted or invalidated.

## Organisation abbreviation

- Derived once from tenant registered name (`deriveOrgPrefix`)
- Persisted on `tenants.invify_org_prefix`; not regenerated per print
- Unique index; deterministic alternates on collision (`alternateOrgPrefix`)

## Beneficiary identifier

- 3-char name abbrev + 6-char stable suffix (`deriveBeneficiaryNine`)
- Suffix prefers numeric admission/staff code; else SHA-256 of `printedCode|subjectId` mapped to A–Z0–9
- Does not change when the person renames
- Full 12-char stored on `school_id_cards.invify_code` (unique per tenant)
- Replacement **keeps** the same identity code; rotates only the verification token hash

## Collision handling

- Recompute 9-char segment with attempt suffix until tenant-unique
- Org prefix tries up to 36 alternates

## Code 128 implementation

- Flutter canvas: integer module widths (≥3 px, floor 2), **10-module quiet zones**, centered in ~65% of CR80 width (not stretched edge-to-edge)
- Human-readable line under bars = same 12 characters
- Thermal print: native ESC/POS `BarcodeCommand` of the 12-char code (sharp bars) + face image via ESC *
- PDF/preview: same 12-char payload in the CR80 face

### Physical dimensions (CR80 landscape @ 300 DPI preview)

| Metric | Value |
|--------|--------|
| Card | 85.6 × 54 mm |
| Barcode max layout width | ~65% of card (~55.6 mm) |
| Module width | ≥3 px @ 300 DPI (~0.25 mm); thermal uses printer-native bars |
| Quiet zones | 10 modules each side |
| Payload character count | **12** |

## Scanner changes

- Backend `parseGateScanToken`: accepts **12-char Invify code** OR **legacy 20–128 opaque token**
- Lookup by `invify_code` or `token_sha256`; tenant + active status checked
- Flutter gate regex: `^[A-Za-z0-9]{12}$` or opaque 20–128
- Previously issued opaque/QR cards remain valid
- Secure verification token is **not** exposed through the printed barcode

## Printer / dimensions

- CR80: 85.60 × 53.98 mm landscape
- Preview/PDF: 300 DPI
- Thermal: render at ~180–220 DPI matched to roll width (576/384 dots), then 1-bit threshold
- ESC * bit-image for card face (same path as receipt logos) + native Code 128

## Migration

`invify-backend/supabase/migrations/20261105060000_school_id_card_invify_code.sql`

Apply on staging before issuing new cards:

```sql
-- adds tenants.invify_org_prefix, school_id_cards.invify_code + unique indexes
```

Without this migration, issue may succeed for the verification token but the app will refuse to print a Code 128 until a 12-char identity is returned.

## Sample paths

- `docs/id-cards/samples/sample-front-cr80.png`
- `docs/id-cards/samples/sample-back-cr80.png`
- `docs/id-cards/samples/sample-id-card-cr80.pdf`

## Mandatory test results

| Check | Expected | Status |
|-------|----------|--------|
| Payload | 12-char identity only (e.g. `THMAYO000001`) | Pass (unit + CR80 render) |
| Character count | 12 | Pass |
| Format | 3 org + 9 beneficiary | Pass (`school-card.identity`) |
| Symbology | Code 128 | Pass |
| Scan return | Exact identity string, **not** long token | Pass (gate parse + lookup) |
| Backward compatibility | Legacy 20–128 token still resolves | Pass (`lookupToken` / `parseGateScanToken`) |
| Staging APK | Built with identity-only print path | Pass — `invify-v1.0.5-2026-11-05-staging-release.apk` |
| Backend unit suite (`school-id-cards.test.ts`) | Identity + verification separation | Pass (15/15) |
| Flutter identity + CR80 sample | Payload length 12; samples regenerated | Pass |
| Physical 80mm print + gate scan | After migration + re-issue on device | **Operator retest required** |

## Outstanding issues

1. Apply migration on staging DB before new issues store `invify_code`.
2. Re-issue cards so printed barcodes carry the 12-char code (old long-token prints stay legacy-scannable via verification token / QR).
3. Confirm physical scan with the site’s gate scanner after APK install.
4. Optional: backfill `invify_code` for existing active cards without re-issue.
5. **Do not deploy to production** until physical DoD is signed off.

## Files touched (high level)

- `school-card.identity.ts`, migration, persistence, service, gate scan, CardFace / IssuedCardResult
- `id_card_identity_code.dart`, `id_card_landscape_print.dart`, `id_card_admin_page.dart`, `school_id_card_preview.dart`, `gate_clock_page.dart`
- This report
