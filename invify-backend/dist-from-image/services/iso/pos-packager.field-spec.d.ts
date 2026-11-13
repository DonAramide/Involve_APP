/**
 * PosPackager field layout aligned with
 * `com.vanstone.trans.tools.PosPackager` / Accelerex device ISO
 * (`Involve_APP/.../PosPackager.java`).
 */
export type PosFieldKind = 'fixed_numeric' | 'fixed_char' | 'll_numeric' | 'll_char' | 'lll_char' | 'binary';
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
export declare const POS_FIELD_SPECS: ReadonlyMap<number, PosFieldSpec>;
export declare function getPosFieldSpec(fieldId: number): PosFieldSpec | undefined;
