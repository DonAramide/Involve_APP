// lib/core/services/service_locator.dart

import 'package:get_it/get_it.dart';
import '../../../features/school_finance/domain/repositories/finance_repository_new.dart';
import '../../../features/school_finance/domain/repositories/notification_repository.dart';

final sl = GetIt.instance;

Future<void> setupServiceLocator() async {
  // Repositories are typically registered here during AppDependencies initialization
  // but we can provide helper methods or direct access to GetIt.
}
