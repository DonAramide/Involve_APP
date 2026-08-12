import 'dart:async';
import 'package:flutter/material.dart';

/// Shared 90s resend lock for onboarding OTP screens.
mixin OtpResendCooldownMixin<T extends StatefulWidget> on State<T> {
  static const int otpResendCooldownSeconds = 90;

  Timer? _resendTimer;
  int resendSecondsLeft = otpResendCooldownSeconds;

  bool get canResendOtp => resendSecondsLeft <= 0;

  void startResendCooldown() {
    _resendTimer?.cancel();
    setState(() => resendSecondsLeft = otpResendCooldownSeconds);
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (!mounted) {
        timer.cancel();
        return;
      }
      if (resendSecondsLeft <= 1) {
        timer.cancel();
        setState(() => resendSecondsLeft = 0);
      } else {
        setState(() => resendSecondsLeft -= 1);
      }
    });
  }

  String get resendCooldownLabel {
    final m = resendSecondsLeft ~/ 60;
    final s = resendSecondsLeft % 60;
    if (m > 0) {
      return 'Resend OTP in $m:${s.toString().padLeft(2, '0')}';
    }
    return 'Resend OTP in ${s}s';
  }

  @override
  void dispose() {
    _resendTimer?.cancel();
    super.dispose();
  }
}

/// Progress UI shown while OTP is being verified / next step loads.
Widget buildOtpVerifyingProgress({required Color color, String label = 'Verifying…'}) {
  return Column(
    children: [
      Text(
        label,
        style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 14),
      ),
      const SizedBox(height: 16),
      ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: LinearProgressIndicator(
          minHeight: 6,
          backgroundColor: color.withOpacity(0.2),
          valueColor: AlwaysStoppedAnimation<Color>(color),
        ),
      ),
      const SizedBox(height: 8),
      Text(
        'Please wait while we continue setup',
        style: TextStyle(color: Colors.grey[500], fontSize: 12),
      ),
    ],
  );
}
