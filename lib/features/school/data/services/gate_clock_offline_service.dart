import 'package:flutter/foundation.dart';
import 'package:uuid/uuid.dart';

import 'package:involve_app/core/services/finance_api_client.dart';
import 'package:involve_app/features/school/data/services/gate_clock_offline_store.dart';
import 'package:involve_app/features/school/presentation/widgets/id_card_identity_code.dart';

/// Offline-first Gate Clock: validate locally, then sync to the server.
class GateClockOfflineService {
  GateClockOfflineService(this._client, {GateClockOfflineStore? store})
      : _store = store ?? GateClockOfflineStore();

  final FinanceApiClient _client;
  final GateClockOfflineStore _store;
  final _uuid = const Uuid();

  static const duplicateWindow = Duration(seconds: 45);

  GateClockOfflineStore get store => _store;

  /// Pull active cards (with invify codes) into the local roster when online.
  Future<int> refreshRosterFromServer() async {
    try {
      final response = await _client.get('/api/school/id-cards');
      final body = response.data is Map
          ? Map<String, dynamic>.from(response.data as Map)
          : <String, dynamic>{};
      final rows = body['cards'];
      if (rows is! List) return 0;

      final active = <Map<String, dynamic>>[];
      for (final raw in rows) {
        if (raw is! Map) continue;
        final map = Map<String, dynamic>.from(raw);
        if ((map['status']?.toString() ?? '') != 'active') continue;
        active.add(map);
      }

      final cards = <GateOfflineCard>[];
      for (final map in active) {
        var code = resolveCardIdentityCode(
          face: map,
          barcodeValue: map['invifyCode']?.toString(),
          cardIdentityCode: map['invifyCode']?.toString() ?? map['cardIdentityCode']?.toString(),
        );
        // Older API builds omit invifyCode on list — resolve via preview once.
        if (code == null) {
          code = await _previewIdentity(
            subjectType: map['subjectType']?.toString() ?? 'student',
            subjectId: map['subjectId']?.toString() ?? '',
          );
        }
        if (code == null) continue;
        cards.add(GateOfflineCard(
          invifyCode: code,
          cardId: map['id']?.toString() ?? '',
          subjectType: map['subjectType']?.toString() ?? 'student',
          subjectId: map['subjectId']?.toString() ?? '',
          printedName: map['printedName']?.toString() ?? '',
          printedCode: map['printedCode']?.toString() ?? '',
          status: 'active',
          expiresAt: map['expiresAt']?.toString(),
        ));
      }
      if (cards.isEmpty && active.isNotEmpty) {
        debugPrint('[GateClockOffline] roster refresh found ${active.length} active cards but no invify codes');
      }
      await _store.replaceRoster(cards);
      return cards.length;
    } catch (e) {
      debugPrint('[GateClockOffline] roster refresh failed: $e');
      return -1;
    }
  }

  Future<String?> _previewIdentity({
    required String subjectType,
    required String subjectId,
  }) async {
    if (subjectId.isEmpty) return null;
    try {
      final response = await _client.get(
        '/api/school/id-cards/preview',
        queryParameters: {
          'subjectType': subjectType,
          'subjectId': subjectId,
        },
      );
      final body = response.data is Map
          ? Map<String, dynamic>.from(response.data as Map)
          : <String, dynamic>{};
      final face = body['face'] is Map
          ? Map<String, dynamic>.from(body['face'] as Map)
          : null;
      return resolveCardIdentityCode(face: face);
    } catch (_) {
      return null;
    }
  }

  Future<void> rememberIssuedCard({
    required String invifyCode,
    required String cardId,
    required String subjectType,
    required String subjectId,
    required String printedName,
    required String printedCode,
    String? expiresAt,
  }) async {
    if (!isInvifyIdentityCode(invifyCode)) return;
    await _store.upsertCard(GateOfflineCard(
      invifyCode: invifyCode.trim().toUpperCase(),
      cardId: cardId,
      subjectType: subjectType,
      subjectId: subjectId,
      printedName: printedName,
      printedCode: printedCode,
      status: 'active',
      expiresAt: expiresAt,
    ));
  }

