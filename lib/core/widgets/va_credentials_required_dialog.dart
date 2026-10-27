import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/core/license/license_service.dart';
import 'package:involve_app/core/license/storage_service.dart';
import 'package:involve_app/features/activation/presentation/pages/activation_page.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';
import 'package:involve_app/core/utils/api_error_message.dart';

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

/// Shows a clear admin-facing dialog when VA generation fails.
/// Guidance is error-specific — Quasar vault steps only appear for credential failures.
Future<void> showVirtualAccountFailureDialog(
  BuildContext context,
  Object error, {
  String subject = 'virtual account',
}) {
  final parsed = _parseVaFailure(error, subject: subject);
  if (parsed.kind == _VaFailureKind.freeTrial) {
    return showDialog<void>(
      context: context,
      builder: (c) => AlertDialog(
        title: const Text('Free Trial'),
        content: const Text(
          'You can’t access Virtual Account generation on Free Trial mode.\n\n'
          'Activate a Standard or Premium license to unlock virtual accounts for School, Retail, and Services.',
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

  final title = switch (parsed.kind) {
    _VaFailureKind.phoneRequired => 'Parent Phone Required',
    _VaFailureKind.financialPlatform => 'Activate Financial Platform',
    _VaFailureKind.credentials => 'Activate VA Credentials',
    _ => 'Could Not Generate VA',
  };
  final icon = switch (parsed.kind) {
    _VaFailureKind.phoneRequired => Icons.phone_disabled_outlined,
    _VaFailureKind.credentials || _VaFailureKind.financialPlatform => Icons.vpn_key_off_outlined,
    _ => Icons.error_outline,
  };
  final iconColor = switch (parsed.kind) {
    _VaFailureKind.phoneRequired => Colors.orange.shade800,
    _VaFailureKind.credentials || _VaFailureKind.financialPlatform => Colors.orange.shade800,
    _ => Colors.red.shade700,
  };

  return showDialog<void>(
    context: context,
    builder: (ctx) => AlertDialog(
      title: Row(
        children: [
          Icon(icon, color: iconColor),
          const SizedBox(width: 10),
          Expanded(
            child: Text(title, style: const TextStyle(fontSize: 18)),
          ),
        ],
      ),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              parsed.message,
              style: const TextStyle(fontSize: 14, height: 1.4),
            ),
            if (parsed.action != null) ...[
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
                      parsed.action!,
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

enum _VaFailureKind {
  freeTrial,
  phoneRequired,
  financialPlatform,
  credentials,
  other,
}

class _VaFailureInfo {
  final String message;
  final String? action;
  final _VaFailureKind kind;

  const _VaFailureInfo({
    required this.message,
    required this.kind,
    this.action,
  });
}

_VaFailureInfo _parseVaFailure(Object error, {String subject = 'virtual account'}) {
  String message = error.toString();
  String? apiAction;
  String? code;
  dynamic data;

  if (error is FinanceApiException) {
    message = error.message;
    data = error.data;
  }

  if (data is Map) {
    code = data['code']?.toString();
    message = (data['error'] ?? data['message'] ?? message).toString();
    apiAction = data['action']?.toString();
  }

  message = friendlyApiError(
    message,
    fallback: 'Could not generate a virtual account. Please try again.',
  );

  final lower = '${code ?? ''} $message'.toLowerCase();

  if (code == 'FREE_TRIAL_FEATURE_LOCKED' || lower.contains('free trial')) {
    return const _VaFailureInfo(
      message: 'Virtual accounts are not available on Free Trial.',
      kind: _VaFailureKind.freeTrial,
    );
  }

  // Missing phone on Invify side only (not Quasar PSP / customer-phone messages).
  final isPhoneRequired = code == 'PARENT_PHONE_REQUIRED' ||
      lower.contains('parent phone number is required') ||
      lower.contains('parent / guardian phone') ||
      (lower.contains('guardian phone') && lower.contains('required'));
  if (isPhoneRequired) {
    final onParent = subject.toLowerCase().contains('parent');
    return _VaFailureInfo(
      message: 'A parent / guardian phone number is required to generate this $subject.',
      action: onParent
          ? '1. Tap Edit on this parent profile\n'
              '2. Add the parent / guardian phone number\n'
              '3. Save\n'
              '4. Tap Generate again'
          : '1. Open this student profile (or Parents list)\n'
              '2. Edit and add the parent / guardian phone number\n'
              '3. Save\n'
              '4. Return here and tap Generate again',
      kind: _VaFailureKind.phoneRequired,
    );
  }

  final isPlatform = code == 'FINANCIAL_PLATFORM_UNPROVISIONED' ||
      lower.contains('financial_platform_unprovisioned') ||
      lower.contains('financial platform') ||
      lower.contains('unprovisioned');

  if (isPlatform) {
    return _VaFailureInfo(
      message:
          'This $subject cannot be created yet because Financial Platform is still UNPROVISIONED for this school.',
      action: '1. Open Invify Admin (super admin or tenant admin)\n'
          '2. Open this school\n'
          '3. Financial Platform → Activate Platform\n'
          '4. Return here and tap Generate again',
      kind: _VaFailureKind.financialPlatform,
    );
  }

  final isCredentials = code == 'VA_CREDENTIALS_REQUIRED' ||
      lower.contains('credential') ||
      lower.contains('not activated') ||
      lower.contains('not configured') ||
      lower.contains('api key') ||
      (lower.contains('quasar') &&
          (lower.contains('missing') ||
              lower.contains('invalid') ||
              lower.contains('fail') ||
              lower.contains('required')));

  if (isCredentials) {
    return _VaFailureInfo(
      message:
          'This $subject cannot be created yet because virtual-account credentials are not activated for this business.',
      action: apiAction ??
          '1. Open the Invify Admin web portal\n'
              '2. Go to Integration Vault (or Platform Config)\n'
              '3. Activate / save Quasar VA credentials for this tenant\n'
              '4. Return here and tap Generate again',
      kind: _VaFailureKind.credentials,
    );
  }

  // Generic failures: show the real error only — never Quasar vault steps.
  return _VaFailureInfo(
    message: message.isNotEmpty
        ? message
        : 'Virtual account generation failed. Please try again.',
    action: null,
    kind: _VaFailureKind.other,
  );
}
