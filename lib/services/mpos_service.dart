import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';

class MposService {
  static const MethodChannel _channel = MethodChannel('com.invify.app/mpos');

  /// Initiates the pairing process with the Aisino POS device.
  Future<MposResult> pairDevice() async {
    try {
      final result = await _channel.invokeMethod<Map<Object?, Object?>>('pairDevice');
      return MposResult.fromMap(result);
    } on PlatformException catch (e) {
      return MposResult(status: 'failure', message: e.message);
    }
  }

  /// Loads parameters into the paired POS device.
  Future<MposResult> loadParams() async {
    try {
      final result = await _channel.invokeMethod<Map<Object?, Object?>>('loadParams');
      return MposResult.fromMap(result);
    } on PlatformException catch (e) {
      return MposResult(status: 'failure', message: e.message);
    }
  }

  /// Initiates a payment on the POS device.
  /// 
  /// [amount] The amount to charge (must be >= 1.00).
  /// [terminalId] The terminal ID for the transaction.
  Future<MposTransactionResponse> initiatePayment({
    required double amount,
    required String terminalId,
  }) async {
    try {
      final result = await _channel.invokeMethod<Map<Object?, Object?>>(
        'initiatePayment',
        {
          'amount': amount,
          'terminalId': terminalId,
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
}

class MposResult {
  final String? status;
  final String? message;

  MposResult({this.status, this.message});

  factory MposResult.fromMap(Map<Object?, Object?>? map) {
    if (map == null) return MposResult();
    return MposResult(
      status: map['status']?.toString(),
      message: map['message']?.toString(),
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
    );
  }
}