  /// Validate + record locally. Never waits on the network.
  Future<GateLocalScanResult> processOffline({
    required String direction,
    required String token,
    String deviceLabel = 'mobile-gate',
  }) async {
    final recordedAt = DateTime.now();
    final key = _dedupeKey(token);
    final cards = await _store.loadCards();
    final card = _findCard(cards, key);

    if (card == null) {
      final pending = await _enqueue(
        direction: direction,
        token: token,
        deviceLabel: deviceLabel,
        recordedAt: recordedAt,
        outcome: 'unknown_token',
      );
      return GateLocalScanResult(
        outcome: 'unknown_token',
        accepted: false,
        person: null,
        recordedAt: recordedAt,
        pendingId: pending.id,
        synced: false,
      );
    }

    if (card.status == 'revoked') {
      final pending = await _enqueue(
        direction: direction,
        token: key,
        deviceLabel: deviceLabel,
        recordedAt: recordedAt,
        outcome: 'revoked_card',
      );
      return GateLocalScanResult(
        outcome: 'revoked_card',
        accepted: false,
        person: card.toPersonMap(),
        recordedAt: recordedAt,
        pendingId: pending.id,
        synced: false,
      );
    }

    final expires = DateTime.tryParse(card.expiresAt ?? '');
    if (expires != null && !expires.isAfter(recordedAt)) {
      final pending = await _enqueue(
        direction: direction,
        token: key,
        deviceLabel: deviceLabel,
        recordedAt: recordedAt,
        outcome: 'expired_card',
      );
      return GateLocalScanResult(
        outcome: 'expired_card',
        accepted: false,
        person: card.toPersonMap(),
        recordedAt: recordedAt,
        pendingId: pending.id,
        synced: false,
      );
    }

    if (card.subjectType == 'admin') {
      // Mirror server default: admin tracking off unless configured; keep local simple.
      final pending = await _enqueue(
        direction: direction,
        token: key,
        deviceLabel: deviceLabel,
        recordedAt: recordedAt,
        outcome: 'tracking_disabled',
      );
      return GateLocalScanResult(
        outcome: 'tracking_disabled',
        accepted: false,
        person: card.toPersonMap(),
        recordedAt: recordedAt,
        pendingId: pending.id,
        synced: false,
      );
    }

    final subjectKey = '${card.subjectType}:${card.subjectId}';
    final opens = await _store.loadOpenSessions();
    GateOpenSession? open;
    for (final session in opens) {
      if (session.subjectKey == subjectKey) {
        open = session;
        break;
      }
    }

    if (direction == 'arrival') {
      if (open != null) {
        final insideWindow = recordedAt.difference(open.openedAt) < duplicateWindow;
        final outcome = insideWindow ? 'duplicate_window' : 'duplicate_open';
        final pending = await _enqueue(
          direction: direction,
          token: key,
          deviceLabel: deviceLabel,
          recordedAt: recordedAt,
          outcome: outcome,
        );
        return GateLocalScanResult(
          outcome: outcome,
          accepted: false,
          person: card.toPersonMap(),
          recordedAt: recordedAt,
          pendingId: pending.id,
          synced: false,
        );
      }

      final scanId = _uuid.v4();
      opens.add(GateOpenSession(
        subjectKey: subjectKey,
        invifyCode: key,
        openedAt: recordedAt,
        localScanId: scanId,
      ));
      await _store.saveOpenSessions(opens);
      final pending = await _enqueue(
        direction: direction,
        token: key,
        deviceLabel: deviceLabel,
        recordedAt: recordedAt,
        outcome: 'arrival_accepted',
        id: scanId,
      );
      return GateLocalScanResult(
        outcome: 'arrival_accepted',
        accepted: true,
        person: card.toPersonMap(),
        recordedAt: recordedAt,
        pendingId: pending.id,
        synced: false,
      );
    }

    // departure
    if (open == null) {
      final pending = await _enqueue(
        direction: direction,
        token: key,
        deviceLabel: deviceLabel,
        recordedAt: recordedAt,
        outcome: 'departure_without_session',
      );
      return GateLocalScanResult(
        outcome: 'departure_without_session',
        accepted: false,
        person: card.toPersonMap(),
        recordedAt: recordedAt,
        pendingId: pending.id,
        synced: false,
      );
    }

    final remaining = opens.where((s) => s.subjectKey != subjectKey).toList();
    await _store.saveOpenSessions(remaining);
    final pending = await _enqueue(
      direction: direction,
      token: key,
      deviceLabel: deviceLabel,
      recordedAt: recordedAt,
      outcome: 'departure_accepted',
    );
    return GateLocalScanResult(
      outcome: 'departure_accepted',
      accepted: true,
      person: card.toPersonMap(),
      recordedAt: recordedAt,
      pendingId: pending.id,
      synced: false,
    );
  }

