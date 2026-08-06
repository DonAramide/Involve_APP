package com.invify.invoice_app

import android.os.Handler
import android.os.Looper
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import com.demo.mpossdk.open.MposSdk
import com.demo.mpossdk.open.PairResultListener
import com.demo.mpossdk.open.ParamResultListener
import com.demo.mpossdk.open.PaymentRequest
import com.demo.mpossdk.open.TransactionResultListener
import com.invify.morefunsdk.open.MoreFunMposSdk

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.invify.app/mpos"
    private lateinit var mposChannel: MethodChannel

    // ── Kept at class level so the lambda stored in MposSdk.transactionListener
    //    can resolve it after ProcessingTransactionActivity finishes.
    private var pendingPaymentResult: MethodChannel.Result? = null
    private var resultReplied = false   // guard against double-resolve

    private val mainHandler = Handler(Looper.getMainLooper())

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        
        mposChannel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL)
        mposChannel.setMethodCallHandler { call, result ->
            val deviceType = (call.argument<String>("deviceType") ?: "AISINO").uppercase()
            val isMoreFun = isMoreFunDevice(deviceType)

            when (call.method) {
                "pairDevice" -> {
                    val posSerialNumber = call.argument<String>("posSerialNumber")
                    if (isMoreFun) {
                        MoreFunMposSdk.pairDevice(this, posSerialNumber) { status, message ->
                            mainHandler.post {
                                result.success(mapOf(
                                    "status" to status,
                                    "message" to message
                                ))
                            }
                        }
                    } else {
                        MposSdk.pairDevice(this, posSerialNumber) { listener ->
                            when (listener) {
                                is PairResultListener.OnSuccess -> {
                                    mainHandler.post {
                                        result.success(mapOf(
                                            "status" to "success",
                                            "message" to listener.message
                                        ))
                                    }
                                }
                                is PairResultListener.OnFailure -> {
                                    mainHandler.post {
                                        result.success(mapOf(
                                            "status" to "failure",
                                            "message" to listener.errorData.message
                                        ))
                                    }
                                }
                            }
                        }
                    }
                }
                "unpairDevice" -> {
                    if (isMoreFun) {
                        MoreFunMposSdk.unpairDevice(this)
                    } else {
                        MposSdk.unpairDevice(this)
                    }
                    result.success(mapOf("status" to "success"))
                }
                "getMposSerialNumber" -> {
                    val serialNumber = if (isMoreFun) {
                        MoreFunMposSdk.getMposSerialNumber(this)
                    } else {
                        MposSdk.getMposSerialNumber(this)
                    }
                    result.success(serialNumber)
                }
                "getHardwareSerial" -> {
                    try {
                        var serial = ""
                        try {
                            val c = Class.forName("android.os.SystemProperties")
                            val get = c.getMethod("get", String::class.java)
                            val props = arrayOf("ril.serialnumber", "ro.serialno", "ro.boot.serialno", "sys.serialnumber")
                            for (prop in props) {
                                serial = get.invoke(c, prop) as String
                                if (serial.isNotEmpty() && !serial.equals("unknown", ignoreCase = true) && !serial.equals("M1AJQ", ignoreCase = true)) {
                                    break
                                }
                            }
                        } catch (ignored: Exception) {}

                        if (serial.isEmpty() || serial.equals("unknown", ignoreCase = true) || serial.equals("M1AJQ", ignoreCase = true)) {
                            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                                serial = android.os.Build.getSerial()
                            } else {
                                @Suppress("DEPRECATION")
                                serial = android.os.Build.SERIAL
                            }
                        }
                        result.success(serial)
                    } catch (e: SecurityException) {
                        val androidId = android.provider.Settings.Secure.getString(contentResolver, android.provider.Settings.Secure.ANDROID_ID)
                        result.success(androidId)
                    } catch (e: Exception) {
                        val androidId = android.provider.Settings.Secure.getString(contentResolver, android.provider.Settings.Secure.ANDROID_ID)
                        result.success(androidId)
                    }
                }
                "loadParams" -> {
                    if (isMoreFun) {
                        val terminalId = call.argument<String>("terminalId")
                        val ipAddress = call.argument<String>("ipAddress")
                        val portNumber = call.argument<String>("portNumber")
                        val enableSsl = call.argument<Boolean>("enableSsl") ?: true
                        val key1 = call.argument<String>("key1")
                        val key2 = call.argument<String>("key2")

                        MoreFunMposSdk.loadParams(
                            this,
                            terminalId,
                            ipAddress,
                            portNumber,
                            enableSsl,
                            key1,
                            key2,
                            MoreFunMposSdk.ProgressCallback { message ->
                                mainHandler.post {
                                    mposChannel.invokeMethod("onProgressUpdate", mapOf("message" to message))
                                }
                            },
                            MoreFunMposSdk.LoadParamsCallback { status, message, params ->
                                mainHandler.post {
                                    val resultMap = mutableMapOf<String, Any?>(
                                        "status" to status,
                                        "message" to message
                                    )
                                    if (params != null) resultMap["params"] = params
                                    result.success(resultMap)
                                }
                            }
                        )
                    } else {
                        val activeHostStr = call.argument<String>("activeHost") ?: "MEDUSA"
                        val activeHost = try {
                            com.demo.mpossdk.open.ActiveHost.valueOf(activeHostStr.uppercase())
                        } catch (e: Exception) {
                            com.demo.mpossdk.open.ActiveHost.MEDUSA
                        }
                        val expressPayBaseUrl = call.argument<String>("expressPayBaseUrl")
                        val expressPayAuthToken = call.argument<String>("expressPayAuthToken")
                        val ipAddress = call.argument<String>("ipAddress")
                        val portNumber = call.argument<String>("portNumber")
                        val enableSsl = call.argument<Boolean>("enableSsl") ?: false
                        val terminalId = call.argument<String>("terminalId")
                        val key1 = call.argument<String>("key1")
                        val timeoutSeconds = call.argument<Int>("timeoutSeconds")

                        val request = com.demo.mpossdk.open.KeyExchangeRequest(
                            terminalId = terminalId,
                            ipAddress = ipAddress,
                            portNumber = portNumber,
                            enableSsl = enableSsl,
                            activeHost = activeHost,
                            expressPayBaseUrl = expressPayBaseUrl,
                            expressPayAuthToken = expressPayAuthToken,
                            key1 = key1,
                            timeoutSeconds = timeoutSeconds
                        )

                        MposSdk.loadParams(request) { listener ->
                            when (listener) {
                                is ParamResultListener.OnSuccess -> {
                                    mainHandler.post {
                                        val resultMap = mutableMapOf<String, Any>(
                                            "status" to "success",
                                            "message" to listener.message
                                        )
                                        listener.params?.let {
                                            resultMap["params"] = it
                                        }
                                        result.success(resultMap)
                                    }
                                }
                                is ParamResultListener.OnFailure -> {
                                    mainHandler.post {
                                        result.success(mapOf(
                                            "status" to "failure",
                                            "message" to listener.errorData.message
                                        ))
                                    }
                                }
                                is ParamResultListener.OnProgress -> {
                                    mainHandler.post {
                                        mposChannel.invokeMethod("onProgressUpdate", mapOf("message" to listener.message))
                                    }
                                }
                                is ParamResultListener.onLoading -> {
                                    // Ignore — MethodChannel expects exactly one reply.
                                }
                            }
                        }
                    }
                }
                "initiatePayment" -> {
                    val amount     = call.argument<Double>("amount")     ?: 0.0
                    val terminalId = call.argument<String>("terminalId") ?: ""

                    if (isMoreFun) {
                        pendingPaymentResult = result
                        resultReplied = false
                        MoreFunMposSdk.initiatePayment(
                            this,
                            amount,
                            terminalId,
                            MoreFunMposSdk.ProgressCallback { message ->
                                mainHandler.post {
                                    mposChannel.invokeMethod("onProgressUpdate", mapOf("message" to message))
                                }
                            },
                            MoreFunMposSdk.PaymentCallback { responseMap ->
                                mainHandler.post {
                                    if (!resultReplied) {
                                        resultReplied = true
                                        pendingPaymentResult?.success(responseMap)
                                        pendingPaymentResult = null
                                    }
                                }
                            }
                        )
                    } else {
                        val activeHostStr = call.argument<String>("activeHost") ?: "MEDUSA"
                        val activeHost = try {
                            com.demo.mpossdk.open.ActiveHost.valueOf(activeHostStr.uppercase())
                        } catch (e: Exception) {
                            com.demo.mpossdk.open.ActiveHost.MEDUSA
                        }
                        val processOnDevice = call.argument<Boolean>("processOnDevice") ?: false

                        pendingPaymentResult = result
                        resultReplied = false

                        val paymentRequest = PaymentRequest(
                            amount = amount, 
                            terminalId = terminalId, 
                            activeHost = activeHost,
                            processOnDevice = processOnDevice
                        )

                        MposSdk.initiatePayment(this, paymentRequest) { listener ->
                            when (listener) {
                                is TransactionResultListener.OnCompleted -> {
                                    val txResult = listener.result
                                    
                                    if (processOnDevice && txResult.status == "emv_data_ready") {
                                        return@initiatePayment
                                    }

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
                                            "iccData"                      to emvData.iccData,
                                            "cardNo"                       to emvData.cardNo,
                                            "cardSequenceNumber"            to emvData.cardSequenceNumber,
                                            "cardExpirationDate"            to emvData.cardExpirationDate,
                                            "appCryptogram"                 to emvData.appCryptogram,
                                            "cryptogramInformationData"     to emvData.cryptogramInformationData,
                                            "issuerApplicationData"         to emvData.issuerApplicationData,
                                            "unpredictableNumber"           to emvData.unpredictableNumber,
                                            "appTransactionCounter"         to emvData.appTransactionCounter,
                                            "terminalVerificationResults"   to emvData.terminalVerificationResults,
                                            "transactionDate"               to emvData.transactionDate,
                                            "transactionType"               to emvData.transactionType,
                                            "amountAuthorisedNumeric"       to emvData.amountAuthorisedNumeric,
                                            "transactionCurrencyCode"       to emvData.transactionCurrencyCode,
                                            "applicationInterchangeProfile" to emvData.applicationInterchangeProfile,
                                            "terminalCountryCode"           to emvData.terminalCountryCode,
                                            "amountOtherNumeric"            to emvData.amountOtherNumeric,
                                            "additionalTerminalCapabilities" to emvData.additionalTerminalCapabilities,
                                            "ecIssuerAuthorizationCode"     to emvData.ecIssuerAuthorizationCode,
                                            "cvmResult"                     to emvData.cvmResult,
                                            "terminalType"                  to emvData.terminalType,
                                            "dedicatedFileName"             to emvData.dedicatedFileName,
                                            "appVersionNumberTerminal"      to emvData.appVersionNumberTerminal,
                                            "transactionSequenceCounter"    to emvData.transactionSequenceCounter,
                                            "issuerAuthenticationData"      to emvData.issuerAuthenticationData,
                                            "issuerScriptTemplate1"         to emvData.issuerScriptTemplate1,
                                            "issuerScriptTemplate2"         to emvData.issuerScriptTemplate2,
                                            "scriptExecuteRslt"             to emvData.scriptExecuteRslt,
                                            "authorisationResponseCode"     to emvData.authorisationResponseCode,
                                            "chipSerialNo"                  to emvData.chipSerialNo,
                                            "pinBlock"                      to emvData.pinBlock,
                                            "terminalCapabilities"          to emvData.terminalCapabilities,
                                            "track2Data"                    to emvData.track2Data,
                                            "transactionTime"               to emvData.transactionTime,
                                            "pointOfServiceEntryMode"       to emvData.pointOfServiceEntryMode,
                                            "appPreferredName"              to emvData.appPreferredName,
                                            "applicationLabel"              to emvData.applicationLabel,
                                            "ksn"                           to emvData.ksn,
                                            "aid"                           to emvData.aid,
                                            "cardHolderName"                to emvData.cardHolderName,
                                            "cardHolderCertNo"              to emvData.cardHolderCertNo,
                                            "cardHolderCertType"            to emvData.cardHolderCertType,
                                            "offlinePwdCount"               to emvData.offlinePwdCount,
                                            "pinType"                       to emvData.pinType,
                                            "serviceCode"                   to emvData.serviceCode,
                                            "pinVerificationValue"          to emvData.pinVerificationValue,
                                            "cardVerificationValue"         to emvData.cardVerificationValue,
                                            "acquirerInstitutionId"         to emvData.acquirerInstitutionId,
                                            "terminalId"                    to emvData.terminalId,
                                            "packedIsoMessage"              to emvData.packedIsoMessage,
                                            "serverIP"                      to emvData.serverIP,
                                            "port"                          to emvData.port
                                        )
                                    }

                                    if (txResult.mposTransactionResponse != null) {
                                        val txRes = txResult.mposTransactionResponse!!
                                        responseMap["transaction"] = mapOf(
                                            "aid"             to txRes.aid,
                                            "amount"          to txRes.amount,
                                            "cashbackAmount"  to txRes.cashbackAmount,
                                            "appLabel"        to txRes.appLabel,
                                            "authCode"        to txRes.authCode,
                                            "cardExpireDate"  to txRes.cardExpireDate,
                                            "cardHolderName"  to txRes.cardHolderName,
                                            "dateTime"        to txRes.dateTime,
                                            "maskedPan"       to txRes.maskedPan,
                                            "message"         to txRes.message,
                                            "rrn"             to txRes.rrn,
                                            "stan"            to txRes.stan,
                                            "statusCode"      to txRes.statusCode,
                                            "transactionType" to txRes.transactionType,
                                            "paymentSuccess"  to txRes.paymentSuccess()
                                        )
                                    }

                                    mainHandler.post {
                                        if (!resultReplied) {
                                            resultReplied = true
                                            pendingPaymentResult?.success(responseMap)
                                            pendingPaymentResult = null
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
                "checkBalance" -> {
                    val terminalId = call.argument<String>("terminalId") ?: ""
                    if (!isMoreFun) {
                        result.success(mapOf(
                            "status" to "error",
                            "error" to mapOf(
                                "message" to "Check balance is currently supported on MoreFun/MP63 devices only."
                            )
                        ))
                        return@setMethodCallHandler
                    }
                    pendingPaymentResult = result
                    resultReplied = false
                    MoreFunMposSdk.checkBalance(
                        this,
                        terminalId,
                        MoreFunMposSdk.ProgressCallback { message ->
                            mainHandler.post {
                                mposChannel.invokeMethod("onProgressUpdate", mapOf("message" to message))
                            }
                        },
                        MoreFunMposSdk.PaymentCallback { responseMap ->
                            mainHandler.post {
                                if (!resultReplied) {
                                    resultReplied = true
                                    pendingPaymentResult?.success(responseMap)
                                    pendingPaymentResult = null
                                }
                            }
                        }
                    )
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    private fun isMoreFunDevice(deviceType: String): Boolean {
        val t = deviceType.uppercase().replace(" ", "").replace("-", "").replace("_", "")
        return t.contains("MOREFUN") || t.contains("MP63") || t == "MPOSDIRECT"
    }
}
