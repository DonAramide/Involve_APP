import 'package:involve_app/core/utils/app_config.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:involve_app/core/widgets/custom_pin_input.dart';
import '../utils/onboarding_navigator.dart';
import '../utils/otp_resend_cooldown.dart';

class VerifyEmailPage extends StatefulWidget {
  final Map<String, dynamic> payload;
  final List<String> requiredChannels;

  const VerifyEmailPage({super.key, required this.payload, required this.requiredChannels});

  @override
  State<VerifyEmailPage> createState() => _VerifyEmailPageState();
}

class _VerifyEmailPageState extends State<VerifyEmailPage> with OtpResendCooldownMixin {
  bool _isVerifying = false;
  bool _isResending = false;
  String _currentPin = '';

  static const _accent = Color(0xFF6366F1);

  String get _email =>
      (widget.payload['email']?.toString() ?? '').trim().toLowerCase();

  @override
  void initState() {
    super.initState();
    // OTP was already sent when this page opened — lock resend for 90s.
    startResendCooldown();
  }

  Future<void> _verifyOtp([String? pinOverride]) async {
    if (_isVerifying || _isResending) return;

    final pin = (pinOverride ?? _currentPin).trim();
    if (pin.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter the 6-digit OTP.')),
      );
      return;
    }

    setState(() {
      _isVerifying = true;
      _currentPin = pin;
    });

    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 10),
        validateStatus: (status) => status != null && status < 500,
      ));

      final verifyUrls = [
        '${AppConfig.baseUrl}/api/auth/verify-email-otp',
      ];

      String? lastError;
      bool otpVerified = false;

      for (final url in verifyUrls) {
        try {
          final response = await dio.post(
            url,
            data: {'email': _email, 'code': pin, 'otp': pin, 'purpose': 'SIGNUP'},
          );
          if (response.statusCode == 200 && (response.data?['success'] != false)) {
            otpVerified = true;
            break;
          }
          lastError = extractApiErrorBody(response.data) ??
              'Invalid or expired verification code.';
        } catch (e) {
          lastError = friendlyApiError(
            e,
            fallback: 'Could not verify email. Please try again.',
          );
        }
      }

      if (!otpVerified) {
        throw Exception(lastError ?? 'Invalid or expired verification code.');
      }

      if (!mounted) return;

      final existingChannels =
          (widget.payload['completedChannels'] as List<dynamic>?)?.cast<String>() ??
              [];
      widget.payload['completedChannels'] = <String>[...existingChannels, 'EMAIL'];
      widget.payload['email'] = _email;

      // Keep progress bar visible until navigation completes.
      await OnboardingNavigator.proceed(context, widget.payload, widget.requiredChannels);
      if (mounted) setState(() => _isVerifying = false);
    } catch (e) {
      if (!mounted) return;
      setState(() => _isVerifying = false);
      showFriendlyErrorSnackBar(
        context,
        e,
        fallback: 'Invalid or expired verification code. Tap Resend OTP and try again.',
      );
    }
  }

  Future<void> _resendOtp() async {
    if (_isVerifying || _isResending || !canResendOtp) return;
    setState(() => _isResending = true);
    try {
      final dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 10)));
      final urls = [
        '${AppConfig.baseUrl}/api/auth/send-email-otp',
      ];

      bool sent = false;
      String? lastError;
      for (final url in urls) {
        try {
          await dio.post(url, data: {'email': _email, 'purpose': 'SIGNUP'});
          sent = true;
          break;
        } on DioException catch (dioErr) {
          if (dioErr.response?.statusCode == 409 ||
              (dioErr.response?.data is Map &&
                  (dioErr.response?.data['code'] == 'EMAIL_ALREADY_EXISTS' ||
                   dioErr.response?.data['error']?.toString().toLowerCase().contains('already exists') == true))) {
            lastError = 'An account with this email already exists. Please sign in or use a different email.';
            break;
          }
          lastError = friendlyApiError(
            dioErr,
            fallback: 'Could not resend the code. Please try again.',
          );
        } catch (e) {
          lastError = friendlyApiError(
            e,
            fallback: 'Could not resend the code. Please try again.',
          );
        }
      }

      if (!sent) {
        throw Exception(lastError ?? 'Could not resend the code. Please try again.');
      }

      if (!mounted) return;
      setState(() => _isResending = false);
      startResendCooldown();

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('OTP resent successfully! Check your email.'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isResending = false);
      showFriendlyErrorSnackBar(
        context,
        e,
        fallback: 'Could not resend the code. Please try again.',
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF05070D),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: _isVerifying ? null : () => Navigator.of(context).pop(),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.email_outlined, color: _accent, size: 64),
              const SizedBox(height: 24),
              const Text(
                'Verify Your Email',
                style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'We sent a 6-digit code to $_email. Please enter it below.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey[400], fontSize: 14),
              ),
              const SizedBox(height: 40),
              IgnorePointer(
                ignoring: _isVerifying,
                child: Opacity(
                  opacity: _isVerifying ? 0.5 : 1,
                  child: CustomPinInput(
                    length: 6,
                    onChanged: (pin) => setState(() => _currentPin = pin),
                    onCompleted: (pin) => _verifyOtp(pin),
                  ),
                ),
              ),
              const SizedBox(height: 40),
              if (_isVerifying)
                buildOtpVerifyingProgress(color: _accent)
              else
                Column(
                  children: [
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _isResending ? null : () => _verifyOtp(),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _accent,
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: _accent.withOpacity(0.4),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text(
                          'VERIFY & CONTINUE',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    if (_isResending)
                      const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2, color: _accent),
                      )
                    else if (!canResendOtp)
                      Text(
                        resendCooldownLabel,
                        style: TextStyle(color: Colors.grey[500], fontWeight: FontWeight.w600),
                      )
                    else
                      TextButton(
                        onPressed: _resendOtp,
                        child: const Text(
                          'Didn\'t receive code? Resend OTP',
                          style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w600),
                        ),
                      ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}
