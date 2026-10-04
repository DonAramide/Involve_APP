import { PDFService } from '../src/services/pdf.service';
import { resolveTenantActivationEmail } from '../src/services/terminal-activation-delivery';
import { EmailService } from '../src/services/email.service';

describe('terminal activation delivery', () => {
  it('uses the tenant owner email, then an owner user', () => {
    expect(resolveTenantActivationEmail({ owner_email: ' school@example.com ' }, [])).toBe('school@example.com');
    expect(resolveTenantActivationEmail({ owner_email: '' }, [
      { role: 'staff', email: 'staff@example.com' },
      { role: 'OWNER', email: 'owner@example.com' },
    ])).toBe('owner@example.com');
    expect(resolveTenantActivationEmail(null, [])).toBeNull();
  });

  it('builds a downloadable activation PDF', async () => {
    const pdf = await PDFService.generateTerminalActivationPDF({
      businessName: 'Greenfield Academy',
      mode: 'school',
      plan: 'STANDARD',
      durationDays: 365,
      expiry: '4 October 2027',
      activationCode: 'ABCD-EFGH-IJKL',
      deviceSuffix: 'A1',
    });
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
    expect(pdf.length).toBeGreaterThan(1500);
    const raw = pdf.toString('latin1');
    expect(raw).toContain('/Subtype /Image');
    expect(raw).toContain('/Width 320');
    expect(raw).toContain('/Width 454');
  });

  it('names the attachment as a pdf', () => {
    const name = new EmailService().activationPdfFilename('Greenfield Academy');
    expect(name.endsWith('.pdf')).toBe(true);
    expect(name).toMatch(/Greenfield/);
  });
});
