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

  test('ID card, gate clock, and health tiles are on retail, order, and services', () {
    for (final mode in ['retail', 'order', 'pos', 'services', 'service']) {
      final ids = DashboardMenuCatalog.forMode(mode).map((o) => o.id).toList();
      expect(ids, contains('health_wellness'));
      expect(ids, contains('id_card_admin'));
      expect(ids, contains('gate_clock'));
    }
    final school = DashboardMenuCatalog.forMode('school').map((o) => o.id).toList();
    expect(school, contains('id_card_admin'));
    expect(school, contains('gate_clock'));
    expect(school, contains('health_wellness'));
  });
}
