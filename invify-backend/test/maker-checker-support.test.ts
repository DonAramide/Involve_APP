import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { canApproveAsSupport } from '../src/utils/support-approver';
import { MakerCheckerService, makerCheckerPublicView } from '../src/services/maker-checker.service';

describe('support maker-checker', () => {
  const queueFile = path.join(os.tmpdir(), `maker-checker-${process.pid}.json`);

  beforeEach(() => {
    process.env.MAKER_CHECKER_QUEUE_FILE = queueFile;
    if (fs.existsSync(queueFile)) fs.unlinkSync(queueFile);
  });

  afterAll(() => {
    if (fs.existsSync(queueFile)) fs.unlinkSync(queueFile);
  });

  it('allows only a different support@iips.app sign-in to approve', () => {
    expect(canApproveAsSupport('support@iips.app', 'ops@school.test').ok).toBe(true);
    expect(canApproveAsSupport('ops@school.test', 'ada@school.test').error).toMatch(/support@iips.app/);
    expect(canApproveAsSupport('support@iips.app', 'support@iips.app').error).toMatch(/cannot approve/);
  });

  it('keeps passwords out of the approval list', () => {
    const row = MakerCheckerService.propose({
      domain: 'staff_management',
      action: 'user_reset_password',
      target: 'user-1',
      summary: 'Reset password for Ada',
      body: { newPassword: 'secret-passphrase' },
      maker: { id: 'm1', email: 'ops@school.test', role: 'super_admin', tenantId: null },
    });
    const listed = MakerCheckerService.list('staff_management').map(makerCheckerPublicView);
    expect(listed).toEqual([
      expect.objectContaining({ id: row.id, summary: 'Reset password for Ada' }),
    ]);
    expect(JSON.stringify(listed)).not.toContain('secret-passphrase');
  });

  it('replaces an older pending change for the same action', () => {
    MakerCheckerService.propose({
      domain: 'pos_switchboard',
      action: 'routing_config',
      summary: 'First routing edit',
      body: { config: { version: 1 } },
      maker: { id: 'm1', email: 'ops@school.test', role: 'super_admin', tenantId: null },
    });
    MakerCheckerService.propose({
      domain: 'pos_switchboard',
      action: 'routing_config',
      summary: 'Second routing edit',
      body: { config: { version: 2 } },
      maker: { id: 'm1', email: 'ops@school.test', role: 'super_admin', tenantId: null },
    });
    const pending = MakerCheckerService.list('pos_switchboard');
    expect(pending).toHaveLength(1);
    expect(pending[0].summary).toBe('Second routing edit');
    expect(pending[0].body.config.version).toBe(2);
  });
});
