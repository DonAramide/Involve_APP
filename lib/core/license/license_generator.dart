/// Client-side license generation is disabled.
/// Activation codes must be minted by the Invify backend
/// (`POST /devices/activations`) which holds LICENSE_HMAC_SECRET.
class LicenseGenerator {
  static Never generate(String businessName, int durationDays, int planIndex, String deviceSuffix) {
    throw UnsupportedError(
      'Client-side license generation is disabled. Request an activation code from the Invify backend.',
    );
  }
}
