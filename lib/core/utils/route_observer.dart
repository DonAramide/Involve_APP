import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_state.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';

class AppRouteObserver extends NavigatorObserver {
  final BuildContext context;

  AppRouteObserver(this.context);

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    super.didPush(route, previousRoute);
    _saveRoute(route);
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    super.didReplace(newRoute: newRoute, oldRoute: oldRoute);
    if (newRoute != null) {
      _saveRoute(newRoute);
    }
  }

  void _saveRoute(Route<dynamic> route) {
    if (route.settings.name != null) {
      final settingsBloc = context.read<SettingsBloc>();
      final currentSettings = settingsBloc.state.settings;
      if (currentSettings != null && currentSettings.restoreLastState) {
        settingsBloc.add(UpdateAppSettings(currentSettings.copyWith(
          lastRoute: route.settings.name,
        )));
      }
    }
  }
}
