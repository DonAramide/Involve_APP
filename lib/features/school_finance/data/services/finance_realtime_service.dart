// lib/features/school_finance/data/services/finance_realtime_service.dart

import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../presentation/bloc/finance_new_bloc.dart';
import '../../presentation/bloc/finance_new_event.dart';

/// Service responsible for orchestrating connectivity between Supabase Realtime
/// and the FinanceBloc. Ensures data integrity by triggering re-fetches
/// whenever server-side state changes.
class FinanceRealtimeService {
  final SupabaseClient _supabase;
  final FinanceBloc _bloc;
  
  RealtimeChannel? _channel;
  final Set<String> _processedEvents = {}; // Basic deduplication if needed
  
  FinanceRealtimeService({
    required SupabaseClient supabase,
    required FinanceBloc bloc,
  }) : _supabase = supabase,
       _bloc = bloc;

  /// Initializes the real-time subscription for a specific wallet or context.
  void init(String walletId) {
    _cleanup(); // Ensure no dangling subscriptions

    _channel = _supabase.channel('finance_realtime:$walletId')
      // 1. Listen for successful payments (inserts into ledgers)
      .onPostgresChanges(
        event: PostgresChangeEvent.insert,
        schema: 'public',
        table: 'ledgers',
        filter: PostgresChangeFilter(
          type: PostgresChangeFilterType.eq,
          column: 'wallet_id',
          value: walletId,
        ),
        callback: (payload) {
          final String txnId = payload.newRecord['id'] ?? '';
          if (_isDuplicate(txnId)) return;

          // Dispatch event to BLoC to re-fetch truth from API
          _bloc.add(OnPaymentReceived(walletId));
        },
      )
      // 2. Listen for balance updates (updates to wallets)
      .onPostgresChanges(
        event: PostgresChangeEvent.update,
        schema: 'public',
        table: 'wallets',
        filter: PostgresChangeFilter(
          type: PostgresChangeFilterType.eq,
          column: 'id',
          value: walletId,
        ),
        callback: (payload) {
          _bloc.add(OnWalletUpdated(walletId));
        },
      );

    _channel?.subscribe();
  }

  /// Deduplication logic to prevent multi-firing for the same transaction
  bool _isDuplicate(String id) {
    if (id.isEmpty) return false;
    if (_processedEvents.contains(id)) return true;
    
    _processedEvents.add(id);
    // Keep set size manageable
    if (_processedEvents.length > 100) _processedEvents.remove(_processedEvents.first);
    
    return false;
  }

  /// Standard disposal method to prevent memory leaks and dangling sockets.
  void dispose() {
    _cleanup();
  }

  void _cleanup() {
    _channel?.unsubscribe();
    _channel = null;
    _processedEvents.clear();
  }
}
