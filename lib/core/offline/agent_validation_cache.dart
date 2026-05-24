import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class CachedAgentRegistry {
  final String agentCode;
  final String state; // ACTIVE, PENDING, etc.
  final DateTime expirationTimestamp;
  final String commissionProfileVersion;
  final String integritySignature;

  CachedAgentRegistry({
    required this.agentCode,
    required this.state,
    required this.expirationTimestamp,
    required this.commissionProfileVersion,
    required this.integritySignature,
  });

  bool get isExpired => DateTime.now().isAfter(expirationTimestamp);

  Map<String, dynamic> toMap() {
    return {
      'agentCode': agentCode,
      'state': state,
      'expirationTimestamp': expirationTimestamp.toIso8601String(),
      'commissionProfileVersion': commissionProfileVersion,
      'integritySignature': integritySignature,
    };
  }

  factory CachedAgentRegistry.fromMap(Map<String, dynamic> map) {
    return CachedAgentRegistry(
      agentCode: map['agentCode'],
      state: map['state'],
      expirationTimestamp: DateTime.parse(map['expirationTimestamp']),
      commissionProfileVersion: map['commissionProfileVersion'],
      integritySignature: map['integritySignature'],
    );
  }
}

class AgentValidationCache {
  final _secureStorage = const FlutterSecureStorage();
  Database? _db;
  
  static const int cacheValidityHours = 72;
  static const String _secretKey = 'local_device_secure_key'; // Would be in secure storage

  /// Initializes the SQLite DB and Secure Storage
  Future<void> init() async {
    final databasesPath = await getDatabasesPath();
    final path = join(databasesPath, 'agent_validation.db');

    _db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE agent_registry (
            agentCode TEXT PRIMARY KEY,
            state TEXT,
            expirationTimestamp TEXT,
            commissionProfileVersion TEXT,
            integritySignature TEXT
          )
        ''');
      },
    );
    print("AgentValidationCache: Initialized SQLite & SecureStorage");
  }

  /// Caches a valid agent code from the online backend
  Future<void> cacheAgent(String agentCode, String state, String profileVersion) async {
    if (_db == null) await init();

    final expiration = DateTime.now().add(const Duration(hours: cacheValidityHours));
    
    // Generate signature to ensure SQLite data isn't tampered with
    final dataToSign = '$agentCode:$state:${expiration.toIso8601String()}:$profileVersion';
    final signature = _generateSignature(dataToSign);

    final record = CachedAgentRegistry(
      agentCode: agentCode,
      state: state,
      expirationTimestamp: expiration,
      commissionProfileVersion: profileVersion,
      integritySignature: signature,
    );

    // Store signature in SecureStorage
    await _secureStorage.write(key: 'agent_sig_$agentCode', value: signature);
    
    // Store record in SQLite
    await _db!.insert(
      'agent_registry', 
      record.toMap(),
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
    print("AgentValidationCache: Cached agent $agentCode until $expiration");
  }

  /// Validates an agent code offline
  Future<ValidationResult> validateOffline(String agentCode) async {
    if (_db == null) await init();

    // Fetch from SQLite
    final recordMap = await _db!.query('agent_registry', where: 'agentCode = ?', whereArgs: [agentCode]);
    if (recordMap.isEmpty) return ValidationResult.notFound();
    
    final record = CachedAgentRegistry.fromMap(recordMap.first);

    // Verify Integrity
    final storedSig = await _secureStorage.read(key: 'agent_sig_$agentCode');
    
    if (storedSig == null) {
      return ValidationResult.tampered();
    }
    
    final dataToVerify = '${record.agentCode}:${record.state}:${record.expirationTimestamp.toIso8601String()}:${record.commissionProfileVersion}';
    final expectedSig = _generateSignature(dataToVerify);

    if (storedSig != expectedSig) {
      return ValidationResult.tampered();
    }

    if (record.isExpired) {
      return ValidationResult.expired();
    }

    if (record.state != 'ACTIVE') {
      return ValidationResult.inactive();
    }

    return ValidationResult.valid(record);
  }

  String _generateSignature(String data) {
    var key = utf8.encode(_secretKey);
    var bytes = utf8.encode(data);
    var hmacSha256 = Hmac(sha256, key);
    return hmacSha256.convert(bytes).toString();
  }
}

class ValidationResult {
  final bool isValid;
  final String message;
  final CachedAgentRegistry? agent;

  ValidationResult._({required this.isValid, required this.message, this.agent});

  factory ValidationResult.valid(CachedAgentRegistry agent) => ValidationResult._(isValid: true, message: 'Valid', agent: agent);
  factory ValidationResult.notFound() => ValidationResult._(isValid: false, message: 'Agent code not found offline.');
  factory ValidationResult.tampered() => ValidationResult._(isValid: false, message: 'Offline cache tampered!');
  factory ValidationResult.expired() => ValidationResult._(isValid: false, message: 'Cache expired. Online revalidation required.');
  factory ValidationResult.inactive() => ValidationResult._(isValid: false, message: 'Agent code is inactive.');
}
