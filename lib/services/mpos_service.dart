import 'dart:async';
import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import '../core/mpos/mpos_device_type.dart';

class MposService {
  static const MethodChannel _channel = MethodChannel('com.invify.app/mpos');
  
  static final StreamController<String> _progressController = StreamController<String>.broadcast();
  Stream<String> get progressStream => _progressController.stream;

  MposService() {
    _channel.setMethodCallHandler((call) async {
      if (call.method == 'onProgressUpdate') {
        final message = call.arguments['message'] as String;
        _progressController.add(message);
      }
    });
  }

  String _deviceTypeArg(String? deviceType) =>
      deviceType ?? MposDeviceType.channelValue(MposDeviceFamily.aisino);

  /// Initiates pairing with the assigned MPOS (Aisino VM30 or MoreFun MP63).
  Future<MposResult> pairDevice({
    String? posSerialNumber,
    String? deviceType,
  }) async {
    try {
      final result = await _channel.invokeMethod<Map<Object?, Object?>>(
        'pairDevice',
        {
          'posSerialNumber': posSerialNumber,
          'deviceType': _deviceTypeArg(deviceType),
        },
      );
      return MposResult.fromMap(result);
    } on PlatformException catch (e) {
      print('PlatformException: ${e.message}'); return MposResult(status: 'failure', message: e.message ?? 'Unknown Platform Exception');
    }
  }

  /// Loads parameters into the paired POS device.
  Future<MposResult> loadParams({
    String activeHost = 'MEDUSA',
    String? expressPayBaseUrl,
    String? expressPayAuthToken,
    String? ipAddress,
    String? portNumber,
    bool enableSsl = false,
    String? terminalId,
    String? key1,
    String? key2,
    int? timeoutSeconds,
    String? deviceType,
  }) async {
    try {
      final result = await _channel.invokeMethod<Map<Object?, Object?>>(
        'loadParams',
        {
          'activeHost': activeHost,
          'expressPayBaseUrl': expressPayBaseUrl,
          'expressPayAuthToken': expressPayAuthToken,
          'ipAddress': ipAddress,
          'portNumber': portNumber,
          'enableSsl': enableSsl,
          'terminalId': terminalId,
          'key1': key1,
          'key2': key2,
          'timeoutSeconds': timeoutSeconds,
          'deviceType': _deviceTypeArg(deviceType),
        },
      );
      return MposResult.fromMap(result);
    } on PlatformException catch (e) {
      return MposResult(status: 'failure', message: e.message ?? 'Unknown Platform Exception: ${e.code}');
    }
  }

  /// Initiates a payment on the POS device.
  ///
  /// [amount] The amount to charge (must be >= 1.00 except balance/reversal/refund).
  /// [terminalId] The terminal ID for the transaction.
  Future<MposTransactionResponse> initiatePayment({
    required double amount,
    String? terminalId,
    String activeHost = 'MEDUSA',
    bool processOnDevice = false,
    String? deviceType,
    String transactionType = 'PURCHASE',
    double cashbackAmount = 0,
    String? originalRrn,
    String? originalStan,
    double? latitude,
    double? longitude,
  }) async {
    try {
      final result = await _channel.invokeMethod<Map<Object?, Object?>>(
        'initiatePayment',
        {
          'amount': amount,
          'terminalId': terminalId,
          'activeHost': activeHost,
          'processOnDevice': processOnDevice,
          'deviceType': _deviceTypeArg(deviceType),
          'transactionType': transactionType,
          'cashbackAmount': cashbackAmount,
          if (originalRrn != null) 'originalRrn': originalRrn,
          if (originalStan != null) 'originalStan': originalStan,
          if (latitude != null) 'latitude': latitude,
          if (longitude != null) 'longitude': longitude,
        },
      );
      
      return MposTransactionResponse.fromMap(result);
    } on PlatformException catch (e) {
      return MposTransactionResponse(
        status: 'error',
        error: MposErrorData(message: e.message),
      );
    }
  }
  /// Card balance inquiry (MoreFun/MP63). Uses ISO proc 310000.
  Future<MposTransactionResponse> checkBalance({
    String? terminalId,
    String? deviceType,
  }) async {
    try {
      final result = await _channel.invokeMethod<Map<Object?, Object?>>(
        'checkBalance',
        {
          'terminalId': terminalId,
          'deviceType': _deviceTypeArg(deviceType),
        },
      );
      return MposTransactionResponse.fromMap(result);
    } on PlatformException catch (e) {
      return MposTransactionResponse(
        status: 'error',
        error: MposErrorData(message: e.message),
      );
    }
  }

  /// Gets the physical serial number of the paired MPOS device.
  Future<String?> getMposSerialNumber({String? deviceType}) async {
    try {
      final result = await _channel.invokeMethod<String>(
        'getMposSerialNumber',
        {'deviceType': _deviceTypeArg(deviceType)},
      );
      return result;
    } on PlatformException catch (e) {
      debugPrint('Failed to get MPOS serial number: ${e.message}');
      return null;
    }
  }

  /// Persists NIBSS Field 120 coordinates on the VM30 session.
  Future<Map<String, dynamic>> saveGeoCoordinates({
    required double latitude,
    required double longitude,
    String? deviceType,
  }) async {
    try {
      final result = await _channel.invokeMethod<Map<Object?, Object?>>(
        'saveGeoCoordinates',
        {
          'latitude': latitude,
          'longitude': longitude,
          'deviceType': _deviceTypeArg(deviceType),
        },
      );
      return Map<String, dynamic>.from(result ?? {});
    } on PlatformException catch (e) {
      return {'status': 'failure', 'message': e.message};
    }
  }

