import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/features/settings/presentation/widgets/admin_transfer_auth_dialog.dart';

void main() {
  test('http logs do not keep the authenticator code', () {
    expect(redactAuthCode('{otp: 123456}'), isNot(contains('123456')));
    expect(redactAuthCode('{"otp":"654321"}'), isNot(contains('654321')));
  });

  testWidgets('authorize payment dialog shows details and a masked code entry', (tester) async {
    tester.view.physicalSize = const Size(800, 1280);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(MaterialApp(
      home: Builder(
        builder: (context) => TextButton(
          onPressed: () => requireAdminCompanyTransferAuth(
            context,
            amount: '₦50.00',
            beneficiary: 'North School',
            reference: 'INV-2026-000123',
          ),
          child: const Text('open'),
        ),
      ),
    ));

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    expect(find.text('Authorize Payment'), findsWidgets);
    expect(find.text('Additional verification is required to complete this payment.'), findsOneWidget);
    expect(find.text('₦50.00'), findsOneWidget);
    expect(find.text('North School'), findsOneWidget);
    expect(find.text('INV-2026-000123'), findsOneWidget);
    expect(find.text('Use the current code from the authenticator app.'), findsOneWidget);
    expect(find.text('Never share your authentication code with anyone.'), findsOneWidget);
    expect(find.text('Admin authorisation'), findsNothing);

    FilledButton authorize() => tester.widget<FilledButton>(
          find.widgetWithText(FilledButton, 'Authorize Payment'),
        );

    expect(authorize().onPressed, isNull);

    await tester.enterText(find.byType(TextField), '12ab34');
    await tester.pump();
    expect(authorize().onPressed, isNull);
    expect(find.text('1'), findsNothing);
    expect(find.text('2'), findsNothing);

    await tester.enterText(find.byType(TextField), '654321');
    await tester.pump();
    expect(authorize().onPressed, isNotNull);
    expect(find.byWidgetPredicate((widget) => widget is Text && widget.data == '654321'), findsNothing);
    expect(find.byWidgetPredicate((widget) => widget is Text && widget.data == '6'), findsNothing);

    await tester.scrollUntilVisible(
      find.text('Cancel'),
      100,
      scrollable: find.byType(Scrollable).last,
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Cancel'));
    await tester.pumpAndSettle();
    expect(find.text('PAYMENT DETAILS'), findsNothing);
  });

  testWidgets('dialog stays usable on a small POS screen', (tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(MaterialApp(
      home: Builder(
        builder: (context) => TextButton(
          onPressed: () => requireAdminCompanyTransferAuth(
            context,
            amount: '₦1.15',
            reference: 'INV-1',
          ),
          child: const Text('open'),
        ),
      ),
    ));

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();

    expect(find.text('Authorize Payment'), findsWidgets);
    expect(find.text('Beneficiary'), findsNothing);
    expect(tester.takeException(), isNull);

    await tester.enterText(find.byType(TextField), '111111');
    await tester.pump();
    expect(
      tester.widget<FilledButton>(find.widgetWithText(FilledButton, 'Authorize Payment')).onPressed,
      isNotNull,
    );
  });

  testWidgets('dialog stays reachable when the keyboard is open', (tester) async {
    tester.view.physicalSize = const Size(360, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    addTearDown(tester.view.resetViewInsets);

    await tester.pumpWidget(MaterialApp(
      home: Builder(
        builder: (context) => TextButton(
          onPressed: () => requireAdminCompanyTransferAuth(
            context,
            amount: '₦1.15',
            reference: 'INV-1',
          ),
          child: const Text('open'),
        ),
      ),
    ));

    await tester.tap(find.text('open'));
    await tester.pumpAndSettle();
    tester.view.viewInsets = const FakeViewPadding(bottom: 280);
    await tester.pumpAndSettle();

    await tester.scrollUntilVisible(
      find.text('Cancel'),
      80,
      scrollable: find.byType(Scrollable).last,
    );
    expect(tester.takeException(), isNull);
    expect(find.text('Authorize Payment'), findsWidgets);
  });
}
