import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:flutter/foundation.dart';
import 'settings_state.dart';
import '../../domain/repositories/settings_repository.dart';
import '../../domain/services/security_service.dart';
import '../../../../core/services/backup_service.dart';
import '../../../../core/license/storage_service.dart';

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
    on<RecordFailedAttempt>(_onRecordFailedAttempt);
    on<UnlockSystem>(_onUnlockSystem);
    on<ResetFailedAttempts>(_onResetFailedAttempts);
    on<VerifySuperAdminPassword>(_onVerifySuperAdminPassword);
    on<SetSuperAdminPassword>(_onSetSuperAdminPassword);
    on<LoadBusinessLock>(_onLoadBusinessLock);
    on<LockBusinessName>(_onLockBusinessName);
    on<ResetSuperAdminAuth>((event, emit) => emit(state.copyWith(isSuperAdminAuthorized: false)));
    on<ResetSystemAuth>((event, emit) {
      debugPrint('SettingsBloc: Resetting system auth');
      emit(state.copyWith(isAuthorized: false, error: null));
    });
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
    debugPrint('SettingsBloc: LoadSettings called');
    add(CheckDeviceAuthorization()); // Check auth on load
    add(LoadBusinessLock());
    emit(state.copyWith(isLoading: true));
    try {
      final settings = await repository.getSettings();
      debugPrint('SettingsBloc: Settings loaded: ${settings?.organizationName}');
      emit(state.copyWith(settings: settings, isLoading: false));
    } catch (e) {
      debugPrint('SettingsBloc: Error loading settings: $e');
      emit(state.copyWith(error: e.toString(), isLoading: false));
    }
  }

  Future<void> _onUpdateSettings(UpdateAppSettings event, Emitter<SettingsState> emit) async {
    debugPrint('SettingsBloc: UpdateSettings called');
    
    // Check if business name is being changed and if it is locked
    if (state.isBusinessLocked && state.settings?.organizationName != event.settings.organizationName) {
      emit(state.copyWith(error: 'Business name is permanently locked.'));
      return;
    }

    emit(state.copyWith(isSaving: true, successMessage: null, error: null));
    try {
      final oldName = state.settings?.organizationName;
      await repository.updateSettings(event.settings);
      
      // If business name changed and it wasn't locked before, lock it now
      if (!state.isBusinessLocked && oldName != event.settings.organizationName) {
        add(LockBusinessName());
      }

      emit(state.copyWith(
        settings: event.settings, 
        isSaving: false,
        successMessage: 'Settings updated successfully',
        error: null,
      ));
    } catch (e) {
      emit(state.copyWith(error: e.toString(), isSaving: false));
    }
  }

  Future<void> _onLoadBusinessLock(LoadBusinessLock event, Emitter<SettingsState> emit) async {
    final isLocked = await StorageService.isBusinessNameLocked();
    emit(state.copyWith(isBusinessLocked: isLocked));
  }

  Future<void> _onLockBusinessName(LockBusinessName event, Emitter<SettingsState> emit) async {
    await StorageService.setBusinessNameLocked(true);
    emit(state.copyWith(isBusinessLocked: true));
  }

  Future<void> _onVerifyPassword(VerifySystemPassword event, Emitter<SettingsState> emit) async {
    debugPrint('SettingsBloc: VerifySystemPassword called with input: ${event.password}');
    final currentSettings = state.settings;
    if (currentSettings == null) {
      debugPrint('SettingsBloc: ERROR - Settings are NULL');
      return;
    }

    // Check if system is locked
    if (currentSettings.isLocked) {
      debugPrint('SettingsBloc: System is LOCKED');
      emit(state.copyWith(error: 'System is locked. Use unlock code.', isAuthorized: false));
      return;
    }

    final success = await securityService.verifyPassword(event.password);
    debugPrint('SettingsBloc: Password verification success: $success');
    if (success) {
      // Reset failed attempts on successful login directly here to be atomic
      if (currentSettings.failedAttempts > 0) {
        final resetSettings = currentSettings.copyWith(failedAttempts: 0);
        await repository.updateSettings(resetSettings);
        emit(state.copyWith(
          isAuthorized: true, 
          settings: resetSettings,
          error: null,
        ));
      } else {
        emit(state.copyWith(isAuthorized: true, error: null));
      }
      debugPrint('SettingsBloc: Emitted isAuthorized: true');
    } else {
      // Record failed attempt
      add(RecordFailedAttempt());
      emit(state.copyWith(error: 'Invalid Password', isAuthorized: false));
    }
  }

  Future<void> _onSetPassword(SetSystemPassword event, Emitter<SettingsState> emit) async {
    final success = await securityService.setPassword(event.newPassword);
    if (!success) {
      emit(state.copyWith(error: 'Failed to set password'));
    }
  }

  Future<void> _onRecordFailedAttempt(RecordFailedAttempt event, Emitter<SettingsState> emit) async {
    final currentSettings = state.settings;
    if (currentSettings == null) return;

    final newAttempts = currentSettings.failedAttempts + 1;
    
    if (newAttempts >= 6) {
      // Lock the system
      final lockedSettings = currentSettings.copyWith(
        failedAttempts: newAttempts,
        isLocked: true,
        lockedAt: DateTime.now(),
      );
      await repository.updateSettings(lockedSettings);
      emit(state.copyWith(
        settings: lockedSettings,
        error: 'System locked! Too many failed attempts. Use unlock code.',
      ));
    } else {
      // Just increment failed attempts
      final updatedSettings = currentSettings.copyWith(failedAttempts: newAttempts);
      await repository.updateSettings(updatedSettings);
      emit(state.copyWith(
        settings: updatedSettings,
        error: 'Invalid password. ${6 - newAttempts} attempts remaining.',
      ));
    }
  }

  Future<void> _onUnlockSystem(UnlockSystem event, Emitter<SettingsState> emit) async {
    final currentSettings = state.settings;
    if (currentSettings == null) return;

    // Get admin password from secure storage
    final adminPassword = await securityService.getStoredPassword();
    if (adminPassword == null) {
      emit(state.copyWith(error: 'Admin password not set'));
      return;
    }

    // Validate unlock code
    if (_validateUnlockCode(event.unlockCode, adminPassword)) {
      // Unlock system and reset failed attempts
      final unlockedSettings = currentSettings.copyWith(
        failedAttempts: 0,
        isLocked: false,
        lockedAt: null,
      );
      await repository.updateSettings(unlockedSettings);
      emit(state.copyWith(
        settings: unlockedSettings,
        isAuthorized: true,
        error: null,
        successMessage: 'System unlocked successfully!',
      ));
    } else {
      emit(state.copyWith(error: 'Invalid unlock code'));
    }
  }

  Future<void> _onResetFailedAttempts(ResetFailedAttempts event, Emitter<SettingsState> emit) async {
    final currentSettings = state.settings;
    if (currentSettings == null) return;

    final resetSettings = currentSettings.copyWith(failedAttempts: 0);
    await repository.updateSettings(resetSettings);
    emit(state.copyWith(settings: resetSettings));
  }

  bool _validateUnlockCode(String unlockCode, String adminPassword) {
    final parts = unlockCode.split('/');
    if (parts.length != 3) {
      debugPrint('❌ Unlock code format invalid. Expected 3 parts, got ${parts.length}');
      return false;
    }
    
    final dateStr = parts[0]; // YYYYMMDD
    final timeStr = parts[1]; // HHmm
    final password = parts[2];
    
    debugPrint('🔓 Validating unlock code:');
    debugPrint('  Date: $dateStr');
    debugPrint('  Time: $timeStr');
    debugPrint('  Password: ${password.replaceAll(RegExp(r'.'), '*')}');
    
    // Validate password
    if (password != adminPassword) {
      debugPrint('❌ Password mismatch');
      debugPrint('   Input (from code): $password');
      debugPrint('   Expected (system admin password): $adminPassword');
      return false;
    }
    debugPrint('✅ Password correct');
    
    // Validate date (current date)
    final now = DateTime.now();
    final expectedDate = '${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}';
    if (dateStr != expectedDate) {
      debugPrint('❌ Date mismatch. Expected: $expectedDate, Got: $dateStr');
      return false;
    }
    debugPrint('✅ Date correct');
    
    // Validate time (current hour and minute with ±1 minute tolerance)
    final currentMinute = now.hour * 60 + now.minute;
    final inputHour = int.tryParse(timeStr.substring(0, 2)) ?? -1;
    final inputMinute = int.tryParse(timeStr.substring(2, 4)) ?? -1;
    final inputTotalMinutes = inputHour * 60 + inputMinute;
    
    final timeDifference = (currentMinute - inputTotalMinutes).abs();
    
    debugPrint('  Current time: ${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}');
    debugPrint('  Input time: ${inputHour.toString().padLeft(2, '0')}:${inputMinute.toString().padLeft(2, '0')}');
    debugPrint('  Time difference: $timeDifference minutes');
    
    if (timeDifference > 1) {
      debugPrint('❌ Time difference too large (>1 minute)');
      return false;
    }
    
    debugPrint('✅ Time within tolerance');
    debugPrint('🎉 Unlock code validated successfully!');
    return true;
  }

  Future<void> _onVerifySuperAdminPassword(VerifySuperAdminPassword event, Emitter<SettingsState> emit) async {
    final isValid = await securityService.verifySuperAdminPassword(event.password);
    
    if (isValid) {
      emit(state.copyWith(
        isSuperAdminAuthorized: true,
        error: null,
        successMessage: 'Super admin access granted',
      ));
    } else {
      // DEBUG: Log correct password on failure
      final correctPassword = await securityService.getSuperAdminPassword();
      debugPrint('❌ Super Admin verification failed.');
      debugPrint('   Input: ${event.password}');
      debugPrint('   Correct: ${correctPassword ?? "Not Set (Any input accepts)"}');

      emit(state.copyWith(
        isSuperAdminAuthorized: false,
        error: 'Invalid super admin password',
      ));
    }
  }

  Future<void> _onSetSuperAdminPassword(SetSuperAdminPassword event, Emitter<SettingsState> emit) async {
    final success = await securityService.setSuperAdminPassword(event.password);
    
    if (success) {
      emit(state.copyWith(
        successMessage: 'Super admin password set successfully',
        error: null,
      ));
    } else {
      emit(state.copyWith(
        error: 'Failed to set super admin password',
      ));
    }
  }
}
