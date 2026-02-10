import 'package:flutter_bloc/flutter_bloc.dart';
import 'settings_state.dart';
import '../../domain/repositories/settings_repository.dart';
import '../../domain/services/security_service.dart';
import '../../../../core/services/backup_service.dart';

class SettingsBloc extends Bloc<SettingsEvent, SettingsState> {
  final SettingsRepository repository;
  final SecurityService securityService;
  final BackupService backupService;

  SettingsBloc({
    required this.repository,
    required this.securityService,
    required this.backupService,
  }) : super(const SettingsState()) {
    on<LoadSettings>(_onLoadSettings);
    on<UpdateAppSettings>(_onUpdateSettings);
    on<VerifySystemPassword>(_onVerifyPassword);
    on<SetSystemPassword>(_onSetPassword);
    on<CheckSuperAdminPassword>(_onCheckSuperAdmin);
    on<CheckDeviceAuthorization>(_onCheckDeviceAuth);
    on<CreateBackup>(_onBackup);
    on<RestoreFromPath>(_onRestore);
  }

  Future<void> _onBackup(CreateBackup event, Emitter<SettingsState> emit) async {
    emit(state.copyWith(isExporting: true, error: null, successMessage: null));
    final file = await backupService.createBackup();
    if (file != null) {
      emit(state.copyWith(isExporting: false, successMessage: 'Backup successful: ${file.path}'));
    } else {
      emit(state.copyWith(isExporting: false, error: 'Backup failed'));
    }
  }

  Future<void> _onRestore(RestoreFromPath event, Emitter<SettingsState> emit) async {
    emit(state.copyWith(isImporting: true, error: null, successMessage: null));
    final success = await backupService.restoreBackup(event.path);
    if (success) {
      emit(state.copyWith(isImporting: false, successMessage: 'Restore successful. Please restart the app.'));
      add(LoadSettings());
    } else {
      emit(state.copyWith(isImporting: false, error: 'Restore failed'));
    }
  }

  Future<void> _onCheckDeviceAuth(CheckDeviceAuthorization event, Emitter<SettingsState> emit) async {
    final isDeviceAuthorized = await securityService.isDeviceAuthorized();
    emit(state.copyWith(isDeviceAuthorized: isDeviceAuthorized));
  }

  Future<void> _onCheckSuperAdmin(CheckSuperAdminPassword event, Emitter<SettingsState> emit) async {
    final success = await securityService.verifySuperAdmin(event.password);
    if (success) {
      emit(state.copyWith(isDeviceAuthorized: true, error: null));
    } else {
      emit(state.copyWith(error: 'Invalid Super Admin Password'));
    }
  }

  Future<void> _onLoadSettings(LoadSettings event, Emitter<SettingsState> emit) async {
    add(CheckDeviceAuthorization()); // Check auth on load
    emit(state.copyWith(isLoading: true));
    try {
      final settings = await repository.getSettings();
      emit(state.copyWith(settings: settings, isLoading: false));
    } catch (e) {
      emit(state.copyWith(error: e.toString(), isLoading: false));
    }
  }

  Future<void> _onUpdateSettings(UpdateAppSettings event, Emitter<SettingsState> emit) async {
    emit(state.copyWith(isSaving: true));
    try {
      await repository.updateSettings(event.settings);
      emit(state.copyWith(settings: event.settings, isSaving: false));
    } catch (e) {
      emit(state.copyWith(error: e.toString(), isSaving: false));
    }
  }

  Future<void> _onVerifyPassword(VerifySystemPassword event, Emitter<SettingsState> emit) async {
    final success = await securityService.verifyPassword(event.password);
    if (success) {
      emit(state.copyWith(isAuthorized: true, error: null));
    } else {
      emit(state.copyWith(error: 'Invalid Password', isAuthorized: false));
    }
  }

  Future<void> _onSetPassword(SetSystemPassword event, Emitter<SettingsState> emit) async {
    final success = await securityService.setPassword(event.newPassword);
    if (!success) {
      emit(state.copyWith(error: 'Failed to set password'));
    }
  }
}
