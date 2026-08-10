import { packPosMessage, unpackPosMessage } from '../src/services/iso/pos-packager';

describe('PosPackager (Invify Accelerex / jPOS IFA_BINARY)', () => {
  it('packs IFA_BINARY as ASCII-hex on wire (F52=16, F128=64) matching device HASH_LEN', () => {
    const macHex =
      'D3D5542E2ECDA25A6BD370050C04166221E37E8D7AD24AFBEAAEDC41BA0E32ED';
    const pinHex = 'C24549D0CCFF3FF5';
    const fields = {
      0: '0200',
      2: '5366132277281612',
      3: '001000',
      4: '000000000102',
      7: '0810004805',
      11: '963595',
      12: '004805',
      13: '0810',
      14: '2812',
      18: '6012',
      22: '051',
      23: '001',
      25: '00',
      26: '12',
      28: 'D00000000',
      32: '111129',
      33: '557694',
      35: '5366132277281612D2812221012908360',
      37: '622200963595',
      40: '221',
      41: '204435SA',
      42: '2044LA310921701',
      43: 'ACCELEREX NETWORK LIMIT29 ERIC MOOREXXNG',
      49: '566',
      52: pinHex,
      55: '9F260898BE9F830F69CE209F2701409F10120110600003220000000000000000000000FF9F3704CC14533F9F3602021E950504800008009A032608109C01009F02060000000001025F2A0205665F340101820239009F1A0205669F03060000000000009F3303E0F1C88407A00000000410109F3501229F4104000000019F3403420300',
      59: '204435SA-VM3041056610-622200963595',
      123: 'A1010171134C101',
      128: macHex,
    };

    const packed = packPosMessage(fields);
    // Device GA_MAC_BUILD HASH_LEN for this shape is 657 (F52 wire 16 + F128 wire 64)
    expect(packed.length).toBe(657);
    expect(packed.subarray(packed.length - 64).toString('ascii').toUpperCase()).toBe(macHex);

    const unpacked = unpackPosMessage(packed);
    expect(unpacked[11]).toBe('963595');
    expect(unpacked[37]).toBe('622200963595');
    expect(Buffer.isBuffer(unpacked[52]) ? (unpacked[52] as Buffer).toString('hex').toUpperCase() : '').toBe(pinHex);
    expect(Buffer.isBuffer(unpacked[128]) ? (unpacked[128] as Buffer).toString('hex').toUpperCase() : '').toBe(macHex);
    expect(String(unpacked[55])).toContain('9F34');
  });
});
