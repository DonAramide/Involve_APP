import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:get_it/get_it.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/core/services/payment_alert_sound.dart';
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
  Future<int> runCatchUp({bool showBanner = true}) async {
    if (_running) return 0;
    // Debounce: skip if we just ran within 8 seconds (connect storms).
    if (_lastRunAt != null &&
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
      final since = await getLastSeen();
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

        final amount = map['amount'] is num
            ? (map['amount'] as num).toDouble()
            : double.tryParse('${map['amount']}') ?? 0;
        final reference = '${map['reference'] ?? ''}'.trim();
        if (amount <= 0 || reference.isEmpty) continue;

        // Already processed while online or on a prior catch-up.
        if (await CustomerWalletCreditService.instance
            .hasProcessedReference(reference)) {
          continue;
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

        final sender = (metadata['senderName'] ??
                metadata['studentName'] ??
                'a payer')
            .toString();
        final formatted = amount == amount.roundToDouble()
            ? amount.toStringAsFixed(0)
            : amount.toStringAsFixed(2);
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
          final formatted = totalAmount == totalAmount.roundToDouble()
              ? totalAmount.toStringAsFixed(0)
              : totalAmount.toStringAsFixed(2);
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
}
