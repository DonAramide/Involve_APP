import { resolveApkObjectKey } from '../src/utils/apk-object-key';

describe('resolveApkObjectKey', () => {
  const originalBucket = process.env.CONTABO_BUCKET;

  afterEach(() => {
    process.env.CONTABO_BUCKET = originalBucket;
  });

  test('strips bucket from Contabo path-style URL', () => {
    process.env.CONTABO_BUCKET = 'iips.stargazer.bucket';
    expect(
      resolveApkObjectKey(
        'https://usc1.contabostorage.com/iips.stargazer.bucket/apks/app_v1.0.apk',
      ),
    ).toBe('apks/app_v1.0.apk');
  });

  test('keeps apks/ path when public base omits the bucket', () => {
    process.env.CONTABO_BUCKET = 'iips.stargazer.bucket';
    expect(
      resolveApkObjectKey('https://usc1.contabostorage.com/apks/app_v1.0.apk'),
    ).toBe('apks/app_v1.0.apk');
  });

  test('accepts a raw object key', () => {
    expect(resolveApkObjectKey('apks/app_v1.0.apk')).toBe('apks/app_v1.0.apk');
  });
});
