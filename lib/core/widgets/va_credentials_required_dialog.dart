import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/core/license/license_service.dart';
import 'package:involve_app/core/license/storage_service.dart';
import 'package:involve_app/features/activation/presentation/pages/activation_page.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';

/// Shared Free Trial lock for VA generation (school / retail / services / staff).
/// Returns `true` when blocked (dialog shown); caller should return early.
Future<bool> showFreeTrialVaLockedIfNeeded(
  BuildContext context, {
  String? businessName,
}) async {
  // 1. Pro plan in SettingsBloc is never locked
  try {
    final userPlan = context.read<SettingsBloc>().state.userPlan;
    if (userPlan != null && userPlan.isValid && userPlan.isPro) {
      return false;
    }
  } catch (_) {}

  // 2. Direct check on server-activated plan for activated devices
  final serverPlan = await StorageService.getServerActivatedPlan();
  if (serverPlan != null && DateTime.now().isBefore(serverPlan.expiryDate)) {
    final p = serverPlan.planType.toLowerCase().trim();
    if (p == 'pro' || p == 'premium' || p == 'enterprise' || p == 'lifetime' || p == 'standard') {
      return false;
    }
  }

  final onFreeTrial = await LicenseService.isOnFreeTrialOnly(businessName: businessName);
  if (!onFreeTrial) return false;
  if (!context.mounted) return true;

  await showDialog<void>(
    context: context,
    builder: (c) => AlertDialog(
      title: const Text('Free Trial'),
      content: const Text(
        'You can’t access Virtual Account generation on Free Trial mode.\n\n'
        'This applies to School, Retail, and Services.\n'
        'Activate a Pro / paid license to unlock virtual accounts.',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(c),
          child: const Text('OK'),
        ),
        TextButton(
          onPressed: () {
            Navigator.pop(c);
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => const ActivationPage(isExpired: false),
              ),
            );
          },
          child: const Text('Activate'),
        ),
      ],
    ),
  );
  return true;
}

/// Shows a clear admin-facing dialog when VA generation fails because
/// Quasar / VA credentials still need activation in the web portal.
Future<void> showVirtualAccountFailureDialog(
  BuildContext context,
  Object error, {
  String subject = 'virtual account',
}) {
  final text = error.toString().toLowerCase();
  if (text.contains('free trial') || text.contains('free_trial_feature_locked')) {
    return showDialog<void>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Free Trial'),
        content: const Text(
          'You can’t access Virtual Account generation on Free Trial mode.\n\n'
          'Activate a Pro / paid license to unlock virtual accounts for School, Retail, and Services.',
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(c), child: const Text('OK')),
          TextButton(
            onPressed: () {
              Navigator.pop(c);
              Navigator.push(
                context,
                MaterialPageRoute(builder: (_) => const ActivationPage(isExpired: false)),
              );
            },
            child: const Text('Activate'),
          ),
        ],
      ),
    );
  }

  final parsed = _parseVaFailure(error);
  final needsWebActivation = parsed.needsWebActivation;

  return showDialog<void>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Row(
        children: [
          Icon(
            needsWebActivation ? Icons.vpn_key_off_outlined : Icons.error_outline,
            color: needsWebActivation ? Colors.orange.shade800 : Colors.red.shade700,
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              needsWebActivation
                  ? 'Activate VA Credentials'
                  : 'Could Not Generate VA',
              style: const TextStyle(fontSize: 18),
            ),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              needsWebActivation
                  ? 'This $subject cannot be created yet because virtual-account credentials are not activated for this business.'
                  : (parsed.message.isNotEmpty
                      ? parsed.message
                      : 'Virtual account generation failed. Please try again.'),
              style: const TextStyle(fontSize: 14, height: 1.4),
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: Colors.blue.shade100),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'What to do',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: Colors.blue.shade900,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    parsed.action ??
                        '1. Open the Invify Admin web portal\n'
                        '2. Go to Integration Vault (or Platform Config)\n'
                        '3. Activate / save Quasar VA credentials for this tenant\n'
                        '4. Return here and tap Generate again',
                    style: TextStyle(
                      fontSize: 13,
                      height: 1.45,
                      color: Colors.blue.shade900,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(ctx),
          child: const Text('GOT IT'),
        ),
      ],
    ),
  );
}

class _VaFailureInfo {
  final String message;
  final String? action;
  final bool needsWebActivation;

  const _VaFailureInfo({
    required this.message,
    required this.needsWebActivation,
    this.action,
  });
}

_VaFailureInfo _parseVaFailure(Object error) {
  String message = error.toString();
  String? action;
  String? code;
  dynamic data;

  if (error is FinanceApiException) {
    message = error.message;
    data = error.data;
  }

  if (data is Map) {
    code = data['code']?.toString();
    message = (data['error'] ?? data['message'] ?? message).toString();
    action = data['action']?.toString();
  }

  final lower = '${code ?? ''} $message'.toLowerCase();
  final needsWebActivation = code == 'VA_CREDENTIALS_REQUIRED' ||
      lower.contains('credential') ||
      lower.contains('not activated') ||
      lower.contains('not configured') ||
      lower.contains('quasar') ||
      lower.contains('api key') ||
      lower.contains('failed to provision');

  return _VaFailureInfo(
    message: message,
    action: action,
    needsWebActivation: needsWebActivation,
  );
}
