import { resolveEnvFileCandidates } from '../src/config/load-env';

describe('test environment isolation', () => {
  const original = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = original;
  });

  test('NODE_ENV=test does not select developer or staging env files', () => {
    process.env.NODE_ENV = 'test';
    expect(resolveEnvFileCandidates()).toEqual([]);
  });

  test('staging still selects only the staging env file', () => {
    process.env.NODE_ENV = 'staging';
    expect(resolveEnvFileCandidates()).toEqual(['.env.staging', 'env.staging']);
  });
});
