// lib/features/admin/presentation/bloc/admin_bloc.dart
import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import '../../domain/repositories/admin_repository.dart';

// Events
abstract class AdminEvent {}
class EnterMasterMode extends AdminEvent {
  final String password;
  final String? otp;
  EnterMasterMode(this.password, this.otp);
}
class ExitMasterMode extends AdminEvent {}
class LoadApiKeys extends AdminEvent {}
class CreateApiKey extends AdminEvent {
  final String label;
  CreateApiKey(this.label);
}
class RevokeApiKey extends AdminEvent {
  final String id;
  RevokeApiKey(this.id);
}
class LoadAuditLogs extends AdminEvent {}

// State
class AdminState {
  final bool isMasterMode;
  final String? masterToken;
  final DateTime? masterExpiry;
  final List<Map<String, dynamic>> apiKeys;
  final List<Map<String, dynamic>> auditLogs;
  final bool isLoading;
  final String? error;

  AdminState({
    this.isMasterMode = false,
    this.masterToken,
    this.masterExpiry,
    this.apiKeys = const [],
    this.auditLogs = const [],
    this.isLoading = false,
    this.error,
  });

  AdminState copyWith({
    bool? isMasterMode,
    String? masterToken,
    DateTime? masterExpiry,
    List<Map<String, dynamic>>? apiKeys,
    List<Map<String, dynamic>>? auditLogs,
    bool? isLoading,
    String? error,
  }) {
    return AdminState(
      isMasterMode: isMasterMode ?? this.isMasterMode,
      masterToken: masterToken ?? this.masterToken,
      masterExpiry: masterExpiry ?? this.masterExpiry,
      apiKeys: apiKeys ?? this.apiKeys,
      auditLogs: auditLogs ?? this.auditLogs,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class AdminBloc extends Bloc<AdminEvent, AdminState> {
  final IAdminRepository repository;
  Timer? _masterTimer;

  AdminBloc({required this.repository}) : super(AdminState()) {
    on<EnterMasterMode>(_onEnterMasterMode);
    on<ExitMasterMode>(_onExitMasterMode);
    on<LoadApiKeys>(_onLoadApiKeys);
    on<CreateApiKey>(_onCreateApiKey);
    on<RevokeApiKey>(_onRevokeApiKey);
    on<LoadAuditLogs>(_onLoadAuditLogs);
  }

  Future<void> _onEnterMasterMode(EnterMasterMode event, Emitter<AdminState> emit) async {
    emit(state.copyWith(isLoading: true, error: null));
    try {
      final token = await repository.enterMasterMode(event.password, event.otp);
      final expiry = DateTime.now().add(const Duration(minutes: 15));
      
      _startMasterTimer(emit);
      
      emit(state.copyWith(
        isMasterMode: true,
        masterToken: token,
        masterExpiry: expiry,
        isLoading: false
      ));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  void _onExitMasterMode(ExitMasterMode event, Emitter<AdminState> emit) {
    _masterTimer?.cancel();
    emit(state.copyWith(isMasterMode: false, masterToken: null, masterExpiry: null));
  }

  void _startMasterTimer(Emitter<AdminState> emit) {
    _masterTimer?.cancel();
    _masterTimer = Timer(const Duration(minutes: 15), () {
      add(ExitMasterMode());
    });
  }

  Future<void> _onLoadApiKeys(LoadApiKeys event, Emitter<AdminState> emit) async {
    emit(state.copyWith(isLoading: true));
    try {
      final keys = await repository.getApiKeys();
      emit(state.copyWith(apiKeys: keys, isLoading: false));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  Future<void> _onCreateApiKey(CreateApiKey event, Emitter<AdminState> emit) async {
    try {
      await repository.createApiKey(event.label);
      add(LoadApiKeys());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onRevokeApiKey(RevokeApiKey event, Emitter<AdminState> emit) async {
    try {
      await repository.revokeApiKey(event.id);
      add(LoadApiKeys());
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> _onLoadAuditLogs(LoadAuditLogs event, Emitter<AdminState> emit) async {
    emit(state.copyWith(isLoading: true));
    try {
      final logs = await repository.getAuditLogs();
      emit(state.copyWith(auditLogs: logs, isLoading: false));
    } catch (e) {
      emit(state.copyWith(isLoading: false, error: e.toString()));
    }
  }

  @override
  Future<void> close() {
    _masterTimer?.cancel();
    return super.close();
  }
}
