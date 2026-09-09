import { deviceIdsMatch, isUsableDeviceId, normalizeDeviceId, uniqueDeviceIds } from '../src/utils/device-identity';

describe('device identity matching', () => {
  test('normalizes punctuation and case', () => {
    expect(normalizeDeviceId('ab-cd:ef')).toBe('ABCDEF');
  });

  test('treats the same hardware id as a match', () => {
    expect(deviceIdsMatch('ABC123DEF456', 'abc123def456')).toBe(true);
  });

  test('treats a stored suffix of the same device as a match', () => {
    expect(deviceIdsMatch('ABC123DEF456', 'DEF456')).toBe(true);
  });

  test('does not match unrelated device ids', () => {
    expect(deviceIdsMatch('ABC123DEF456', 'XYZ999GHI000')).toBe(false);
  });

  test('rejects empty or unknown ids', () => {
    expect(deviceIdsMatch('', 'ABC123')).toBe(false);
    expect(deviceIdsMatch('UNKNOWN', 'UNKNOWN')).toBe(false);
  });

  test('treats placeholder serials as unusable', () => {
    expect(isUsableDeviceId('R52M413KTQK')).toBe(true);
    expect(isUsableDeviceId('unknown')).toBe(false);
    expect(isUsableDeviceId('null')).toBe(false);
    expect(isUsableDeviceId('')).toBe(false);
    expect(isUsableDeviceId('0')).toBe(false);
  });

  test('lists unique registered device ids', () => {
    expect(uniqueDeviceIds([
      { device_id: 'abc-123' },
      { device_id: 'ABC123' },
      { device_id: 'XYZ999' },
      { device_id: '' },
    ])).toEqual(['abc-123', 'XYZ999']);
  });
});
