/**
 * PosPackager field layout aligned with
 * `com.vanstone.trans.tools.PosPackager` / Accelerex device ISO
 * (`Involve_APP/.../PosPackager.java`).
 */
export type PosFieldKind =
  | 'fixed_numeric'
  | 'fixed_char'
  | 'll_numeric'
  | 'll_char'
  | 'lll_char'
  | 'binary';

export interface PosFieldSpec {
  id: number;
  kind: PosFieldKind;
  /** Max length (chars) or byte length for binary. */
  max: number;
}

/**
 * Wire types that matter for purchase messages.
 * Critical:
 * - 59 / 123 = IFA_LLLCHAR(999) (3-digit length) — NOT LLCHAR
 * - 52 = IFA_BINARY(8) PIN — jPOS AsciiHex on wire (16 hex ASCII chars)
 * - 128 = IFA_BINARY(32) MAC — jPOS AsciiHex on wire (64 hex ASCII chars)
 *   NOT raw binary bytes (that desyncs F55 → "Invalid length prefix at offset 265")
 */
export const POS_FIELD_SPECS: ReadonlyMap<number, PosFieldSpec> = new Map([
  [0, { id: 0, kind: 'fixed_numeric', max: 4 }],
  [2, { id: 2, kind: 'll_numeric', max: 19 }],
  [3, { id: 3, kind: 'fixed_numeric', max: 6 }],
  [4, { id: 4, kind: 'fixed_numeric', max: 12 }],
  [7, { id: 7, kind: 'fixed_numeric', max: 10 }],
  [11, { id: 11, kind: 'fixed_numeric', max: 6 }],
  [12, { id: 12, kind: 'fixed_numeric', max: 6 }],
  [13, { id: 13, kind: 'fixed_numeric', max: 4 }],
  [14, { id: 14, kind: 'fixed_numeric', max: 4 }],
  [15, { id: 15, kind: 'fixed_numeric', max: 4 }],
  [18, { id: 18, kind: 'fixed_numeric', max: 4 }],
  [22, { id: 22, kind: 'fixed_numeric', max: 3 }],
  [23, { id: 23, kind: 'fixed_numeric', max: 3 }],
  [25, { id: 25, kind: 'fixed_numeric', max: 2 }],
  [26, { id: 26, kind: 'fixed_numeric', max: 2 }],
  [28, { id: 28, kind: 'fixed_char', max: 9 }],
  [30, { id: 30, kind: 'fixed_char', max: 9 }],
  [32, { id: 32, kind: 'll_numeric', max: 11 }],
  [33, { id: 33, kind: 'll_numeric', max: 11 }],
  [35, { id: 35, kind: 'll_char', max: 37 }],
  [37, { id: 37, kind: 'fixed_char', max: 12 }],
  // Auth / response fields present on Accelerex 0210 (device PosPackager IF_CHAR(6))
  [38, { id: 38, kind: 'fixed_char', max: 6 }],
  [39, { id: 39, kind: 'fixed_char', max: 2 }],
  [40, { id: 40, kind: 'fixed_char', max: 3 }],
  [41, { id: 41, kind: 'fixed_char', max: 8 }],
  [42, { id: 42, kind: 'fixed_char', max: 15 }],
  [43, { id: 43, kind: 'fixed_char', max: 40 }],
  [49, { id: 49, kind: 'fixed_char', max: 3 }],
  [52, { id: 52, kind: 'binary', max: 8 }],
  // Additional amounts on approved 0210 (device IFA_LLLCHAR(120))
  [54, { id: 54, kind: 'lll_char', max: 120 }],
  [55, { id: 55, kind: 'lll_char', max: 999 }],
  [56, { id: 56, kind: 'lll_char', max: 999 }],
  [59, { id: 59, kind: 'lll_char', max: 999 }],
  [90, { id: 90, kind: 'fixed_numeric', max: 42 }],
  [95, { id: 95, kind: 'fixed_char', max: 42 }],
  // Account id on approved 0210 (device IFA_LLCHAR(28))
  [102, { id: 102, kind: 'll_char', max: 28 }],
  [123, { id: 123, kind: 'lll_char', max: 999 }],
  // IFA_BINARY(32) — 32 MAC bytes as 64 ASCII hex on wire (jPOS AsciiHexInterpreter)
  [128, { id: 128, kind: 'binary', max: 32 }],
]);

export function getPosFieldSpec(fieldId: number): PosFieldSpec | undefined {
  return POS_FIELD_SPECS.get(fieldId);
}
