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
                                
                                if (txResult.status == "emv_data_ready" && txResult.emvData != null) {
                                    val emvData = txResult.emvData!!
                                    responseMap["emvData"] = mapOf(
                                        "iccData" to emvData.iccData,
                                        "cardNo" to emvData.cardNo,
                                        "cardSequenceNumber" to emvData.cardSequenceNumber,
                                        "cardExpirationDate" to emvData.cardExpirationDate,
                                        "appCryptogram" to emvData.appCryptogram,
                                        "cryptogramInformationData" to emvData.cryptogramInformationData,
                                        "issuerApplicationData" to emvData.issuerApplicationData,
                                        "unpredictableNumber" to emvData.unpredictableNumber,
                                        "appTransactionCounter" to emvData.appTransactionCounter,
                                        "terminalVerificationResults" to emvData.terminalVerificationResults,
                                        "transactionDate" to emvData.transactionDate,
                                        "transactionType" to emvData.transactionType,
                                        "amountAuthorisedNumeric" to emvData.amountAuthorisedNumeric,
                                        "transactionCurrencyCode" to emvData.transactionCurrencyCode,
                                        "applicationInterchangeProfile" to emvData.applicationInterchangeProfile,
                                        "terminalCountryCode" to emvData.terminalCountryCode,
                                        "amountOtherNumeric" to emvData.amountOtherNumeric,
                                        "additionalTerminalCapabilities" to emvData.additionalTerminalCapabilities,
                                        "ecIssuerAuthorizationCode" to emvData.ecIssuerAuthorizationCode,
                                        "cvmResult" to emvData.cvmResult,
                                        "terminalType" to emvData.terminalType,
                                        "dedicatedFileName" to emvData.dedicatedFileName,
                                        "appVersionNumberTerminal" to emvData.appVersionNumberTerminal,
                                        "transactionSequenceCounter" to emvData.transactionSequenceCounter,
                                        "issuerAuthenticationData" to emvData.issuerAuthenticationData,
                                        "issuerScriptTemplate1" to emvData.issuerScriptTemplate1,
                                        "issuerScriptTemplate2" to emvData.issuerScriptTemplate2,
                                        "scriptExecuteRslt" to emvData.scriptExecuteRslt,
                                        "authorisationResponseCode" to emvData.authorisationResponseCode,
                                        "chipSerialNo" to emvData.chipSerialNo,
                                        "pinBlock" to emvData.pinBlock,
                                        "terminalCapabilities" to emvData.terminalCapabilities,
                                        "track2Data" to emvData.track2Data,
                                        "transactionTime" to emvData.transactionTime,
                                        "pointOfServiceEntryMode" to emvData.pointOfServiceEntryMode,
                                        "appPreferredName" to emvData.appPreferredName,
                                        "applicationLabel" to emvData.applicationLabel,
                                        "ksn" to emvData.ksn,
                                        "aid" to emvData.aid,
                                        "cardHolderName" to emvData.cardHolderName,
                                        "cardHolderCertNo" to emvData.cardHolderCertNo,
                                        "cardHolderCertType" to emvData.cardHolderCertType,
                                        "offlinePwdCount" to emvData.offlinePwdCount,
                                        "pinType" to emvData.pinType,
                                        "serviceCode" to emvData.serviceCode,
                                        "pinVerificationValue" to emvData.pinVerificationValue,
                                        "cardVerificationValue" to emvData.cardVerificationValue,
                                        "acquirerInstitutionId" to emvData.acquirerInstitutionId,
                                        "terminalId" to emvData.terminalId,
                                        "packedIsoMessage" to emvData.packedIsoMessage
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
