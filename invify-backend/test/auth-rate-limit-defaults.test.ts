import { AUTH_RATE_LIMIT_DEFAULT_MAX, AUTH_RATE_LIMIT_DEFAULT_WINDOW_MS } from '../src/config/auth-limits';
import * as fs from 'fs';
import * as path from 'path';

describe('authentication rate-limit defaults', () => {
  test('auth limiter default is far below the previous 10000/15min value', () => {
    expect(AUTH_RATE_LIMIT_DEFAULT_MAX).toBeLessThanOrEqual(40);
    expect(AUTH_RATE_LIMIT_DEFAULT_MAX).toBeGreaterThan(0);
    expect(AUTH_RATE_LIMIT_DEFAULT_WINDOW_MS).toBe(15 * 60 * 1000);
  });

  test('app.ts wires the shared auth-limit defaults', () => {
    const appSrc = fs.readFileSync(path.join(__dirname, '../src/app.ts'), 'utf8');
    expect(appSrc).toMatch(/AUTH_RATE_LIMIT_DEFAULT_MAX/);
    expect(appSrc).toMatch(/AUTH_RATE_LIMIT_DEFAULT_WINDOW_MS/);
    expect(appSrc).not.toMatch(/RATE_LIMIT_AUTH_MAX \|\| '10000'/);
  });
});
