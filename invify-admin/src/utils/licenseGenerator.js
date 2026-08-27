/**
 * License generation has been moved server-side.
 * Clients must NOT embed HMAC signing secrets.
 * Use deviceApi.createActivation() / deviceApi.validateCode().
 */
export const LicenseGenerator = {
  generate: async function () {
    throw new Error(
      'Client-side license generation is disabled. Use POST /devices/activations via deviceApi.createActivation().',
    );
  },
};
