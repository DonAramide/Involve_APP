import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import '../pages/verify_email_page.dart';
import '../pages/verify_whatsapp_page.dart';
import 'package:involve_app/features/dashboard/presentation/pages/dashboard_page.dart';
import '../pages/activation_page.dart';
import 'package:involve_app/core/license/storage_service.dart';

class OnboardingNavigator {
  static Future<void> proceed(BuildContext context, Map<String, dynamic> payload, List<String> requiredChannels, {bool isMounted = true}) async {
    // Determine the next uncompleted channel
    List<String> completedChannels = (payload['completedChannels'] as List<dynamic>?)?.cast<String>() ?? [];
    String? nextChannel;

    for (String channel in requiredChannels) {
      if (!completedChannels.contains(channel)) {
        nextChannel = channel;
        break;
      }
    }

    if (nextChannel == null) {
      // All channels completed, activate account!
      await activateAccount(context, payload, isMounted);
    } else {
      // Navigate to the next channel
      Widget nextScreen;
      final dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 10)));
      
      try {
        switch (nextChannel) {
          case 'EMAIL':
            await _sendOtp(dio, payload['email'], 'email');
            nextScreen = VerifyEmailPage(payload: payload, requiredChannels: requiredChannels);
            break;
          case 'WHATSAPP':
            await _sendOtp(dio, payload['phone'], 'whatsapp');
            nextScreen = VerifyWhatsappPage(payload: payload, requiredChannels: requiredChannels);
            break;
          default:
            // Unknown channel, treat as completed and proceed
            payload['completedChannels'] = [...completedChannels, nextChannel];
            await proceed(context, payload, requiredChannels, isMounted: isMounted);
            return;
        }
      } catch (e) {
        if (isMounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
          );
        }
        return;
      }

      if (isMounted) {
        Navigator.of(context).push(MaterialPageRoute(builder: (_) => nextScreen));
      }
    }
  }

  static Future<void> activateAccount(BuildContext context, Map<String, dynamic> payload, bool isMounted) async {
    try {
      final dio = Dio(BaseOptions(connectTimeout: const Duration(seconds: 10)));
      
      final signupUrls = [
        'http://localhost:3004/auth/register',
        '${dotenv.env['BASE_URL'] ?? 'http://192.168.1.194:3004'}/auth/register',
      ];

      bool signupSuccess = false;
      String lastError = 'Server may be down.';
      
      for (var url in signupUrls) {
        try {
          await dio.post(url, data: {
            'firstName': payload['firstName'],
            'lastName': payload['lastName'],
            'email': payload['email'],
            'password': payload['password'],
            'phone': payload['phone'],
            'businessName': payload['businessName'],
            'industry': payload['industry'],
            'emailVerified': payload['completedChannels']?.contains('EMAIL') ?? false,
            'phoneVerified': payload['completedChannels']?.contains('WHATSAPP') ?? false,
            'isTrial': payload['isTrial'],
          });
          signupSuccess = true;
          break;
        } catch (e) {
          debugPrint('Signup error on $url: $e');
          if (e is DioException && e.response != null) {
            debugPrint('Signup backend response: ${e.response?.data}');
            lastError = e.response?.data['error'] ?? e.response?.data['message'] ?? e.toString();
          } else {
            lastError = e.toString();
          }
        }
      }

      if (!signupSuccess) {
        throw Exception('Failed to create account. $lastError');
      }

      // Mark device as onboarded locally
      await StorageService.setOnboardingCompleted(true);
      if (payload['isTrial'] == true) {
        await StorageService.saveTrialStartDate(DateTime.now());
      }

      if (isMounted) {
        final isTrial = payload['isTrial'] == true;
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => isTrial ? const DashboardPage() : const ActivationPage(isExpired: false)),
          (route) => false,
        );
      }
    } catch (e) {
      if (isMounted) {
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

  static Future<void> _sendOtp(Dio dio, String identifier, String type) async {
    final urls = [
      'http://localhost:3004/auth/send-$type-otp',
      '${dotenv.env['BASE_URL'] ?? 'http://192.168.1.194:3004'}/auth/send-$type-otp',
    ];

    bool otpSent = false;
    for (var url in urls) {
      try {
        await dio.post(url, data: {type == 'email' ? 'email' : 'phone': identifier});
        otpSent = true;
        break;
      } catch (_) {}
    }

    if (!otpSent) {
      throw Exception('Failed to send $type OTP. Server unreachable.');
    }
  }
}
