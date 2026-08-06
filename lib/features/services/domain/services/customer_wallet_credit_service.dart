import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:involve_app/features/services/domain/entities/service_customer.dart';
import 'package:involve_app/features/services/domain/repositories/services_repository.dart';

/// Applies VA deposit socket events to local customer wallets and fund ledger.
class CustomerWalletCreditService {
  CustomerWalletCreditService._();
  static final CustomerWalletCreditService instance =
      CustomerWalletCreditService._();

  static const String prefsKey = 'customer_fund_ledger';
  static const int maxItems = 500;

  IServicesRepository? _repository;
  final StreamController<ServiceCustomer> _credits =
      StreamController<ServiceCustomer>.broadcast();

  Stream<ServiceCustomer> get onWalletCredited => _credits.stream;

  void bind(IServicesRepository repository) {
    _repository = repository;
  }

  Future<List<Map<String, dynamic>>> loadLedger() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getString(prefsKey) ?? '[]';
    try {
      final list = jsonDecode(raw) as List<dynamic>;
      return list
          .whereType<Map>()
          .map((e) => Map<String, dynamic>.from(e))
          .toList();
    } catch (_) {
      return [];
    }
  }

  Future<void> _saveLedger(List<Map<String, dynamic>> items) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(
      prefsKey,
      jsonEncode(items.take(maxItems).toList()),
    );
  }

  Future<List<Map<String, dynamic>>> fundsForCustomer(String customerId) async {
    final all = await loadLedger();
    return all
        .where((e) => e['customerId']?.toString() == customerId)
        .toList();
  }

  /// Handle payment.success payload from Socket.IO / realtime.
  Future<ServiceCustomer?> applyPaymentSuccess(dynamic data) async {
    final repo = _repository;
    if (repo == null) {
      debugPrint('[CustomerWalletCredit] Repository not bound yet');
      return null;
    }

    try {
      final map = data is Map
          ? Map<String, dynamic>.from(data as Map)
          : <String, dynamic>{};
      final amountRaw = map['amount'];
      final amount = amountRaw is num
          ? amountRaw.toDouble()
          : double.tryParse('$amountRaw') ?? 0;
      if (amount <= 0) return null;

      final reference = (map['reference'] ?? '').toString().trim();
      if (reference.isEmpty) return null;

      Map<String, dynamic> metadata = {};
      final metadataRaw = map['metadata'];
      if (metadataRaw is Map) {
        metadata = Map<String, dynamic>.from(metadataRaw);
      } else if (metadataRaw is String && metadataRaw.isNotEmpty) {
        try {
          final decoded = jsonDecode(metadataRaw);
          if (decoded is Map) metadata = Map<String, dynamic>.from(decoded);
        } catch (_) {}
      }

      final customerId = (map['customerId'] ??
              metadata['customerId'] ??
              metadata['customer_id'])
          ?.toString();
      final va = (metadata['virtualAccountNumber'] ??
              metadata['accountNumber'] ??
              metadata['virtual_account_number'] ??
              map['virtualAccountNumber'] ??
              map['accountNumber'])
          ?.toString()
          .trim();
      final senderName = (metadata['senderName'] ??
              metadata['studentName'] ??
              'Unknown Sender')
          .toString();
      final senderBank =
          (metadata['senderBank'] ?? metadata['bankName'] ?? '').toString();

      final updated = await repo.creditCustomerWalletFromDeposit(
        amount: amount,
        reference: reference,
        customerId: customerId,
        virtualAccountNumber: va,
        senderName: senderName,
        senderBank: senderBank,
      );

      if (updated != null) {
        _credits.add(updated);
        debugPrint(
          '[CustomerWalletCredit] Credited ${updated.name} ₦$amount '
          '(ref=$reference, balance=${updated.balance})',
        );
      }
      return updated;
    } catch (e, st) {
      debugPrint('[CustomerWalletCredit] apply failed: $e\n$st');
      return null;
    }
  }
}