  /// Push pending scans to the server. Safe to call in the background.
  Future<int> syncPendingToServer() async {
    final pending = await _store.loadPending();
    if (pending.isEmpty) return 0;
    var synced = 0;
    for (final scan in pending) {
      try {
        final response = await _client.post(
          '/api/school/gate/scans',
          data: {
            'direction': scan.direction,
            'token': scan.token,
            'deviceLabel': scan.deviceLabel,
            'clientScanId': scan.id,
            'clientRecordedAt': scan.recordedAt,
          },
        );
        final status = response.statusCode ?? 0;
        if (status == 200 || status == 409) {
          await _store.removePending(scan.id);
          synced += 1;
        }
      } on FinanceApiException catch (e) {
        // 409 with an outcome still means the server evaluated the scan.
        if (e.statusCode == 409 && e.data is Map && (e.data as Map)['outcome'] != null) {
          await _store.removePending(scan.id);
          synced += 1;
          continue;
        }
        // Schema / auth issues: keep queued for a later retry.
        debugPrint('[GateClockOffline] sync keep ${scan.id}: ${e.statusCode} ${e.message}');
        await _bumpAttempts(scan);
      } catch (e) {
        debugPrint('[GateClockOffline] sync failed ${scan.id}: $e');
        await _bumpAttempts(scan);
      }
    }
    return synced;
  }

  Future<void> _bumpAttempts(GatePendingScan scan) async {
    final next = scan.copyWith(attempts: scan.attempts + 1);
    // Drop after many failures to avoid unbounded growth (48h / ~50 tries).
    if (next.attempts >= 50) {
      await _store.removePending(scan.id);
      return;
    }
    await _store.enqueuePending(next);
  }

  Future<GatePendingScan> _enqueue({
    required String direction,
    required String token,
    required String deviceLabel,
    required DateTime recordedAt,
    required String outcome,
    String? id,
  }) async {
    final scan = GatePendingScan(
      id: id ?? _uuid.v4(),
      direction: direction,
      token: token,
      deviceLabel: deviceLabel,
      recordedAt: recordedAt.toIso8601String(),
      localOutcome: outcome,
    );
    await _store.enqueuePending(scan);
    return scan;
  }

  GateOfflineCard? _findCard(List<GateOfflineCard> cards, String key) {
    for (final card in cards) {
      if (card.invifyCode == key) return card;
    }
    return null;
  }

  String _dedupeKey(String token) =>
      RegExp(r'^[A-Za-z0-9]{12}$').hasMatch(token) ? token.toUpperCase() : token;
}

class GateLocalScanResult {
  final String outcome;
  final bool accepted;
  final Map<String, dynamic>? person;
  final DateTime recordedAt;
  final String pendingId;
  final bool synced;

  const GateLocalScanResult({
    required this.outcome,
    required this.accepted,
    required this.person,
    required this.recordedAt,
    required this.pendingId,
    required this.synced,
  });
}
