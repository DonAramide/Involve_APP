import fs from 'fs';
import path from 'path';

describe('Invify catalogue audit lockdown SQL', () => {
  const lockdown = fs.readFileSync(
    path.join(__dirname, '../proposals/DO_NOT_APPLY_hw_invify_catalogue_audit_lockdown.sql'),
    'utf8'
  );
  const original = fs.readFileSync(
    path.join(__dirname, '../proposals/DO_NOT_APPLY_hw_invify_catalogue.sql'),
    'utf8'
  );
  const integrity = fs.readFileSync(
    path.join(__dirname, '../proposals/_disposable_hw_invify_catalogue_integrity.sql'),
    'utf8'
  );
  const service = fs.readFileSync(
    path.join(__dirname, '../src/modules/health-insurance/services/invify-catalogue.service.ts'),
    'utf8'
  );

  test('does not rerun the applied catalogue CREATE TABLE file', () => {
    expect(original).toMatch(/DO NOT RERUN/);
    expect(lockdown).toMatch(/Do not rerun the original file/);
    expect(lockdown).not.toMatch(/CREATE TABLE IF NOT EXISTS public\.hw_catalogue_offerings/);
  });

  test('revokes service_role table writes and keeps SELECT plus RPC execute', () => {
    expect(lockdown).toMatch(/REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public\.%I FROM %I/);
    expect(lockdown).toMatch(/GRANT SELECT ON public\.%I TO service_role/);
    expect(lockdown).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.hw_catalogue_apply_mutation\(text, jsonb, uuid, text\) TO service_role/
    );
    expect(lockdown).not.toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON public\.%I TO service_role/);
    expect(lockdown).not.toMatch(/GRANT SELECT, INSERT ON public\.hw_catalogue_events TO service_role/);
  });

  test('RPC uses a controlled search_path and enforces the status graph', () => {
    expect(lockdown).toMatch(/SET search_path = pg_catalog, public, pg_temp/);
    expect(lockdown).toMatch(/Cannot change catalogue status from % to %/);
    expect(lockdown).toMatch(/v_offering\.status = 'draft' AND v_next = 'published'/);
    expect(lockdown).toMatch(/v_offering\.status = 'published' AND v_next = 'suspended'/);
  });

  test('integrity proves direct DML is denied, invalid transitions leave no audit, and RPC still writes both rows', () => {
    expect(integrity).toMatch(/service_role must not INSERT catalogue rows directly/);
    expect(integrity).toMatch(/service_role must not INSERT catalogue events directly/);
    expect(integrity).toMatch(/invalid transition left partial catalogue or audit rows/);
    expect(integrity).toMatch(/service_role RPC execute must write the audit event/);
    expect(integrity).not.toMatch(/GRANT SELECT, INSERT, UPDATE, DELETE ON public\.hw_catalogue_offerings TO service_role/);
  });

  test('application mutations cannot bypass the RPC', () => {
    expect(service).toContain("supabaseAdmin.rpc('hw_catalogue_apply_mutation'");
    expect(service).toContain('assertStatusTransition');
    expect(service).not.toMatch(/from\('hw_catalogue_offerings'\)[\s\S]{0,120}\.insert/);
    expect(service).not.toMatch(/from\('hw_catalogue_events'\)/);
  });
});
