import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:involve_app/core/widgets/custom_pin_input.dart';
import 'package:involve_app/core/license/storage_service.dart';
import 'package:involve_app/features/dashboard/presentation/pages/dashboard_page.dart';
import 'package:involve_app/features/activation/presentation/pages/activation_page.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../utils/onboarding_navigator.dart';

class VerifyWhatsappPage extends StatefulWidget {
  final Map<String, dynamic> payload;
  final List<String> requiredChannels;

  const VerifyWhatsappPage({super.key, required this.payload, required this.requiredChannels});

  @override
  State<VerifyWhatsappPage> createState() => _VerifyWhatsappPageState();
}

class _VerifyWhatsappPageState extends State<VerifyWhatsappPage> {
  bool _isLoading = false;
  String _currentPin = '';

  Future<void> _verifyOtpAndCompleteOnboarding() async {
    if (_isLoading) return;
    
    if (_currentPin.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter the 6-digit OTP.')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 10)));
      final phone = widget.payload['phone'];
      
      final verifyUrls = [
        'http://localhost:3004/auth/verify-whatsapp-otp',
        '${dotenv.env['BASE_URL'] ?? 'http://192.168.1.194:3004'}/auth/verify-whatsapp-otp',
      ];

      bool otpVerified = false;
      for (var url in verifyUrls) {
        try {
          await dio.post(url, data: {'phone': phone, 'code': _currentPin});
          otpVerified = true;
          break;
        } catch (_) {}
      }

      if (!otpVerified) {
        throw Exception('Invalid WhatsApp OTP or server unreachable.');
      }

      setState(() => _isLoading = false);

      if (mounted) {
        final existingChannels = (widget.payload['completedChannels'] as List<dynamic>?)?.cast<String>() ?? [];
        widget.payload['completedChannels'] = <String>[...existingChannels, 'WHATSAPP'];
        await OnboardingNavigator.proceed(context, widget.payload, widget.requiredChannels);
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(e.toString()),
            backgroundColor: const Color(0xFFEF4444),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  Future<void> _resendOtp() async {
    setState(() => _isLoading = true);
    try {
      final dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 10)));
      final phone = widget.payload['phone'];
      final urls = [
        'http://localhost:3004/auth/send-whatsapp-otp',
        '${dotenv.env['BASE_URL'] ?? 'http://192.168.1.194:3004'}/auth/send-whatsapp-otp',
      ];

      bool otpSent = false;
      for (var url in urls) {
        try {
          await dio.post(url, data: {'phone': phone});
          otpSent = true;
          break;
        } catch (_) {}
      }

      setState(() => _isLoading = false);

      if (!otpSent) {
        throw Exception('Failed to resend WhatsApp OTP. Server unreachable.');
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('OTP resent successfully!'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF05070D),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.chat_bubble_outline, color: Color(0xFF10B981), size: 64),
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
              CustomPinInput(
                length: 6,
                onChanged: (pin) => setState(() => _currentPin = pin),
                onCompleted: (pin) => _verifyOtpAndCompleteOnboarding(),
              ),
              const SizedBox(height: 40),
              if (_isLoading)
                const CircularProgressIndicator(color: Color(0xFF10B981))
              else
                Column(
                  children: [
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _verifyOtpAndCompleteOnboarding,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF10B981),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('VERIFY & ACTIVATE', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextButton(
                      onPressed: _resendOtp,
                      child: const Text('Didn\'t receive code? Resend OTP', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.w600)),
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
