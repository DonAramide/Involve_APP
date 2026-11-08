import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'package:involve_app/core/service_mode/service_mode_terms.dart';
import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/core/services/service_locator.dart';
import 'package:involve_app/core/utils/app_config.dart';
import 'package:involve_app/features/invoicing/domain/templates/invoice_template.dart';
import 'package:involve_app/features/printer/presentation/bloc/printer_bloc.dart';
import 'package:pdf/pdf.dart';
import 'package:printing/printing.dart';
import 'package:involve_app/features/school/data/services/gate_clock_offline_service.dart';
import 'package:involve_app/features/school/presentation/bloc/school_bloc.dart';
import 'package:involve_app/features/school/presentation/widgets/id_card_identity_code.dart';
import 'package:involve_app/features/school/presentation/widgets/id_card_landscape_print.dart';
import 'package:involve_app/features/school/presentation/widgets/school_id_card_preview.dart';
import 'package:involve_app/features/settings/domain/services/security_service.dart';
import 'package:involve_app/features/settings/presentation/bloc/settings_bloc.dart';

/// School owner / tenant administrator card issuing + Bluetooth/thermal print.
/// Photos are taken from the student/staff records already stored on this device.
class IdCardAdminPage extends StatefulWidget {
  static const String routeName = '/id_card_admin';

  const IdCardAdminPage({super.key});

  @override
  State<IdCardAdminPage> createState() => _IdCardAdminPageState();
}

class _IdCardAdminPageState extends State<IdCardAdminPage> {
  static const _disclaimer =
      'This card remains the property of the issuing institution. It must be presented when requested by authorized personnel. If found, please return it to the issuing institution. Unauthorized use, alteration, or transfer is prohibited.';

  final List<_Person> _people = [];
  String _filter = 'all';
  String? _error;
  bool _loading = true;
  String? _busyId;

