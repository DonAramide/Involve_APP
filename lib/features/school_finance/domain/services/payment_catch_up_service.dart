import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/core/services/payment_alert_sound.dart';
import 'package:involve_app/core/services/device_notification_service.dart';
import 'package:involve_app/features/dashboard/presentation/widgets/notification_bell.dart';
import 'package:involve_app/features/services/domain/services/customer_wallet_credit_service.dart';

/// On socket reconnect, fetch SUCCESS credits since last seen and apply locally.
class PaymentCatchUpService {
  PaymentCatchUpService._();
  static final PaymentCatchUpService instance = PaymentCatchUpService._();

  static const String prefsKey = 'payment_catchup_last_seen_iso';
  static const Duration defaultLookback = Duration(days: 7);

  bool _running = false;
  DateTime? _lastRunAt;

  GlobalKey<ScaffoldMessengerState>? scaffoldMessengerKey;

  Future<DateTime> getLastSeen() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(prefsKey);
    if (raw != null && raw.isNotEmpty) {
      final parsed = DateTime.tryParse(raw);
      if (parsed != null) return parsed.toUtc();
    }
    return DateTime.now().toUtc().subtract(defaultLookback);
  }

  Future<void> markSeen(DateTime when) async {
    final prefs = await SharedPreferences.getInstance();
    final existing = await getLastSeen();
    final next = when.toUtc().isAfter(existing) ? when.toUtc() : existing;
    await prefs.setString(prefsKey, next.toIso8601String());
  }

  Future<void> markSeenFromLivePayment(dynamic data) async {
    try {
      final map = data is Map
          ? Map<String, dynamic>.from(data as Map)
          : <String, dynamic>{};
      final created = DateTime.tryParse('${map['createdAt'] ?? map['timestamp'] ?? ''}');
      await markSeen(created ?? DateTime.now().toUtc());
    } catch (_) {
      await markSeen(DateTime.now().toUtc());
    }
  }

  /// Fetch missed payments and credit/notify. Safe to call on every connect.
  Future<int> runCatchUp({
    bool showBanner = true,
    bool force = false,
    Duration? lookback,
  }) async {
    if (_running) return 0;
    // Debounce: skip if we just ran within 8 seconds (connect storms).
    if (!force &&
        _lastRunAt != null &&
        DateTime.now().difference(_lastRunAt!) < const Duration(seconds: 8)) {
      return 0;
    }
    _running = true;
    _lastRunAt = DateTime.now();

    try {
      if (!GetIt.instance.isRegistered<FinanceApiClient>()) {
        debugPrint('[PaymentCatchUp] FinanceApiClient not registered yet');
        return 0;
      }
      final client = GetIt.instance<FinanceApiClient>();
      final since = force
          ? DateTime.now().toUtc().subtract(lookback ?? const Duration(days: 30))
          : await getLastSeen();
      // Slight overlap so borderline timestamps are not missed.
      final sinceQuery =
          since.subtract(const Duration(seconds: 5)).toIso8601String();

      debugPrint('[PaymentCatchUp] Fetching missed payments since $sinceQuery');
      final response = await client.get(
        '/api/finance/missed-payments',
        queryParameters: {'since': sinceQuery},
      );

      final body = response.data;
      final List<dynamic> rows;
      if (body is Map && body['data'] is List) {
        rows = body['data'] as List<dynamic>;
      } else if (body is List) {
        rows = body;
      } else {
        rows = const [];
      }

      if (rows.isEmpty) {
        await markSeen(DateTime.now().toUtc());
        return 0;
      }

      DateTime newest = since;
      int applied = 0;
      double totalAmount = 0;

      for (final raw in rows) {
        if (raw is! Map) continue;
        final map = Map<String, dynamic>.from(raw);
        final created =
            DateTime.tryParse('${map['createdAt'] ?? ''}')?.toUtc();
        if (created != null && created.isAfter(newest)) {
          newest = created;
        }

        Map<String, dynamic> metadata = {};
        final metadataRaw = map['metadata'];
        if (metadataRaw is Map) {
          metadata = Map<String, dynamic>.from(metadataRaw);
        } else if (metadataRaw is String && metadataRaw.isNotEmpty) {
          try {
            final decoded = jsonDecode(metadataRaw);
            if (decoded is Map) {
              metadata = Map<String, dynamic>.from(decoded);
            }
          } catch (_) {}
        }

        final amount = _nairaFromRow(map, metadata);
        final reference = '${map['reference'] ?? ''}'.trim();
        if (amount <= 0 || reference.isEmpty) continue;

        final payload = {
          'type': 'payment.success',
          'reference': reference,
          'amount': amount,
          'customerId': map['customerId'],
          'walletId': map['walletId'],
          'createdAt': map['createdAt'],
          'metadata': metadata,
        };

        final credited =
            await CustomerWalletCreditService.instance.applyPaymentSuccess(payload);

        // Once we've shown a notification for this reference, never resend it
        // on reconnect / catch-up / VA refresh.
        final shouldNotify =
            await CustomerWalletCreditService.instance.claimPaymentNotification(reference);
        if (!shouldNotify) {
          debugPrint('[PaymentCatchUp] Skip re-notify for $reference');
          continue;
        }

        final sender = (metadata['senderName'] ??
                metadata['studentName'] ??
                'a payer')
            .toString();
        final formatted = amount.toStringAsFixed(2);
        await NotificationInbox.add(
          message: credited
              ? '₦$formatted received from $sender (synced)'
              : '₦$formatted payment while offline · $sender',
          type: 'payment',
          extra: {
            'reference': reference,
            'amount': amount,
            'catchUp': true,
          },
        );

        unawaited(DeviceNotificationService.showPayment(
          title: credited ? 'Payment received' : 'Payment while offline',
          message: credited
              ? '₦$formatted received from $sender (synced)'
              : '₦$formatted payment while offline · $sender',
          reference: reference,
        ));

        if (!credited) {
          await CustomerWalletCreditService.instance.markReferenceNotified(
            reference: reference,
            amount: amount,
            senderName: sender,
            metadata: metadata,
            createdAt: map['createdAt']?.toString(),
          );
        }

        applied++;
        totalAmount += amount;
      }

      await markSeen(
        newest.isAfter(since) ? newest.add(const Duration(milliseconds: 1)) : DateTime.now().toUtc(),
      );

      if (applied > 0) {
        unawaited(PaymentAlertSound.play());
        if (showBanner) {
          final formatted = totalAmount.toStringAsFixed(2);
          scaffoldMessengerKey?.currentState?.showSnackBar(
            SnackBar(
              content: Text(
                applied == 1
                    ? 'Caught up 1 offline payment (₦$formatted)'
                    : 'Caught up $applied offline payments (₦$formatted)',
              ),
              backgroundColor: Colors.teal.shade700,
              behavior: SnackBarBehavior.floating,
              duration: const Duration(seconds: 6),
            ),
          );
        }
      }

      debugPrint('[PaymentCatchUp] Applied $applied missed payment(s)');
      return applied;
    } catch (e, st) {
      debugPrint('[PaymentCatchUp] Failed: $e\n$st');
      return 0;
    } finally {
      _running = false;
    }
  }

  /// Refresh this VA from Invify (missed payments + VA ledger) and apply locally.
  Future<int> refreshVirtualAccount({
    required String accountNumber,
    bool showBanner = false,
  }) async {
    var applied = await runCatchUp(
      showBanner: false,
      force: true,
      lookback: const Duration(days: 30),
    );
    applied += await _applyAccountTransactions(accountNumber);
    return applied;
  }

  Future<int> _applyAccountTransactions(String accountNumber) async {
    if (!GetIt.instance.isRegistered<FinanceApiClient>()) return 0;
    final va = accountNumber.trim();
    if (va.isEmpty) return 0;
    try {
      final client = GetIt.instance<FinanceApiClient>();
      final response = await client.get(
        '/api/finance/virtual-accounts/$va/transactions',
      );
      final body = response.data;
      final rows = body is List
          ? body
          : (body is Map && body['data'] is List ? body['data'] as List : const []);
      var applied = 0;
      var quasarBalance = 0.0;
      for (final raw in rows) {
        if (raw is! Map) continue;
        final map = Map<String, dynamic>.from(raw);
        Map<String, dynamic> metadata = {};
        final metadataRaw = map['metadata'];
        if (metadataRaw is Map) {
          metadata = Map<String, dynamic>.from(metadataRaw);
        }
        final amount = _nairaFromRow(map, metadata);
        final reference = '${map['reference'] ?? ''}'.trim();
        if (amount <= 0 || reference.isEmpty) continue;
        metadata['virtualAccountNumber'] ??= va;
        metadata['accountNumber'] ??= va;
        final credited = await CustomerWalletCreditService.instance.applyPaymentSuccess({
          'type': 'payment.success',
          'reference': reference,
          'amount': amount,
          'customerId': map['customerId'] ?? metadata['customerId'],
          'createdAt': map['createdAt'] ?? map['created_at'],
          'metadata': metadata,
        });
        if (credited) applied++;
        final qb = metadata['quasarBalance'];
        if (qb is num && qb.toDouble() > quasarBalance) {
          quasarBalance = qb.toDouble();
        }
      }
      if (quasarBalance > 0) {
        applied += await CustomerWalletCreditService.instance.applyQuasarBalanceGap(
          accountNumber: va,
          quasarBalance: quasarBalance,
        );
      }
      return applied;
    } catch (e) {
      debugPrint('[PaymentCatchUp] VA transaction refresh failed: $e');
      return 0;
    }
  }

  double _nairaFromRow(Map map, Map metadata) {
    for (final raw in [
      metadata['amountNaira'],
      metadata['amount_naira'],
      metadata['amountRaw'],
      map['amount'],
    ]) {
      final n = raw is num ? raw.toDouble() : double.tryParse('$raw');
      if (n != null && n > 0) return (n * 100).round() / 100.0;
    }
    return 0;
  }
}
