import 'package:equatable/equatable.dart';
import '../../domain/entities/settings.dart';
import '../../domain/entities/user_plan.dart';

abstract class SettingsEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class LoadSettings extends SettingsEvent {}

class UpdateAppSettings extends SettingsEvent {
  final AppSettings settings;
  UpdateAppSettings(this.settings);
  @override
  List<Object?> get props => [settings];
}

class VerifySystemPassword extends SettingsEvent {
  final String password;
  VerifySystemPassword(this.password);
  @override
  List<Object?> get props => [password];
}

class SetSystemPassword extends SettingsEvent {
  final String newPassword;
  SetSystemPassword(this.newPassword);
  @override
  List<Object?> get props => [newPassword];
}

class CheckSuperAdminPassword extends SettingsEvent {
  final String password;
  CheckSuperAdminPassword(this.password);
  @override
  List<Object?> get props => [password];
}

class CheckDeviceAuthorization extends SettingsEvent {}

class CreateBackup extends SettingsEvent {}

class RestoreFromPath extends SettingsEvent {
  final String path;
  RestoreFromPath(this.path);
  @override
  List<Object?> get props => [path];
}

class RecordFailedAttempt extends SettingsEvent {}

class UnlockSystem extends SettingsEvent {
  final String unlockCode;
  UnlockSystem(this.unlockCode);
  @override
  List<Object?> get props => [unlockCode];
}

class ResetFailedAttempts extends SettingsEvent {}

class VerifySuperAdminPassword extends SettingsEvent {
  final String password;
  VerifySuperAdminPassword(this.password);
  @override
  List<Object?> get props => [password];
}

class SetSuperAdminPassword extends SettingsEvent {
  final String password;
  SetSuperAdminPassword(this.password);
  @override
  List<Object?> get props => [password];
}

class ResetSuperAdminAuth extends SettingsEvent {}

class ResetSystemAuth extends SettingsEvent {}

class LoadBusinessLock extends SettingsEvent {}

class LockBusinessName extends SettingsEvent {}

class UpgradeProPlan extends SettingsEvent {
  final int durationDays;
  UpgradeProPlan({this.durationDays = 30});
  @override
  List<Object?> get props => [durationDays];
}

class SettingsState extends Equatable {
  final AppSettings? settings;
  final bool isLoading;
  final bool isSaving;
  final bool isExporting;
  final bool isImporting;
  final bool isAuthorized; // For settings access
  final bool isDeviceAuthorized; // For lifetime activation
  final bool isSuperAdminAuthorized;
  final bool isBusinessLocked;
  final String? error;
  final String? successMessage;
  final String? backupPath;
  final UserPlan? userPlan;

  const SettingsState({
    this.settings,
    this.isLoading = false,
    this.isSaving = false,
    this.isExporting = false,
    this.isImporting = false,
    this.isAuthorized = false,
    this.isDeviceAuthorized = false,
    this.isSuperAdminAuthorized = false,
    this.isBusinessLocked = false,
    this.error,
    this.successMessage,
    this.backupPath,
    this.userPlan,
  });

  SettingsState copyWith({
    AppSettings? settings,
    bool? isLoading,
    bool? isSaving,
    bool? isExporting,
    bool? isImporting,
    bool? isAuthorized,
    bool? isDeviceAuthorized,
    bool? isSuperAdminAuthorized,
    bool? isBusinessLocked,
    String? error,
    String? successMessage,
    String? backupPath,
    UserPlan? userPlan,
  }) {
    return SettingsState(
      settings: settings ?? this.settings,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      isExporting: isExporting ?? this.isExporting,
      isImporting: isImporting ?? this.isImporting,
      isAuthorized: isAuthorized ?? this.isAuthorized,
      isDeviceAuthorized: isDeviceAuthorized ?? this.isDeviceAuthorized,
      isSuperAdminAuthorized: isSuperAdminAuthorized ?? this.isSuperAdminAuthorized,
      isBusinessLocked: isBusinessLocked ?? this.isBusinessLocked,
      error: error,
      successMessage: successMessage,
      backupPath: backupPath ?? this.backupPath,
      userPlan: userPlan ?? this.userPlan,
    );
  }

  @override
  List<Object?> get props => [
        settings,
        isLoading,
        isSaving,
        isExporting,
        isImporting,
        isAuthorized,
        isDeviceAuthorized,
        isSuperAdminAuthorized,
        isBusinessLocked,
        error,
        successMessage,
        backupPath,
        userPlan,
      ];
}