  FinanceApiClient _client() {
    if (!sl.isRegistered<FinanceApiClient>()) {
      sl.registerSingleton<FinanceApiClient>(FinanceApiClient(
        baseUrl: AppConfig.baseUrl,
        getToken: () async {
          final offline = await SecurityService().getOfflineToken();
          if (offline != null && offline.trim().isNotEmpty) return offline.trim();
          return Supabase.instance.client.auth.currentSession?.accessToken;
        },
        getTenantId: () async => await SecurityService().getTenantId(),
      ));
    }
    return sl<FinanceApiClient>();
  }

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final response = await _client().get('/api/school/id-cards/eligible');
      final failure = _failure(response.statusCode, response.data);
      if (failure != null) {
        setState(() {
          _error = failure;
          _people.clear();
          _loading = false;
        });
        return;
      }
      final body = response.data is Map
          ? Map<String, dynamic>.from(response.data as Map)
          : <String, dynamic>{};
      final next = <_Person>[
        ..._readList(body['students']),
        ..._readList(body['staff']),
        ..._readList(body['administrators']),
      ];
      setState(() {
        _people
          ..clear()
          ..addAll(next);
        _loading = false;
      });
    } on FinanceApiException catch (error) {
      setState(() {
        // FinanceApiClient maps bare 404s to a generic "finance endpoint" string;
        // rewrite so school ID Card UX matches the real cause (route/schema not live).
        _error = _failure(error.statusCode, error.data) ??
            _rewriteEndpointMissing(error.message) ??
            error.message;
        _loading = false;
      });
    } on DioException catch (error) {
      setState(() {
        _error = _failure(error.response?.statusCode, error.response?.data) ??
            _rewriteEndpointMissing(error.message) ??
            'The ID card list could not be loaded.';
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _error = 'The ID card list could not be loaded.';
        _loading = false;
      });
    }
  }

  Future<void> _generate(_Person person) async {
    setState(() => _busyId = person.subjectId);
    try {
      var response = await _issue(person);
      if (response.statusCode == 409 && _code(response.data) == 'SETTINGS_REQUIRED') {
        final saved = await _client().put('/api/school/id-cards/settings', data: {
          'studentTemplate': 'classic_school',
          'staffTemplate': 'classic_school',
          'adminTemplate': 'classic_school',
          'notifyStudentArrival': true,
          'notifyStudentDeparture': true,
          'notifyStaffArrival': true,
          'notifyStaffDeparture': true,
          'trackAdminEntry': false,
          'disclaimer': _disclaimer,
        });
        final saveFailure = _failure(saved.statusCode, saved.data);
        if (saveFailure != null) {
          _showMessage(saveFailure);
          return;
        }
        response = await _issue(person);
      }
      final failure = _failure(response.statusCode, response.data);
      if (failure != null) {
        _showMessage(failure);
        return;
      }
      final cards = response.data is Map ? (response.data as Map)['cards'] : null;
      final first = cards is List && cards.isNotEmpty && cards.first is Map
          ? Map<String, dynamic>.from(cards.first as Map)
          : null;
      final face = first?['face'] is Map
          ? Map<String, dynamic>.from(first!['face'] as Map)
          : null;
      // Prefer explicit 12-char identity; never use verificationToken for print.
      final identity = resolveCardIdentityCode(
        face: face,
        barcodeValue: first?['barcodeValue']?.toString() ?? first?['cardIdentityCode']?.toString(),
        cardIdentityCode: first?['cardIdentityCode']?.toString(),
      );
      if (identity == null) {
        _showMessage(
          'Card issued, but no 12-character identity code was returned. '
          'Apply the invify_code migration on the server and re-issue.',
        );
      } else {
        // Keep Gate Clock offline roster current without waiting for a full sync.
        final cardMap = first?['card'] is Map
            ? Map<String, dynamic>.from(first!['card'] as Map)
            : null;
        try {
          await GateClockOfflineService(_client()).rememberIssuedCard(
            invifyCode: identity,
            cardId: cardMap?['id']?.toString() ?? '',
            subjectType: person.subjectType,
            subjectId: person.subjectId,
            printedName: face?['fullName']?.toString() ??
                face?['printedName']?.toString() ??
                person.name,
            printedCode: face?['printedCode']?.toString() ?? person.printedCode,
            expiresAt: cardMap?['expiresAt']?.toString(),
          );
        } catch (_) {}
      }
      if (!mounted) return;
      final photo = _localPhotoFor(person);
      await _showCardPreviewDialog(
        person: person,
        face: face,
        barcode: identity,
        photo: photo,
        verificationToken: first?['verificationToken']?.toString() ??
            face?['verificationToken']?.toString(),
      );
      await _load();
    } on FinanceApiException catch (error) {
      _showMessage(error.message);
    } on DioException catch (error) {
      _showMessage(
        _failure(error.response?.statusCode, error.response?.data) ??
            'The card could not be generated.',
      );
    } catch (_) {
      _showMessage('The card could not be generated.');
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  Future<void> _showCardPreviewDialog({
    required _Person person,
    required Map<String, dynamic>? face,
    required String? barcode,
    required Uint8List? photo,
    String? verificationToken,
  }) async {
    final schoolName = face?['schoolName']?.toString() ??
        context.read<SettingsBloc>().state.settings?.organizationName ??
        'School';
    final name = face?['printedName']?.toString() ??
        face?['fullName']?.toString() ??
        person.name;
    final code = face?['printedCode']?.toString() ?? person.printedCode;
    final detail = (face?['printedDetail'] ?? face?['detail'] ?? person.detail)?.toString();
    final hmoName = face?['hmoName']?.toString();
    final enrolleeId = (face?['enrolleeId'] ?? face?['policyNumber'])?.toString();
    final category = (face?['category'] ?? person.subjectType).toString().toUpperCase();
    final address = face?['address']?.toString();
    final accent = face?['accentColor']?.toString();
    final disclaimer = face?['disclaimer']?.toString();
    final lostPhone = (face?['lostFoundPhone'] ?? face?['lost_found_phone'])?.toString();
    final lostEmail = (face?['lostFoundEmail'] ?? face?['lost_found_email'])?.toString();
    // Code 128 payload is ONLY the 12-char identity — never the verification token.
    final barcodePayload = resolveCardIdentityCode(face: face, barcodeValue: barcode);
    final canPrint = barcodePayload != null;
    final secretToken = verificationToken ?? face?['verificationToken']?.toString();

    final paperWidth =
        context.read<SettingsBloc>().state.settings?.paperWidth ?? 80;
    final terms = _terms;
    final printCategory = terms.subjectTypeLabel(category).toUpperCase();
    Uint8List? frontPng;
    Uint8List? backPng;
    if (canPrint && barcodePayload != null) {
      final contact = [
        (lostPhone ?? '').trim(),
        (lostEmail ?? '').trim(),
      ].where((s) => s.isNotEmpty).join(' · ');
      frontPng = await IdCardLandscapePrint.renderSide(
        side: 'front',
        paperWidthMm: paperWidth,
        organizationName: schoolName,
        fullName: name,
        category: printCategory.isEmpty ? terms.beneficiary.toUpperCase() : printCategory,
        printedCode: code,
        detail: detail,
        hmoName: category.toUpperCase() == 'STUDENT' ? hmoName : null,
        enrolleeId: category.toUpperCase() == 'STUDENT' ? enrolleeId : null,
        address: address,
        accentHex: accent,
        photoBytes: photo,
        barcodePayload: barcodePayload,
        groupFieldLabel: category.toUpperCase() == 'STUDENT'
            ? terms.beneficiaryGroup
            : 'Role',
      );
      backPng = await IdCardLandscapePrint.renderSide(
        side: 'back',
        paperWidthMm: paperWidth,
        organizationName: schoolName,
        fullName: name,
        category: printCategory.isEmpty ? terms.beneficiary.toUpperCase() : printCategory,
        printedCode: code,
        address: address,
        disclaimer: disclaimer,
        returnHint: contact.isEmpty
            ? terms.idCardReturnHint
            : '${terms.idCardReturnHint} Contact: $contact',
        authorizedSignatory: terms.idCardAuthorizedSignatory,
        accentHex: accent,
        barcodePayload: barcodePayload,
      );
    }

    if (!mounted) return;
    await showDialog<void>(
      context: context,
      builder: (dialogContext) {
        return AlertDialog(
          insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
          title: const Text('Printable ID card'),
          content: SizedBox(
            width: 360,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (frontPng != null) ...[
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text('FRONT (landscape printout)', style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                    const SizedBox(height: 6),
                    Image.memory(frontPng, fit: BoxFit.fitWidth),
                    const SizedBox(height: 12),
                  ],
                  if (backPng != null) ...[
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text('BACK (landscape printout)', style: TextStyle(fontWeight: FontWeight.w700)),
                    ),
                    const SizedBox(height: 6),
                    Image.memory(backPng, fit: BoxFit.fitWidth),
                    const SizedBox(height: 12),
                  ],
                  if (frontPng == null)
                    SchoolIdCardPreview(
                      schoolName: schoolName,
                      address: address,
                      fullName: name,
                      category: category.isEmpty ? 'STUDENT' : category,
                      printedCode: code,
                      detail: detail,
                      hmoName: category.toUpperCase() == 'STUDENT' ? hmoName : null,
                      enrolleeId: category.toUpperCase() == 'STUDENT' ? enrolleeId : null,
                      accentHex: accent,
                      photoBytes: photo,
                      barcodeValue: barcodePayload,
                      disclaimer: disclaimer,
                      lostFoundPhone: lostPhone,
                      lostFoundEmail: lostEmail,
                      side: 'both',
                      showBarcodeSecretHint: canPrint,
                      terms: _terms,
                    ),
                  const SizedBox(height: 8),
                  Text(
                    frontPng != null
                        ? 'CR80 landscape (85.6 x 54 mm). Barcode encodes the 12-character identity code only (Code 128). Verification token is not printed.'
                        : (barcode == null
                            ? 'Issue or re-issue the card after the invify_code migration so a 12-character identity barcode is available.'
                            : 'No valid 12-character identity code. Apply migration and re-issue before printing.'),
                    style: const TextStyle(fontSize: 12.5),
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(dialogContext),
              child: const Text('Close'),
            ),
            if (secretToken != null && secretToken.trim().isNotEmpty)
              TextButton(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: secretToken.trim()));
                  _showMessage('Verification token copied (keep private — not for printing).');
                },
                child: const Text('Copy token'),
              ),
            if (canPrint && frontPng != null && backPng != null)
              TextButton(
                onPressed: () async {
                  final pdfBytes = await IdCardLandscapePrint.buildPdf(
                    frontPng: frontPng!,
                    backPng: backPng!,
                  );
                  await Printing.layoutPdf(
                    onLayout: (PdfPageFormat format) async => pdfBytes,
                    name: 'id-card-',
                  );
                },
                child: const Text('PDF'),
              ),
            FilledButton(
              onPressed: !canPrint
                  ? null
                  : () async {
                      Navigator.pop(dialogContext);
                      await _printCard(
                        person: person,
                        face: face,
                        barcode: barcodePayload!,
                        photo: photo,
                        frontPng: frontPng,
                        backPng: backPng,
                      );
                    },
              child: const Text('Print ID card'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _previewOnly(_Person person) async {
    setState(() => _busyId = person.subjectId);
    try {
      final response = await _client().get(
        '/api/school/id-cards/preview',
        queryParameters: {
          'subjectType': person.subjectType,
          'subjectId': person.subjectId,
        },
      );
      final failure = _failure(response.statusCode, response.data);
      if (failure != null) {
        _showMessage(failure);
        return;
      }
      final body = response.data is Map
          ? Map<String, dynamic>.from(response.data as Map)
          : <String, dynamic>{};
      final face = body['face'] is Map
          ? Map<String, dynamic>.from(body['face'] as Map)
          : null;
      if (!mounted) return;
      await _showCardPreviewDialog(
        person: person,
        face: face,
        barcode: resolveCardIdentityCode(
          face: face,
          barcodeValue: face?['barcodeValue']?.toString(),
          cardIdentityCode: face?['cardIdentityCode']?.toString(),
        ),
        photo: _localPhotoFor(person),
        verificationToken: face?['verificationToken']?.toString(),
      );
    } on FinanceApiException catch (error) {
      _showMessage(error.message);
    } on DioException catch (error) {
      _showMessage(
        _failure(error.response?.statusCode, error.response?.data) ??
            'The card preview could not be loaded.',
      );
    } catch (_) {
      _showMessage('The card preview could not be loaded.');
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  Future<void> _printCard({
    required _Person person,
    required Map<String, dynamic>? face,
    required String barcode,
    required Uint8List? photo,
    Uint8List? frontPng,
    Uint8List? backPng,
  }) async {
    if (!mounted) return;
    final printerBloc = context.read<PrinterBloc>();
    if (printerBloc.state.connectedDevice == null) {
      _showMessage('Connect a Bluetooth printer in Printer Settings first (58mm or 80mm).');
      return;
    }
    final terms = _terms;
    final paperWidth = context.read<SettingsBloc>().state.settings?.paperWidth ?? 80;
    final schoolName = face?['schoolName']?.toString() ??
        context.read<SettingsBloc>().state.settings?.organizationName ??
        terms.organisation;
    final name = face?['printedName']?.toString() ??
        face?['fullName']?.toString() ??
        person.name;
    final code = face?['printedCode']?.toString() ?? person.printedCode;
    final detail = (face?['printedDetail'] ?? face?['detail'] ?? person.detail)?.toString();
    final rawCategory = (face?['category'] ?? person.subjectType).toString();
    final category = terms.subjectTypeLabel(rawCategory).toUpperCase();
    final address = face?['address']?.toString();
    final disclaimer = (face?['disclaimer']?.toString() ?? '').trim().isNotEmpty
        ? face!['disclaimer'].toString().trim()
        : 'This card remains the property of the issuing institution. Present it when requested. ${terms.idCardReturnHint}';
    final lostPhone = (face?['lostFoundPhone'] ?? face?['lost_found_phone'])?.toString() ?? '';
    final lostEmail = (face?['lostFoundEmail'] ?? face?['lost_found_email'])?.toString() ?? '';
    final contact = [lostPhone.trim(), lostEmail.trim()].where((s) => s.isNotEmpty).join(' · ');

    final barcodePayload = resolveCardIdentityCode(
      face: face,
      barcodeValue: barcode,
    );
    if (barcodePayload == null) {
      _showMessage(
        'Cannot print: missing 12-character identity code. '
        'Apply invify_code migration and re-issue the card.',
      );
      return;
    }
    final accent = face?['accentColor']?.toString();
    final returnHint = contact.isEmpty
        ? terms.idCardReturnHint
        : '${terms.idCardReturnHint} Contact: $contact';
    final groupLabel = rawCategory.toLowerCase() == 'student'
        ? terms.beneficiaryGroup
        : 'Role';

    // Always re-render at thermal-native DPI (do not downscale the 300 DPI preview).
    final hmoName = face?['hmoName']?.toString();
    final enrolleeId = (face?['enrolleeId'] ?? face?['policyNumber'])?.toString();
    final thermalFront = await IdCardLandscapePrint.renderSide(
      side: 'front',
      paperWidthMm: paperWidth,
      organizationName: schoolName,
      fullName: name,
      category: category.isEmpty ? terms.beneficiary.toUpperCase() : category,
      printedCode: code,
      detail: detail,
      hmoName: rawCategory.toLowerCase() == 'student' ? hmoName : null,
      enrolleeId: rawCategory.toLowerCase() == 'student' ? enrolleeId : null,
      address: address,
      accentHex: accent,
      photoBytes: photo,
      barcodePayload: barcodePayload,
      groupFieldLabel: groupLabel,
      forThermal: true,
    );
    final thermalBack = await IdCardLandscapePrint.renderSide(
      side: 'back',
      paperWidthMm: paperWidth,
      organizationName: schoolName,
      fullName: name,
      category: category.isEmpty ? terms.beneficiary.toUpperCase() : category,
      printedCode: code,
      address: address,
      disclaimer: disclaimer,
      returnHint: returnHint,
      authorizedSignatory: terms.idCardAuthorizedSignatory,
      accentHex: accent,
      barcodePayload: barcodePayload,
      forThermal: true,
    );
    if (thermalFront == null || thermalBack == null) {
      _showMessage('Thermal ID card image could not be prepared for printing.');
      return;
    }

    try {
      _showMessage('Printing landscape ID card on ${paperWidth}mm…');
      // ESC * (useRaster:false) — same path as receipt logos on these printers.
      // Native BarcodeCommand is the scannable gate barcode (sharp ESC/POS bars).
      await printerBloc.printInvoice([
        TextCommand(terms.idCardPrintBannerFront, isBold: true, align: 'center'),
        TextCommand('CR80 landscape on ${paperWidth}mm', align: 'center'),
        SizedBoxCommand(height: 1),
        ImageCommand(bytes: thermalFront, align: 'center', useRaster: false),
        SizedBoxCommand(height: 1),
        TextCommand('Gate scan barcode', align: 'center'),
        BarcodeCommand(data: barcodePayload, align: 'center'),
        TextCommand(barcodePayload, align: 'center'),
        SizedBoxCommand(height: 2),
      ], paperWidth);
      await Future.delayed(const Duration(milliseconds: 800));
      await printerBloc.printInvoice([
        TextCommand(terms.idCardPrintBannerBack, isBold: true, align: 'center'),
        SizedBoxCommand(height: 1),
        ImageCommand(bytes: thermalBack, align: 'center', useRaster: false),
        SizedBoxCommand(height: 1),
        BarcodeCommand(data: barcodePayload, align: 'center'),
        TextCommand(barcodePayload, align: 'center'),
        TextCommand('Present this card when requested.', align: 'center'),
      ], paperWidth);
      if (!mounted) return;
      _showMessage(
        paperWidth >= 80
            ? 'Printed landscape front + back on 80mm. Trim the empty side margins.'
            : 'Printed landscape front + back on ${paperWidth}mm.',
      );
    } catch (e) {
      if (!mounted) return;
      _showMessage('Print failed: $e');
    }
  }

  Uint8List? _localPhotoFor(_Person person) {
    try {
      final school = context.read<SchoolBloc>().state;
      if (person.subjectType == 'student') {
        final code = person.printedCode.trim().toLowerCase();
        final byAdmission = school.students.where(
          (s) => s.admissionNumber.trim().toLowerCase() == code,
        );
        if (byAdmission.isNotEmpty) return byAdmission.first.image;
        final byId = school.students.where((s) => s.id?.toString() == person.subjectId);
        if (byId.isNotEmpty) return byId.first.image;
      }
      if (person.subjectType == 'staff') {
        // Staff photos are not always modeled; skip quietly.
      }
    } catch (_) {}
    return null;
  }

  Future<Response<dynamic>> _issue(_Person person) {
    return _client().post('/api/school/id-cards/batch', data: {
      'people': [
        {'subjectType': person.subjectType, 'subjectId': person.subjectId},
      ],
    });
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  List<_Person> _readList(Object? value) {
    if (value is! List) return const [];
    return value.whereType<Map>().map((row) {
      final map = Map<String, dynamic>.from(row);
      return _Person(
        subjectType: map['subjectType']?.toString() ?? '',
        subjectId: map['subjectId']?.toString() ?? '',
        name: map['name']?.toString() ?? '',
        printedCode: map['printedCode']?.toString() ?? '',
        detail: map['detail']?.toString(),
        cardStatus: map['cardStatus']?.toString() ?? 'none',
      );
    }).where((person) => person.subjectId.isNotEmpty).toList();
  }

  String? _failure(int? status, Object? data) {
    if (status != null && status < 400) return null;
    final code = _code(data);
    if (code == 'SCHOOL_GATE_SCHEMA_UNAPPLIED' || status == 404) {
      return 'ID cards are not available on the production server yet '
          '(API route missing or school ID-card database migration not applied).';
    }
    if (status == 401 || (data is Map && data['error']?.toString().contains('Authorization') == true)) {
      return 'Sign in again on this device (authorization missing). Then reopen ID Card.';
    }
    if (status == 403 || code == 'FORBIDDEN') {
      return 'Only a school owner or tenant administrator can view or generate ID cards.';
    }
    if (data is Map && data['error'] != null) return data['error'].toString();
    return 'The ID card request could not be completed.';
  }

  /// Maps generic FinanceApiClient 404 wording to an ID-card-specific explanation.
  String? _rewriteEndpointMissing(String? message) {
    final t = (message ?? '').toLowerCase();
    if (t.contains('finance endpoint') ||
        t.contains('endpoint is not available') ||
        t.contains('endpoint not found') ||
        t.contains('route not found') ||
        t.contains('cannot get') ||
        t.contains('requested resource was not found')) {
      return 'ID cards are not available on the production server yet '
          '(API route missing or school ID-card database migration not applied).';
    }
    return null;
  }

  String? _code(Object? data) => data is Map ? data['code']?.toString() : null;

  ServiceModeTerms get _terms {
    final mode =
        context.read<SettingsBloc>().state.settings?.normalizedBusinessMode;
    return ServiceModeTerms.fromRaw(mode);
  }

  @override
  Widget build(BuildContext context) {
    final terms = _terms;
    final visible =
        _people.where((person) => _filter == 'all' || person.subjectType == _filter).toList();
    return Scaffold(
      appBar: AppBar(
        title: Text(terms.idCardModuleTitle),
        actions: [
          TextButton(
            onPressed: () => Navigator.pushNamed(context, '/my_id_card'),
            child: const Text('My card'),
          ),
          IconButton(onPressed: _loading ? null : _load, icon: const Icon(Icons.refresh)),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: Text(terms.idCardPrintHint),
                ),
                if (_error != null)
                  Padding(
                    padding: const EdgeInsets.all(16),
                    child: Text(_error!, style: const TextStyle(color: Colors.red)),
                  ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  child: Wrap(
                    spacing: 8,
                    children: [
                      ChoiceChip(
                        label: Text(terms.filterChipAll),
                        selected: _filter == 'all',
                        onSelected: (_) => setState(() => _filter = 'all'),
                      ),
                      ChoiceChip(
                        label: Text(terms.filterChipBeneficiaries),
                        selected: _filter == 'student',
                        onSelected: (_) => setState(() => _filter = 'student'),
                      ),
                      ChoiceChip(
                        label: Text(terms.filterChipStaff),
                        selected: _filter == 'staff',
                        onSelected: (_) => setState(() => _filter = 'staff'),
                      ),
                      ChoiceChip(
                        label: Text(terms.filterChipAdministrators),
                        selected: _filter == 'admin',
                        onSelected: (_) => setState(() => _filter = 'admin'),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: visible.isEmpty
                      ? const Center(child: Text('No people are available for ID cards.'))
                      : ListView.builder(
                          itemCount: visible.length,
                          itemBuilder: (context, index) {
                            final person = visible[index];
                            final photo = _localPhotoFor(person);
                            return ListTile(
                              leading: CircleAvatar(
                                backgroundImage: photo != null ? MemoryImage(photo) : null,
                                child: photo == null
                                    ? Text(
                                        person.name.isNotEmpty ? person.name[0].toUpperCase() : '?',
                                      )
                                    : null,
                              ),
                              title: Text(person.name),
                              subtitle: Text('${person.printedCode} · ${person.cardStatus}'),
                              trailing: _busyId == person.subjectId
                                  ? const SizedBox(
                                      width: 24,
                                      height: 24,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    )
                                  : Wrap(
                                      spacing: 0,
                                      children: [
                                        TextButton(
                                          onPressed: _error == null ? () => _previewOnly(person) : null,
                                          child: const Text('Preview'),
                                        ),
                                        TextButton(
                                          onPressed: _error == null ? () => _generate(person) : null,
                                          child: Text(
                                            person.cardStatus == 'active'
                                                ? 'Issue & Print'
                                                : 'Issue & Print',
                                          ),
                                        ),
                                      ],
                                    ),
                            );
                          },
                        ),
                ),
              ],
            ),
    );
  }
}

class _Person {
  const _Person({
    required this.subjectType,
    required this.subjectId,
    required this.name,
    required this.printedCode,
    required this.detail,
    required this.cardStatus,
  });

  final String subjectType;
  final String subjectId;
  final String name;
  final String printedCode;
  final String? detail;
  final String cardStatus;
}
