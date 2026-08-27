import 'package:involve_app/core/utils/app_config.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:involve_app/core/widgets/custom_pin_input.dart';
import '../utils/onboarding_navigator.dart';
import '../utils/otp_resend_cooldown.dart';

class VerifyWhatsappPage extends StatefulWidget {
  final Map<String, dynamic> payload;
  final List<String> requiredChannels;

  const VerifyWhatsappPage({super.key, required this.payload, required this.requiredChannels});

  @override
  State<VerifyWhatsappPage> createState() => _VerifyWhatsappPageState();
}

class _VerifyWhatsappPageState extends State<VerifyWhatsappPage> with OtpResendCooldownMixin {
  bool _isVerifying = false;
  bool _isResending = false;
  String _currentPin = '';

  static const _accent = Color(0xFF10B981);

  @override
  void initState() {
    super.initState();
    // OTP was already sent when this page opened — lock resend for 90s.
    startResendCooldown();
  }

  Future<void> _verifyOtpAndCompleteOnboarding([String? pinOverride]) async {
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
      final phone = widget.payload['phone'];

      final verifyUrls = [
        '${AppConfig.baseUrl}/auth/verify-whatsapp-otp',
      ];

      bool otpVerified = false;
      String? lastError;
      for (final url in verifyUrls) {
        try {
          final response = await dio.post(
            url,
            data: {'phone': phone, 'code': pin, 'otp': pin},
          );
          if (response.statusCode == 200 && (response.data?['success'] != false)) {
            otpVerified = true;
            break;
          }
          lastError = extractApiErrorBody(response.data) ??
              'Invalid or expired WhatsApp code.';
        } catch (e) {
          lastError = friendlyApiError(
            e,
            fallback: 'Could not verify WhatsApp. Please try again.',
          );
        }
      }

      if (!otpVerified) {
        throw Exception(lastError ?? 'Invalid or expired WhatsApp code.');
      }

      if (!mounted) return;

      final existingChannels =
          (widget.payload['completedChannels'] as List<dynamic>?)?.cast<String>() ??
              [];
      widget.payload['completedChannels'] = <String>[...existingChannels, 'WHATSAPP'];

      // Keep progress bar visible until navigation completes.
      await OnboardingNavigator.proceed(context, widget.payload, widget.requiredChannels);
      if (mounted) setState(() => _isVerifying = false);
    } catch (e) {
      if (!mounted) return;
      setState(() => _isVerifying = false);
      showFriendlyErrorSnackBar(
        context,
        e,
        fallback: 'Invalid or expired WhatsApp code. Tap Resend OTP and try again.',
      );
    }
  }

  Future<void> _resendOtp() async {
    if (_isVerifying || _isResending || !canResendOtp) return;
    setState(() => _isResending = true);
    try {
      final dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 10)));
      final phone = widget.payload['phone'];
      final urls = [
        '${AppConfig.baseUrl}/auth/send-whatsapp-otp',
      ];

      bool otpSent = false;
      String? lastError;
      for (final url in urls) {
        try {
          await dio.post(url, data: {'phone': phone});
          otpSent = true;
          break;
        } catch (e) {
          lastError = friendlyApiError(
            e,
            fallback: 'Could not resend the WhatsApp code.',
          );
        }
      }

      if (!otpSent) {
        throw Exception(lastError ?? 'Could not resend the WhatsApp code.');
      }

      if (!mounted) return;
      setState(() => _isResending = false);
      startResendCooldown();

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('OTP resent successfully! Check WhatsApp.'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() => _isResending = false);
      showFriendlyErrorSnackBar(
        context,
        e,
        fallback: 'Could not resend the WhatsApp code. Please try again.',
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
              const Icon(Icons.chat_bubble_outline, color: _accent, size: 64),
              const SizedBox(height: 24),
              const Text(
                'Verify WhatsApp',
                style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'We sent a 6-digit code to your WhatsApp ${widget.payload['phone']}.',
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
                    onCompleted: (pin) => _verifyOtpAndCompleteOnboarding(pin),
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
                        onPressed: _isResending ? null : () => _verifyOtpAndCompleteOnboarding(),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _accent,
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: _accent.withOpacity(0.4),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text(
                          'VERIFY & ACTIVATE',
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
