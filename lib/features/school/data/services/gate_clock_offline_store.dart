import 'dart:convert';
import 'dart:io';

import 'package:path_provider/path_provider.dart';

/// Local Gate Clock state: card roster, open sessions, pending server sync.
class GateClockOfflineStore {
  static const _fileName = 'gate_clock_offline_v1.json';

  Future<File> _file() async {
    final dir = await getApplicationDocumentsDirectory();
    final file = File('${dir.path}/$_fileName');
    if (!await file.exists()) {
      await file.create(recursive: true);
      await file.writeAsString(jsonEncode(_empty()));
    }
    return file;
  }

  Map<String, dynamic> _empty() => {
        'version': 1,
        'rosterSyncedAt': null,
        'cards': <Map<String, dynamic>>[],
        'openSessions': <Map<String, dynamic>>[],
        'pending': <Map<String, dynamic>>[],
      };

  Future<Map<String, dynamic>> load() async {
    try {
      final file = await _file();
      final raw = await file.readAsString();
      if (raw.trim().isEmpty) return _empty();
      final decoded = jsonDecode(raw);
      if (decoded is! Map) return _empty();
      return Map<String, dynamic>.from(decoded);
    } catch (_) {
      return _empty();
    }
  }

  Future<void> save(Map<String, dynamic> state) async {
    final file = await _file();
    await file.writeAsString(jsonEncode(state));
  }

  Future<List<GateOfflineCard>> loadCards() async {
    final state = await load();
    final rows = state['cards'];
    if (rows is! List) return [];
    return rows
        .whereType<Map>()
        .map((e) => GateOfflineCard.fromJson(Map<String, dynamic>.from(e)))
        .where((c) => c.invifyCode.length == 12)
        .toList();
  }

  Future<void> replaceRoster(List<GateOfflineCard> cards) async {
    final state = await load();
    state['cards'] = cards.map((c) => c.toJson()).toList();
    state['rosterSyncedAt'] = DateTime.now().toIso8601String();
    await save(state);
  }