  /// Requests location (if provided) and stores coordinates for ISO Field 120.
  Future<Map<String, dynamic>> initGeofencing({
    double? latitude,
    double? longitude,
    String? deviceType,
  }) async {
    try {
      final result = await _channel.invokeMethod<Map<Object?, Object?>>(
        'initGeofencing',
        {
          if (latitude != null) 'latitude': latitude,
          if (longitude != null) 'longitude': longitude,
          'deviceType': _deviceTypeArg(deviceType),
        },
      );
      return Map<String, dynamic>.from(result ?? {});
    } on PlatformException catch (e) {
      return {'status': 'failure', 'message': e.message};
    }
  }

  /// Unpairs the MPOS device locally by clearing its address from the Android session manager.
  Future<MposResult> unpairDevice({String? deviceType}) async {
    try {
      final result = await _channel.invokeMethod<Map<Object?, Object?>>(
        'unpairDevice',
        {'deviceType': _deviceTypeArg(deviceType)},
      );
      return MposResult.fromMap(result);
    } on PlatformException catch (e) {
      print('PlatformException: ${e.message}'); return MposResult(status: 'failure', message: e.message ?? 'Unknown Platform Exception');
    }
  }
}

class MposResult {
  final String? status;
  final String? message;
  final Map<String, dynamic>? params;

  MposResult({this.status, this.message, this.params});

  factory MposResult.fromMap(Map<Object?, Object?>? map) {
    if (map == null) return MposResult();
    
    // Safely convert the inner map if it exists
    Map<String, dynamic>? parsedParams;
    if (map['params'] != null) {
      final rawParams = map['params'] as Map<Object?, Object?>;
      parsedParams = rawParams.map((key, value) => MapEntry(key.toString(), value));
    }

    return MposResult(
      status: map['status']?.toString(),
      message: map['message']?.toString(),
      params: parsedParams,
    );
  }
}

class MposTransactionResponse {
  final String? status;
  final MposErrorData? error;
  final MposTransactionData? transaction;
  final EmvData? emvData;

  MposTransactionResponse({
    this.status,
    this.error,
    this.transaction,
    this.emvData,
  });

  factory MposTransactionResponse.fromMap(Map<Object?, Object?>? map) {
    if (map == null) return MposTransactionResponse();
    
    return MposTransactionResponse(
      status: map['status']?.toString(),
      error: map['error'] != null 
          ? MposErrorData.fromMap(map['error'] as Map<Object?, Object?>) 
          : null,
      transaction: map['transaction'] != null 
          ? MposTransactionData.fromMap(map['transaction'] as Map<Object?, Object?>) 
          : null,
      emvData: map['emvData'] != null
          ? EmvData.fromMap(map['emvData'] as Map<Object?, Object?>)
          : null,
    );
  }
}

class MposErrorData {
  final String? message;
  
  MposErrorData({this.message});
  
  factory MposErrorData.fromMap(Map<Object?, Object?>? map) {
    if (map == null) return MposErrorData();
    return MposErrorData(
      message: map['message']?.toString(),
    );
  }
}

class EmvData {
  final Map<String, dynamic> data;

  EmvData(this.data);

  factory EmvData.fromMap(Map<Object?, Object?> map) {
    return EmvData(Map<String, dynamic>.from(map));
  }

  Map<String, dynamic> toJson() => data;
}

class MposTransactionData {
  final String? aid;
  final String? amount;
  final String? cashbackAmount;
  final String? appLabel;
  final String? authCode;
  final String? cardExpireDate;
  final String? cardHolderName;
  final String? dateTime;
  final String? maskedPan;
  final String? message;
  final String? rrn;
  final String? stan;
  final String? statusCode;
  final String? transactionType;
  final bool paymentSuccess;
  final String? balance;
  final String? currencyCode;

  MposTransactionData({
    this.aid,
    this.amount,
    this.cashbackAmount,
    this.appLabel,
    this.authCode,
    this.cardExpireDate,
    this.cardHolderName,
    this.dateTime,
    this.maskedPan,
    this.message,
    this.rrn,
    this.stan,
    this.statusCode,
    this.transactionType,
    this.paymentSuccess = false,
    this.balance,
    this.currencyCode,
  });

  factory MposTransactionData.fromMap(Map<Object?, Object?> map) {
    return MposTransactionData(
      aid: map['aid']?.toString(),
      amount: map['amount']?.toString(),
      cashbackAmount: map['cashbackAmount']?.toString(),
      appLabel: map['appLabel']?.toString(),
      authCode: map['authCode']?.toString(),
      cardExpireDate: map['cardExpireDate']?.toString(),
      cardHolderName: map['cardHolderName']?.toString(),
      dateTime: map['dateTime']?.toString(),
      maskedPan: map['maskedPan']?.toString(),
      message: map['message']?.toString(),
      rrn: map['rrn']?.toString(),
      stan: map['stan']?.toString(),
      statusCode: map['statusCode']?.toString(),
      transactionType: map['transactionType']?.toString(),
      paymentSuccess: map['paymentSuccess'] == true,
      balance: map['balance']?.toString(),
      currencyCode: map['currencyCode']?.toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'aid': aid,
      'amount': amount,
      'cashbackAmount': cashbackAmount,
      'appLabel': appLabel,
      'authCode': authCode,
      'cardExpireDate': cardExpireDate,
      'cardHolderName': cardHolderName,
      'dateTime': dateTime,
      'maskedPan': maskedPan,
      'message': message,
      'rrn': rrn,
      'stan': stan,
      'statusCode': statusCode,
      'transactionType': transactionType,
      'paymentSuccess': paymentSuccess,
      'balance': balance,
      'currencyCode': currencyCode,
    };
  }
}
