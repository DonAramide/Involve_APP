import 'package:involve_app/core/utils/app_config.dart';
import 'package:involve_app/core/utils/api_error_message.dart';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../pages/verify_email_page.dart';
import '../pages/verify_whatsapp_page.dart';
import 'package:involve_app/features/dashboard/presentation/pages/dashboard_page.dart';
import '../pages/activation_page.dart';
import 'package:involve_app/core/license/storage_service.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';

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
            payload['email'] = (payload['email']?.toString() ?? '').trim().toLowerCase();
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
          showFriendlyErrorSnackBar(
            context,
            e,
            fallback: 'Could not send verification code. Please try again.',
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
        '${AppConfig.baseUrl}/auth/register',
      ];

      bool signupSuccess = false;
      String lastError = 'Server may be down.';
      
      for (var url in signupUrls) {
        try {
          final response = await dio.post(url, data: {
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
            'country': payload['country'],
            'state': payload['state'],
            'lga': payload['lga'],
            'streetAddress': payload['streetAddress'],
            // Device identity fields
            'deviceId': payload['deviceId'],
            'agentCode': payload['agentCode'] ?? 'AAA000',
            'location': payload['location'],
          });
          
          if (response.data != null && response.data['offlineToken'] != null) {
            await SecurityService().setOfflineToken(response.data['offlineToken']);
          }
          
          signupSuccess = true;
          break;
        } catch (e) {
          debugPrint('Signup error on $url: $e');
          lastError = friendlyApiError(
            e,
            fallback: 'Could not create your account. Please try again.',
          );
        }
      }

      if (!signupSuccess) {
        throw Exception(
          lastError.isNotEmpty
              ? lastError
              : 'Could not create your account. Please try again.',
        );
      }

      // Mark device as onboarded locally
      await StorageService.setOnboardingCompleted(true);
      if (payload['isTrial'] == true) {
        await StorageService.saveTrialStartDate(DateTime.now());
      }

      if (isMounted) {
        // Sync the business name globally
        try {
          final settingsBloc = context.read<SettingsBloc>();
          final currentSettings = settingsBloc.state.settings;
          if (currentSettings != null) {
            settingsBloc.add(UpdateAppSettings(
              currentSettings.copyWith(
                organizationName: payload['businessName'] ?? currentSettings.organizationName,
                phone: payload['phone'] ?? currentSettings.phone,
              )
            ));
          }
        } catch (e) {
          debugPrint('Error syncing business name: $e');
        }

        final isTrial = payload['isTrial'] == true;
        Navigator.of(context).pushAndRemoveUntil(
          MaterialPageRoute(builder: (_) => isTrial ? const DashboardPage() : const ActivationPage(isExpired: false)),
          (route) => false,
        );
      }
    } catch (e) {
      if (isMounted) {
        showFriendlyErrorSnackBar(
          context,
          e,
          fallback: 'Could not finish setup. Please try again.',
        );
      }
    }
  }

  static Future<void> _sendOtp(Dio dio, String identifier, String type) async {
    final urls = [
      'http://localhost:3004/auth/send-$type-otp',
      '${AppConfig.baseUrl}/auth/send-$type-otp',
    ];

    bool otpSent = false;
    String? lastError;
    for (var url in urls) {
      try {
        await dio.post(url, data: {type == 'email' ? 'email' : 'phone': identifier});
        otpSent = true;
        break;
      } catch (e) {
        lastError = friendlyApiError(
          e,
          fallback: 'Could not send $type verification code.',
        );
      }
    }

    if (!otpSent) {
      throw Exception(lastError ?? 'Could not send $type verification code. Please try again.');
    }
  }
}
