import 'package:involve_app/core/utils/app_config.dart';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:involve_app/core/widgets/custom_pin_input.dart';
import 'package:involve_app/features/activation/presentation/pages/verify_whatsapp_page.dart';
import '../utils/onboarding_navigator.dart';

class VerifyEmailPage extends StatefulWidget {
  final Map<String, dynamic> payload;
  final List<String> requiredChannels;

  const VerifyEmailPage({super.key, required this.payload, required this.requiredChannels});

  @override
  State<VerifyEmailPage> createState() => _VerifyEmailPageState();
}

class _VerifyEmailPageState extends State<VerifyEmailPage> {
  bool _isLoading = false;
  String _currentPin = '';

  Future<void> _verifyOtp() async {
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
      final email = widget.payload['email'];
      
      try {
        await dio.post('${AppConfig.baseUrl}/auth/verify-email-otp', data: {'email': email, 'code': _currentPin});
      } catch (e) {
        throw Exception('Invalid OTP or server unreachable: $e');
      }

      setState(() => _isLoading = false);

      if (mounted) {
        final existingChannels = (widget.payload['completedChannels'] as List<dynamic>?)?.cast<String>() ?? [];
        widget.payload['completedChannels'] = <String>[...existingChannels, 'EMAIL'];
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
      final email = widget.payload['email'];
      try {
        await dio.post('${AppConfig.baseUrl}/auth/send-email-otp', data: {'email': email});
      } catch (e) {
        throw Exception('Failed to resend email OTP: $e');
      }

      setState(() => _isLoading = false);

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
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
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
              const Icon(Icons.email_outlined, color: Color(0xFF6366F1), size: 64),
              const SizedBox(height: 24),
              const Text(
                'Verify Your Email',
                style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Text(
                'We sent a 6-digit code to ${widget.payload['email']}. Please enter it below.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey[400], fontSize: 14),
              ),
              const SizedBox(height: 40),
              CustomPinInput(
                length: 6,
                onChanged: (pin) => setState(() => _currentPin = pin),
                onCompleted: (pin) => _verifyOtp(),
              ),
              const SizedBox(height: 40),
              if (_isLoading)
                const CircularProgressIndicator(color: Color(0xFF6366F1))
              else
                Column(
                  children: [
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: _verifyOtp,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF6366F1),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        child: const Text('VERIFY & CONTINUE', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
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
