export async function validateQipConfig(values: Record<string, any>): Promise<{ valid: boolean; errors?: string[] }> {
  const errors: string[] = [];

  if (values['qip.quasarIp'] && typeof values['qip.quasarIp'] !== 'string') {
    errors.push('qip.quasarIp must be a string');
  }

  if (values['qip.quasarPort'] && isNaN(Number(values['qip.quasarPort']))) {
    errors.push('qip.quasarPort must be a valid number');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}
