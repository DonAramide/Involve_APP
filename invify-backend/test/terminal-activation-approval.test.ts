import { canApproveTerminalActivation } from '../src/utils/terminal-activation-approval';

describe('terminal activation maker-checker', () => {
  it('allows only support@iips.app to approve someone else', () => {
    expect(canApproveTerminalActivation('support@iips.app', 'ops@school.test').ok).toBe(true);
    expect(canApproveTerminalActivation('Support@IIPS.app', 'ops@school.test').ok).toBe(true);
  });

  it('blocks every other email', () => {
    const result = canApproveTerminalActivation('admin@invify.org', 'ops@school.test');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/support@iips.app/);
  });

  it('blocks the maker from approving their own request', () => {
    const result = canApproveTerminalActivation('support@iips.app', 'support@iips.app');
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/cannot approve/);
  });
});
