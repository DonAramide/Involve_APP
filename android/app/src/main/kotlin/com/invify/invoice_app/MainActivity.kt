package com.invify.invoice_app

import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import com.demo.mpossdk.open.MposSdk
import com.demo.mpossdk.open.PairResultListener
import com.demo.mpossdk.open.ParamResultListener
import com.demo.mpossdk.open.PaymentRequest
import com.demo.mpossdk.open.TransactionResultListener

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.invify.app/mpos"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "pairDevice" -> {
                    MposSdk.pairDevice(this) { listener ->
                        when (listener) {
                            is PairResultListener.OnSuccess -> {
                                result.success(mapOf(
                                    "status" to "success",
                                    "message" to listener.message
                                ))
                            }
                            is PairResultListener.OnFailure -> {
                                result.success(mapOf(
                                    "status" to "failure",
                                    "message" to listener.errorData.message
                                ))
                            }
                        }
                    }
                }
                "loadParams" -> {
                    MposSdk.loadParams { listener ->
                        when (listener) {
                            is ParamResultListener.OnSuccess -> {
                                result.success(mapOf(
                                    "status" to "success",
                                    "message" to listener.message
                                ))
                            }
                            is ParamResultListener.OnFailure -> {
                                result.success(mapOf(
                                    "status" to "failure",
                                    "message" to listener.errorData.message
                                ))
                            }
                            is ParamResultListener.onLoading -> {
                                // Dart layer can handle loading state if necessary, but MethodChannel expects 1 result.
                                // We'll ignore the loading emission and only reply on success or failure.
                            }
                        }
                    }
                }
                "initiatePayment" -> {
                    val amount = call.argument<Double>("amount") ?: 0.0
                    val terminalId = call.argument<String>("terminalId") ?: ""
                    
                    val paymentRequest = PaymentRequest(amount = amount, terminalId = terminalId)
                    
                    MposSdk.initiatePayment(this, paymentRequest) { listener ->
                        when (listener) {
                            is TransactionResultListener.OnCompleted -> {
                                val txResult = listener.result
                                val responseMap = mutableMapOf<String, Any?>()
                                
                                responseMap["status"] = txResult.status
                                
                                if (txResult.errorData != null) {
                                    responseMap["error"] = mapOf(
                                        "message" to txResult.errorData?.message
                                    )
                                }
                                
                                if (txResult.mposTransactionResponse != null) {
                                    val txRes = txResult.mposTransactionResponse!!
                                    responseMap["transaction"] = mapOf(
                                        "aid" to txRes.aid,
                                        "amount" to txRes.amount,
                                        "cashbackAmount" to txRes.cashbackAmount,
                                        "appLabel" to txRes.appLabel,
                                        "authCode" to txRes.authCode,
                                        "cardExpireDate" to txRes.cardExpireDate,
                                        "cardHolderName" to txRes.cardHolderName,
                                        "dateTime" to txRes.dateTime,
                                        "maskedPan" to txRes.maskedPan,
                                        "message" to txRes.message,
                                        "rrn" to txRes.rrn,
                                        "stan" to txRes.stan,
                                        "statusCode" to txRes.statusCode,
                                        "transactionType" to txRes.transactionType,
                                        "paymentSuccess" to txRes.paymentSuccess()
                                    )
                                }
                                
                                result.success(responseMap)
                            }
                        }
                    }
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }
}
