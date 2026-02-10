import 'package:equatable/equatable.dart';
import '../../domain/entities/settings.dart';

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

class SettingsState extends Equatable {
  final AppSettings? settings;
  final bool isLoading;
  final bool isSaving;
  final bool isExporting;
  final bool isImporting;
  final bool isAuthorized; // For settings access
  final bool isDeviceAuthorized; // For lifetime activation
  final String? error;
  final String? successMessage;

  const SettingsState({
    this.settings,
    this.isLoading = false,
    this.isSaving = false,
    this.isExporting = false,
    this.isImporting = false,
    this.isAuthorized = false,
    this.isDeviceAuthorized = false,
    this.error,
    this.successMessage,
  });

  SettingsState copyWith({
    AppSettings? settings,
    bool? isLoading,
    bool? isSaving,
    bool? isExporting,
    bool? isImporting,
    bool? isAuthorized,
    bool? isDeviceAuthorized,
    String? error,
    String? successMessage,
  }) {
    return SettingsState(
      settings: settings ?? this.settings,
      isLoading: isLoading ?? this.isLoading,
      isSaving: isSaving ?? this.isSaving,
      isExporting: isExporting ?? this.isExporting,
      isImporting: isImporting ?? this.isImporting,
      isAuthorized: isAuthorized ?? this.isAuthorized,
      isDeviceAuthorized: isDeviceAuthorized ?? this.isDeviceAuthorized,
      error: error,
      successMessage: successMessage,
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
        error,
        successMessage
      ];
}
