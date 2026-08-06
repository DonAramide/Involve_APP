import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../../core/services/service_locator.dart';
import '../../../../core/services/payment_alert_sound.dart';
import '../../../dashboard/presentation/widgets/notification_bell.dart';
import '../../domain/repositories/finance_repository_new.dart';
import '../../data/datasources/finance_realtime_data_source.dart';
import 'package:involve_app/features/services/domain/services/customer_wallet_credit_service.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';

class GlobalPaymentNotificationListener extends StatefulWidget {
  final Widget child;
  final GlobalKey<NavigatorState> navigatorKey;
  final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey;

  const GlobalPaymentNotificationListener({
    Key? key, 
    required this.child, 
    required this.navigatorKey,
    required this.scaffoldMessengerKey,
  }) : super(key: key);

  @override
  State<GlobalPaymentNotificationListener> createState() => _GlobalPaymentNotificationListenerState();
}

class _GlobalPaymentNotificationListenerState extends State<GlobalPaymentNotificationListener> {
  StreamSubscription? _subscription;

  @override
  void initState() {
    super.initState();
    _initListener();
  }

  void _initListener() {
    // Socket.io payment banners are handled globally in SocketService.
    // This listener covers Supabase Realtime inserts into financial_events.
    final repo = sl<FinanceRepository>();
    _subscription = repo.watchGlobalEvents().listen((event) async {
      if (event.type == FinanceEventType.paymentSuccess) {
        final eventTenant = event.data['tenant_id']?.toString() ??
            event.data['tenantId']?.toString();
        try {
          final myTenant = await SecurityService().getTenantId();
          if (eventTenant != null &&
              eventTenant.isNotEmpty &&
              myTenant != null &&
              myTenant.isNotEmpty &&
              eventTenant != myTenant) {
            debugPrint(
              '[GlobalPaymentNotification] Ignoring other-tenant event $eventTenant',
            );
            return;
          }
        } catch (_) {}

        final amount = event.data['amount'] ?? 0;
        final metadataRaw = event.data['metadata'] ?? {};
        Map metadata = {};
        if (metadataRaw is Map) {
          metadata = metadataRaw;
        } else if (metadataRaw is String && metadataRaw.isNotEmpty) {
          try {
            final decoded = jsonDecode(metadataRaw);
            if (decoded is Map) metadata = Map<String, dynamic>.from(decoded);
          } catch (_) {}
        }
        final studentName =
            (metadata['studentName'] ?? metadata['senderName'] ?? 'a student').toString();
        final reference = event.data['reference'] ?? '';

        if (mounted) {
          _showNotification(amount, studentName, reference);
          unawaited(CustomerWalletCreditService.instance.applyPaymentSuccess({
            'amount': amount,
            'reference': reference,
            'metadata': metadata,
            ...event.data,
          }));
        }
      }
    }, onError: (e) {
      debugPrint('[GlobalPaymentNotification] Realtime error: $e');
    });
  }

  void _showNotification(dynamic amount, String studentName, String reference) {
    final message = '₦$amount received from $studentName!';
    unawaited(PaymentAlertSound.play());
    unawaited(NotificationInbox.add(
      message: message,
      type: 'payment',
      extra: {'reference': reference},
    ));
    widget.scaffoldMessengerKey.currentState?.showSnackBar(
      SnackBar(
        content: Text('₦$amount received from $studentName!'),
        action: SnackBarAction(
          label: 'View',
          textColor: Colors.yellow,
          onPressed: () {
            widget.navigatorKey.currentState?.pushNamed('/school_finance');
          },
        ),
        duration: const Duration(seconds: 10),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return widget.child;
  }
}
