export async function validateContaboConfig(values: Record<string, any>): Promise<{ valid: boolean; errors?: string[] }> {
  const errors: string[] = [];

  if (values['contabo.endpoint'] && !values['contabo.endpoint'].startsWith('http')) {
    errors.push('contabo.endpoint must be a valid URL starting with http or https');
  }

  if (values['contabo.contaboUploadPublicRead'] !== undefined && typeof values['contabo.contaboUploadPublicRead'] !== 'boolean') {
    errors.push('contabo.contaboUploadPublicRead must be a boolean');
  }

  return {
    valid: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined
  };
}
