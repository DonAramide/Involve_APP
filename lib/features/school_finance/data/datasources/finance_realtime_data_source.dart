import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../domain/entities/financial_transaction.dart';

enum FinanceEventType { paymentSuccess, walletUpdated }

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
        table: 'ledgers',
        // Filter out in Dart if type system is strict on this version
        callback: (payload) {
          if (payload.newRecord['wallet_id'] == walletId) {
            controller.add(FinanceRealtimeEvent(
              FinanceEventType.paymentSuccess,
              payload.newRecord,
            ));
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
    
    // Listen to all ledger changes for this school
    // Note: In a real production setup, we'd add 'school_id=eq.$id' filter.
    // For now we subscribe to general ledger inserts.
    final channel = supabase.channel('school_global_changes')
      .onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'ledgers',
        callback: (payload) {
          controller.add(FinanceRealtimeEvent(
            FinanceEventType.paymentSuccess,
            payload.newRecord,
          ));
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

