import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/financial_transaction.dart';

enum FinanceEventType { 
  paymentSuccess, 
  paymentFailed,
  payoutSuccess,
  payoutFailed,
  walletUpdated 
}

class FinanceRealtimeEvent {
  final FinanceEventType type;
  final Map<String, dynamic> data;

  FinanceRealtimeEvent(this.type, this.data);
}

abstract class IFinanceRealtimeDataSource {
  Stream<FinanceRealtimeEvent> watchWalletEvents(String walletId);
  Stream<FinanceRealtimeEvent> watchGlobalEvents();
}

class FinanceRealtimeDataSourceImpl implements IFinanceRealtimeDataSource {
  final SupabaseClient supabase;

  FinanceRealtimeDataSourceImpl(this.supabase);

  @override
  Stream<FinanceRealtimeEvent> watchWalletEvents(String walletId) {
    final controller = StreamController<FinanceRealtimeEvent>();
    
    final channel = supabase.channel('wallet_changes:$walletId')
      .onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'financial_events',
        callback: (payload) {
          if (payload.newRecord['wallet_id'] == walletId) {
            final typeStr = payload.newRecord['type'] as String;
            FinanceEventType? type;
            
            if (typeStr == 'payment.success') type = FinanceEventType.paymentSuccess;
            else if (typeStr == 'payment.failed') type = FinanceEventType.paymentFailed;
            else if (typeStr == 'payout.success') type = FinanceEventType.payoutSuccess;
            else if (typeStr == 'payout.failed') type = FinanceEventType.payoutFailed;
            
            if (type != null) {
              controller.add(FinanceRealtimeEvent(type, payload.newRecord));
            }
          }
        },
      )
      .onPostgresChanges(
        event: PostgresChangeEvent.update,
        schema: 'public',
        table: 'wallets',
        callback: (payload) {
          if (payload.newRecord['id'] == walletId) {
            controller.add(FinanceRealtimeEvent(
              FinanceEventType.walletUpdated,
              payload.newRecord,
            ));
          }
        },
      );


    channel.subscribe();

    controller.onCancel = () {
      channel.unsubscribe();
      controller.close();
    };

    return controller.stream;
  }

  @override
  Stream<FinanceRealtimeEvent> watchGlobalEvents() {
    final controller = StreamController<FinanceRealtimeEvent>();
    
    final channel = supabase.channel('school_global_changes')
      .onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'financial_events',
        callback: (payload) {
          final typeStr = payload.newRecord['type'] as String;
          FinanceEventType? type;
          
          if (typeStr == 'payment.success') type = FinanceEventType.paymentSuccess;
          else if (typeStr == 'payment.failed') type = FinanceEventType.paymentFailed;
          else if (typeStr == 'payout.success') type = FinanceEventType.payoutSuccess;
          else if (typeStr == 'payout.failed') type = FinanceEventType.payoutFailed;
          
          if (type != null) {
            controller.add(FinanceRealtimeEvent(type, payload.newRecord));
          }
        },
      );

    channel.subscribe();

    controller.onCancel = () {
      channel.unsubscribe();
      controller.close();
    };

    return controller.stream;
  }
}

/// Used when Supabase was not initialized (offline / missing env in debug).
class NoOpFinanceRealtimeDataSource implements IFinanceRealtimeDataSource {
  const NoOpFinanceRealtimeDataSource();

  @override
  Stream<FinanceRealtimeEvent> watchWalletEvents(String walletId) =>
      const Stream.empty();

  @override
  Stream<FinanceRealtimeEvent> watchGlobalEvents() => const Stream.empty();
}

