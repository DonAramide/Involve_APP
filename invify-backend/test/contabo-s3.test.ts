import { resolveContaboEndpoint } from '../src/utils/contabo-s3';

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
});
