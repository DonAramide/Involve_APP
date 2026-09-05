import {
  contaboObjectPath,
  createContaboS3Client,
  formatContaboPutError,
  putContaboObject,
  resolveContaboEndpoint,
} from '../src/utils/contabo-s3';

describe('resolveContaboEndpoint', () => {
  const originalEndpoint = process.env.CONTABO_ENDPOINT;
  const originalRegion = process.env.CONTABO_REGION;

  afterEach(() => {
    process.env.CONTABO_ENDPOINT = originalEndpoint;
    process.env.CONTABO_REGION = originalRegion;
  });

  test('rewrites the non-resolving s3.usc1 hostname to Contabo path-style', () => {
    process.env.CONTABO_ENDPOINT = 'https://s3.usc1.contabostorage.com';
    expect(resolveContaboEndpoint()).toBe('https://usc1.contabostorage.com');
  });

  test('keeps the working local endpoint', () => {
    process.env.CONTABO_ENDPOINT = 'https://usc1.contabostorage.com';
    expect(resolveContaboEndpoint()).toBe('https://usc1.contabostorage.com');
  });

  test('adds the region when only the parent domain is set', () => {
    process.env.CONTABO_ENDPOINT = 'https://contabostorage.com';
    process.env.CONTABO_REGION = 'usc1';
    expect(resolveContaboEndpoint()).toBe('https://usc1.contabostorage.com');
  });

  test('installs Contabo checksum-stripping middleware', () => {
    const identified = createContaboS3Client().middlewareStack.identify();
    expect(identified.some((entry) => entry.includes('contaboStripAwsChecksums'))).toBe(true);
    expect(identified.some((entry) => entry.includes('contaboStripAwsChecksumsFinalize'))).toBe(true);
  });
});

describe('Contabo SigV4 PUT helpers', () => {
  test('builds a path-style object path', () => {
    expect(contaboObjectPath('iips.stargazer.bucket', 'apks/com.invify.invify_v1.0.1.apk'))
      .toBe('/iips.stargazer.bucket/apks/com.invify.invify_v1.0.1.apk');
  });

  test('surfaces Contabo JSON error bodies instead of SDK XML parse failures', () => {
    expect(formatContaboPutError(400, '{"message":"Checksum CRC32 not supported"}'))
      .toBe('Checksum CRC32 not supported');
  });

  test('surfaces Contabo XML Message elements', () => {
    expect(formatContaboPutError(403, '<Error><Message>Access Denied</Message></Error>'))
      .toBe('Access Denied');
  });

  test('rejects missing Contabo credentials before opening a socket', async () => {
    const originalAccess = process.env.CONTABO_ACCESS_KEY;
    const originalSecret = process.env.CONTABO_SECRET_KEY;
    delete process.env.CONTABO_ACCESS_KEY;
    delete process.env.CONTABO_SECRET_KEY;
    try {
      await expect(putContaboObject({
        bucket: 'iips.stargazer.bucket',
        key: 'apks/test.apk',
        body: Buffer.from('apk'),
        contentType: 'application/vnd.android.package-archive',
      })).rejects.toThrow(/CONTABO_ACCESS_KEY/);
    } finally {
      if (originalAccess === undefined) delete process.env.CONTABO_ACCESS_KEY;
      else process.env.CONTABO_ACCESS_KEY = originalAccess;
      if (originalSecret === undefined) delete process.env.CONTABO_SECRET_KEY;
      else process.env.CONTABO_SECRET_KEY = originalSecret;
    }
  });
});
