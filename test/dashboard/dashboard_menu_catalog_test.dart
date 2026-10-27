import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/features/dashboard/domain/dashboard_menu_catalog.dart';

void main() {
  test('linked-device defaults hide every icon except Admin Hub', () {
    final hidden = DashboardMenuCatalog.hideableIds();
    expect(hidden, isNotEmpty);
    expect(hidden, isNot(contains(DashboardMenuCatalog.adminHubId)));
    expect(
      DashboardMenuCatalog.isVisibleOnDashboard(
        DashboardMenuCatalog.adminHubId,
        hidden,
      ),
      isTrue,
    );
    expect(
      DashboardMenuCatalog.isVisibleOnDashboard('parents', hidden),
      isFalse,
    );
  });
}
