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
  bool _verifyLock = false;
  String _currentPin = '';

  static const _accent = Color(0xFF6366F1);
  static const _copyStyle = TextStyle(
    color: Color(0xFFB0B0B0),
    fontSize: 15,
    height: 1.45,
    fontFamily: 'Roboto',
    fontFamilyFallback: ['sans-serif'],
    wordSpacing: 1,
  );

  String get _email =>
      (widget.payload['email']?.toString() ?? '').trim().toLowerCase();

  bool get _emailAlreadyVerified =>
      ((widget.payload['completedChannels'] as List<dynamic>?)?.cast<String>() ?? [])
          .contains('EMAIL');

  @override
  void initState() {
    super.initState();
    // OTP was already sent when this page opened — lock resend for 90s.
    startResendCooldown();
  }

  Future<void> _verifyOtp([String? pinOverride]) async {
    if (_verifyLock || _isVerifying || _isResending) return;
    _verifyLock = true;

    if (_emailAlreadyVerified) {
      setState(() => _isVerifying = true);
      await OnboardingNavigator.proceed(context, widget.payload, widget.requiredChannels);
      if (mounted) {
        setState(() {
          _isVerifying = false;
          _verifyLock = false;
        });
      }
      return;
    }

    final pin = (pinOverride ?? _currentPin).trim();
    if (pin.length < 6) {
      _verifyLock = false;
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
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 20),
        validateStatus: (status) => status != null && status < 500,
      ));

      String? lastError;
      bool otpVerified = false;

      try {
        final response = await dio.post(
          '${AppConfig.baseUrl}/api/auth/verify-email-otp',
          data: {'email': _email, 'code': pin, 'otp': pin, 'purpose': 'SIGNUP'},
        );
        if (response.statusCode == 200 && (response.data?['success'] != false)) {
          otpVerified = true;
        } else {
          lastError = extractApiErrorBody(response.data) ??
              'Invalid or expired verification code.';
        }
      } catch (e) {
        lastError = friendlyApiError(
          e,
          fallback: 'Could not verify email. Please try again.',
        );
      }

      if (!otpVerified) {
        throw Exception(lastError ?? 'Invalid or expired verification code.');
      }

      if (!mounted) return;

      final existingChannels =
          (widget.payload['completedChannels'] as List<dynamic>?)?.cast<String>() ??
              [];
      if (!existingChannels.contains('EMAIL')) {
        widget.payload['completedChannels'] = <String>[...existingChannels, 'EMAIL'];
      }
      widget.payload['email'] = _email;

      await OnboardingNavigator.proceed(context, widget.payload, widget.requiredChannels);
      if (mounted) {
        setState(() {
          _isVerifying = false;
          _verifyLock = false;
        });
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isVerifying = false;
        _verifyLock = false;
      });
      showFriendlyErrorSnackBar(
        context,
        e,
        fallback: 'Invalid or expired verification code. Tap Resend OTP and try again.',
      );
    }
  }

  Future<void> _resendOtp() async {
    if (_verifyLock || _isVerifying || _isResending || !canResendOtp) return;
    setState(() => _isResending = true);
    try {
      final dio = Dio(BaseOptions(
        connectTimeout: const Duration(seconds: 20),
        receiveTimeout: const Duration(seconds: 20),
      ));

      bool sent = false;
      String? lastError;
      try {
        await dio.post('${AppConfig.baseUrl}/api/auth/send-email-otp', data: {
          'email': _email,
          'purpose': 'SIGNUP',
          'resend': true,
          if (widget.payload['deviceId'] != null) 'deviceId': widget.payload['deviceId'],
        });
        sent = true;
      } on DioException catch (dioErr) {
        if (dioErr.response?.statusCode == 409 ||
            (dioErr.response?.data is Map &&
                (dioErr.response?.data['code'] == 'EMAIL_ALREADY_EXISTS' ||
                 dioErr.response?.data['error']?.toString().toLowerCase().contains('already exists') == true))) {
          lastError = 'An account with this email already exists. Please sign in or use a different email.';
        } else {
          lastError = friendlyApiError(
            dioErr,
            fallback: 'Could not resend the code. Please try again.',
          );
        }
      } catch (e) {
        lastError = friendlyApiError(
          e,
          fallback: 'Could not resend the code. Please try again.',
        );
      }

      if (!sent) {
        throw Exception(lastError ?? 'Could not resend the code. Please try again.');
      }

      if (!mounted) return;
      setState(() => _isResending = false);
      startResendCooldown();

      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('OTP resent successfully! Check your newest email.'),
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
    return DefaultTextStyle.merge(
      style: const TextStyle(
        fontFamily: 'Roboto',
        fontFamilyFallback: ['sans-serif'],
      ),
      child: Scaffold(
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
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'Roboto',
                    fontFamilyFallback: ['sans-serif'],
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'We sent a 6-digit code to $_email.\nPlease enter it below.',
                  textAlign: TextAlign.center,
                  style: _copyStyle,
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
                          style: const TextStyle(
                            color: Color(0xFF9E9E9E),
                            fontWeight: FontWeight.w600,
                            fontFamily: 'Roboto',
                            fontFamilyFallback: ['sans-serif'],
                          ),
                        )
                      else
                        TextButton(
                          onPressed: _resendOtp,
                          child: const Text(
                            'Didn\'t receive code? Resend OTP',
                            style: TextStyle(
                              color: Colors.grey,
                              fontWeight: FontWeight.w600,
                              fontFamily: 'Roboto',
                              fontFamilyFallback: ['sans-serif'],
                            ),
                          ),
                        ),
                    ],
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