  Future<void> upsertCard(GateOfflineCard card) async {
    final state = await load();
    final list = (state['cards'] is List)
        ? List<Map<String, dynamic>>.from(
            (state['cards'] as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)),
          )
        : <Map<String, dynamic>>[];
    final code = card.invifyCode.toUpperCase();
    list.removeWhere((e) {
      final existing = (e['invifyCode']?.toString() ?? '').toUpperCase();
      final samePerson = e['subjectType'] == card.subjectType &&
          e['subjectId']?.toString() == card.subjectId;
      return existing == code || samePerson;
    });
    list.add(card.toJson());
    state['cards'] = list;
    await save(state);
  }

  Future<List<GateOpenSession>> loadOpenSessions() async {
    final state = await load();
    final rows = state['openSessions'];
    if (rows is! List) return [];
    return rows
        .whereType<Map>()
        .map((e) => GateOpenSession.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<void> saveOpenSessions(List<GateOpenSession> sessions) async {
    final state = await load();
    state['openSessions'] = sessions.map((s) => s.toJson()).toList();
    await save(state);
  }

  Future<List<GatePendingScan>> loadPending() async {
    final state = await load();
    final rows = state['pending'];
    if (rows is! List) return [];
    return rows
        .whereType<Map>()
        .map((e) => GatePendingScan.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  Future<void> enqueuePending(GatePendingScan scan) async {
    final state = await load();
    final list = (state['pending'] is List)
        ? List<Map<String, dynamic>>.from(
            (state['pending'] as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)),
          )
        : <Map<String, dynamic>>[];
    list.removeWhere((e) => e['id']?.toString() == scan.id);
    list.add(scan.toJson());
    state['pending'] = list;
    await save(state);
  }

  Future<void> removePending(String id) async {
    final state = await load();
    final list = (state['pending'] is List)
        ? List<Map<String, dynamic>>.from(
            (state['pending'] as List).whereType<Map>().map((e) => Map<String, dynamic>.from(e)),
          )
        : <Map<String, dynamic>>[];
    list.removeWhere((e) => e['id']?.toString() == id);
    state['pending'] = list;
    await save(state);
  }

  Future<DateTime?> rosterSyncedAt() async {
    final state = await load();
    return DateTime.tryParse(state['rosterSyncedAt']?.toString() ?? '');
  }
}

class GateOfflineCard {
  final String invifyCode;
  final String cardId;
  final String subjectType;
  final String subjectId;
  final String printedName;
  final String printedCode;
  final String status;
  final String? expiresAt;

  const GateOfflineCard({
    required this.invifyCode,
    required this.cardId,
    required this.subjectType,
    required this.subjectId,
    required this.printedName,
    required this.printedCode,
    required this.status,
    this.expiresAt,
  });

  factory GateOfflineCard.fromJson(Map<String, dynamic> json) => GateOfflineCard(
        invifyCode: (json['invifyCode']?.toString() ?? '').trim().toUpperCase(),
        cardId: json['cardId']?.toString() ?? '',
        subjectType: json['subjectType']?.toString() ?? 'student',
        subjectId: json['subjectId']?.toString() ?? '',
        printedName: json['printedName']?.toString() ?? '',
        printedCode: json['printedCode']?.toString() ?? '',
        status: json['status']?.toString() ?? 'active',
        expiresAt: json['expiresAt']?.toString(),
      );

  Map<String, dynamic> toJson() => {
        'invifyCode': invifyCode,
        'cardId': cardId,
        'subjectType': subjectType,
        'subjectId': subjectId,
        'printedName': printedName,
        'printedCode': printedCode,
        'status': status,
        'expiresAt': expiresAt,
      };

  Map<String, dynamic> toPersonMap() => {
        'subjectType': subjectType,
        'printedName': printedName,
        'printedCode': printedCode,
        'studentId': subjectType == 'student' ? subjectId : null,
        'staffId': subjectType == 'staff' ? subjectId : null,
      };
}

class GateOpenSession {
  final String subjectKey;
  final String invifyCode;
  final DateTime openedAt;
  final String localScanId;

  const GateOpenSession({
    required this.subjectKey,
    required this.invifyCode,
    required this.openedAt,
    required this.localScanId,
  });

  factory GateOpenSession.fromJson(Map<String, dynamic> json) => GateOpenSession(
        subjectKey: json['subjectKey']?.toString() ?? '',
        invifyCode: (json['invifyCode']?.toString() ?? '').toUpperCase(),
        openedAt: DateTime.tryParse(json['openedAt']?.toString() ?? '') ?? DateTime.now(),
        localScanId: json['localScanId']?.toString() ?? '',
      );

  Map<String, dynamic> toJson() => {
        'subjectKey': subjectKey,
        'invifyCode': invifyCode,
        'openedAt': openedAt.toIso8601String(),
        'localScanId': localScanId,
      };
}

class GatePendingScan {
  final String id;
  final String direction;
  final String token;
  final String deviceLabel;
  final String recordedAt;
  final String localOutcome;
  final int attempts;

  const GatePendingScan({
    required this.id,
    required this.direction,
    required this.token,
    required this.deviceLabel,
    required this.recordedAt,
    required this.localOutcome,
    this.attempts = 0,
  });

  factory GatePendingScan.fromJson(Map<String, dynamic> json) => GatePendingScan(
        id: json['id']?.toString() ?? '',
        direction: json['direction']?.toString() ?? 'arrival',
        token: json['token']?.toString() ?? '',
        deviceLabel: json['deviceLabel']?.toString() ?? 'mobile-gate',
        recordedAt: json['recordedAt']?.toString() ?? DateTime.now().toIso8601String(),
        localOutcome: json['localOutcome']?.toString() ?? '',
        attempts: int.tryParse(json['attempts']?.toString() ?? '') ?? 0,
      );

  Map<String, dynamic> toJson() => {
        'id': id,
        'direction': direction,
        'token': token,
        'deviceLabel': deviceLabel,
        'recordedAt': recordedAt,
        'localOutcome': localOutcome,
        'attempts': attempts,
      };

  GatePendingScan copyWith({int? attempts}) => GatePendingScan(
        id: id,
        direction: direction,
        token: token,
        deviceLabel: deviceLabel,
        recordedAt: recordedAt,
        localOutcome: localOutcome,
        attempts: attempts ?? this.attempts,
      );
}
