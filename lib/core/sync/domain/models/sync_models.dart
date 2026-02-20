class SyncRecord {
  final String table;
  final Map<String, dynamic> data;
  final DateTime updatedAt;
  final bool isDeleted;

  SyncRecord({
    required this.table,
    required this.data,
    required this.updatedAt,
    this.isDeleted = false,
  });

  Map<String, dynamic> toJson() {
    return {
      'table': table,
      'data': data,
      'updatedAt': updatedAt.toIso8601String(),
      'isDeleted': isDeleted,
    };
  }

  factory SyncRecord.fromJson(Map<String, dynamic> json) {
    return SyncRecord(
      table: json['table'],
      data: json['data'],
      updatedAt: DateTime.parse(json['updatedAt']),
      isDeleted: json['isDeleted'] ?? false,
    );
  }
}

class SyncBatch {
  final String deviceId;
  final DateTime timestamp;
  final List<SyncRecord> records;

  SyncBatch({
    required this.deviceId,
    required this.timestamp,
    required this.records,
  });

  Map<String, dynamic> toJson() {
    return {
      'deviceId': deviceId,
      'timestamp': timestamp.toIso8601String(),
      'records': records.map((r) => r.toJson()).toList(),
    };
  }

  factory SyncBatch.fromJson(Map<String, dynamic> json) {
    return SyncBatch(
      deviceId: json['deviceId'],
      timestamp: DateTime.parse(json['timestamp']),
      records: (json['records'] as List).map((r) => SyncRecord.fromJson(r)).toList(),
    );
  }
}
