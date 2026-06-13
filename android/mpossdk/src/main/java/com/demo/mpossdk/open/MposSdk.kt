package com.demo.mpossdk.open

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import androidx.annotation.Keep
import com.demo.mpossdk.BuildConfig
import com.demo.mpossdk.internal.data.ServiceLocator
import com.demo.mpossdk.internal.emv.ParamUtils
import com.demo.mpossdk.internal.ui.ConnectingDeviceActivity
import com.demo.mpossdk.internal.ui.DownloadParameterActivity
import com.demo.mpossdk.internal.ui.processing.ProcessingTransactionActivity
import com.demo.mpossdk.internal.utils.LogUtil
import com.vanstone.vm20sdk.api.SystemApi
import com.vanstone.vm20sdk.struct.DateUser
import com.vanstone.vm20sdk.struct.TimeUser
import com.vanstone.vm20sdk.utils.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import java.util.Calendar
import java.util.Date

@Keep
object MposSdk {
    @JvmField
    var paymentRequest: PaymentRequest? = null
    lateinit var transactionListener: (TransactionResultListener) -> Unit
    lateinit var pairResultListener: (PairResultListener) -> Unit
    private lateinit var coroutineScope: CoroutineScope
    private var appContext: Context? = null
    private var deviceInit = false
    private var deviceMac: String? = null

    /**
     * Initializes the mPOS device.
     * This function calls the SystemInit_Api() method of the SystemApi class
     * to initialize the mPOS device.
     *
     * This function should be called in the onCreate() of your Application class
     */
    fun initMposDevice(context: Context) {
        appContext = context.applicationContext
        val serviceLocator = ServiceLocator.getInstance(context)
        coroutineScope = serviceLocator.provideCoroutineScope()
        deviceMac = serviceLocator.provideSessionManager().getDeviceMac()

        SystemApi.SystemInit_Api()
        Log.setLogFlag(BuildConfig.DEBUG)
        deviceInit = true
        LogUtil.i("Device Initialized")
    }

    /**
     * Returns the physical MPOS Serial Number (which is broadcasted as its Bluetooth Name)
     * saved during the pairing process.
     */
    fun getMposSerialNumber(context: Context): String? {
        val serviceLocator = ServiceLocator.getInstance(context)
        return serviceLocator.provideSessionManager().getDeviceName()
    }

    /**
     * Unpairs the MPOS device by clearing its MAC address and Name from the session manager.
     */
    fun unpairDevice(context: Context) {
        val serviceLocator = ServiceLocator.getInstance(context)
        serviceLocator.provideSessionManager().clearDevice()
        deviceMac = null
    }

    /**
     * Loads necessary parameters for the mPOS device.
     *
     * This function checks if the device has been initialized using [initMposDevice].
     * If not, it notifies the caller via [onParamLoaded] and returns.
     *
     * If the device is initialized, it launches a coroutine to:
     * 1. Emit a beep sound (SystemApi.Beep_Api(0)).
     * 2. Initialize parameters using ParamUtils.init, and upon completion:
     *    - Emit another beep sound (SystemApi.Beep_Api(1)).
     *    - Notify the caller of success via [onParamLoaded].
     *
     * if the pos device has already paired then it sets the mac address
     *
     * @param [paramResultListener] Callback to notify the caller about the result of the operation,
     *                      passing a boolean indicating success/failure and a message.
     */
    fun loadParams(paramResultListener: (ParamResultListener) -> Unit) {
        val request = KeyExchangeRequest(
            terminalId = "2214OTGF",
            activeHost = ActiveHost.MEDUSA
        )
        loadParams(request, paramResultListener)
    }

    fun loadParams(
        request: KeyExchangeRequest,
        paramResultListener: (ParamResultListener) -> Unit
    ) {
        paramResultListener(ParamResultListener.onLoading)

        if (!deviceInit) {
            paramResultListener(
                ParamResultListener.OnFailure(
                    ErrorData(
                        ErrorType.DEVICE_NOT_INITIALIZED,
                        "Device has not been initialized, call [initMposDevice] first"
                    )
                )
            )
            return
        }

        val context = appContext ?: return
        val serviceLocator = ServiceLocator.getInstance(context)
        deviceMac = serviceLocator.provideSessionManager().getDeviceMac()

        if (deviceMac == null) {
            paramResultListener(
                ParamResultListener.OnFailure(
                    ErrorData(
                        ErrorType.DEVICE_NOT_PAIRED,
                        "POS Device has not been paired. Kindly pair and try again"
                    )
                )
            )
            return
        }

        SystemApi.setMacAddr(deviceMac)

        coroutineScope.launch {
            try {
                val sessionManager = serviceLocator.provideSessionManager()

                val finalTerminalId = if (request.terminalId.isNullOrEmpty()) "2214OTGF" else request.terminalId
                
                val terminalParameters = when (request.activeHost) {
                    ActiveHost.MEDUSA -> {
                        com.demo.mpossdk.internal.domain.model.TerminalParameters(
                            terminalId = finalTerminalId,
                            activeHost = ActiveHost.MEDUSA,
                            serverIP = "core.medusang.com",
                            port = 8080,
                            timeoutSeconds = request.timeoutSeconds
                        )
                    }
                    ActiveHost.NIBSS -> {
                        val finalIp = if (request.ipAddress.isNullOrEmpty()) "196.6.103.18" else request.ipAddress
                        val finalPort = request.portNumber?.toIntOrNull() ?: 5001
                        val finalCtmk = if (request.key1.isNullOrEmpty()) "66D4AF3321D8564E9F6F35411755E730" else request.key1
                        com.demo.mpossdk.internal.domain.model.TerminalParameters(
                            terminalId = finalTerminalId,
                            ctmk = finalCtmk,
                            serverIP = finalIp,
                            port = finalPort,
                            enableSSL = true, // Required for NIBSS Prod
                            activeHost = ActiveHost.NIBSS,
                            timeoutSeconds = request.timeoutSeconds ?: 3600 // 60 mins fallback
                        )
                    }
                    ActiveHost.EXPRESS_PAY -> {
                        val finalBaseUrl = if (request.expressPayBaseUrl.isNullOrEmpty() || request.expressPayBaseUrl == "[SECRET_MASKED]") {
                            "http://80.88.8.56:552/api/GetPlainMasterKey"
                        } else {
                            request.expressPayBaseUrl.trim()
                        }

                        val finalAuthToken = if (request.expressPayAuthToken.isNullOrEmpty() || request.expressPayAuthToken == "[SECRET_MASKED]") {
                            "RXRyYW56YWN0UE9TOjdkNjY1YjgxLWQwZDctNDBhZS04Zjc5LWI2Yjg4MzVmOGZjMw=="
                        } else {
                            request.expressPayAuthToken.trim()
                        }

                        val finalIp = if (request.ipAddress.isNullOrEmpty()) "196.6.103.18" else request.ipAddress
                        val finalPort = request.portNumber?.toIntOrNull() ?: 4018

                        com.demo.mpossdk.internal.domain.model.TerminalParameters(
                            terminalId = finalTerminalId,
                            ctmk = request.key1 ?: "",
                            serverIP = finalIp,
                            port = finalPort,
                            enableSSL = request.enableSsl,
                            activeHost = ActiveHost.EXPRESS_PAY,
                            expressPayBaseUrl = finalBaseUrl,
                            expressPayAuthToken = finalAuthToken,
                            timeoutSeconds = request.timeoutSeconds
                        )
                    }
                }
                
                sessionManager.saveTerminalParameters(terminalParameters)

                if (request.activeHost == ActiveHost.MEDUSA) {
                    SystemApi.Beep_Api(0)
                    ParamUtils.init(terminalParameters) {
                        SystemApi.Beep_Api(1)
                        paramResultListener(ParamResultListener.OnSuccess("Params Loaded successfully"))
                    }
                } else {

                    val keyExchangeHandler = serviceLocator.provideKeyExchangeHandler()
                    
                    var collectJob: kotlinx.coroutines.Job? = null
                    collectJob = launch {
                        keyExchangeHandler.keyExchangeResultFlow.collect { result ->
                            when (result) {
                                is com.demo.mpossdk.internal.iso8583.KeyExchangeResult.Error -> {
                                    paramResultListener(
                                        ParamResultListener.OnFailure(
                                            ErrorData(
                                                ErrorType.UNKNOWN_ERROR,
                                                result.message
                                            )
                                        )
                                    )
                                    collectJob?.cancel()
                                }
                                is com.demo.mpossdk.internal.iso8583.KeyExchangeResult.Loading -> {
                                    paramResultListener(ParamResultListener.onLoading)
                                }
                                is com.demo.mpossdk.internal.iso8583.KeyExchangeResult.Progress -> {
                                    paramResultListener(ParamResultListener.OnProgress(result.message))
                                }
                                is com.demo.mpossdk.internal.iso8583.KeyExchangeResult.OnSuccess -> {
                                    val latestParams = sessionManager.getTerminalParameters() ?: terminalParameters
                                    var attempts = 0
                                    val maxAttempts = 6
                                    var success = false

                                    while (attempts < maxAttempts && !success) {
                                        attempts++
                                        paramResultListener(ParamResultListener.OnProgress("Injecting Keys (Attempt $attempts/$maxAttempts)..."))
                                        try {
                                            SystemApi.Beep_Api(0)
                                            ParamUtils.init(latestParams) {
                                                success = true
                                                SystemApi.Beep_Api(1)
                                                paramResultListener(ParamResultListener.OnSuccess("Params Loaded successfully"))
                                            }
                                        } catch (e: Exception) {
                                            android.util.Log.e("MposSdk", "Bluetooth injection failed on attempt $attempts", e)
                                        }

                                        if (success) {
                                            break
                                        }

                                        if (attempts >= maxAttempts) {
                                            paramResultListener(
                                                ParamResultListener.OnFailure(
                                                    ErrorData(
                                                        ErrorType.UNKNOWN_ERROR,
                                                        "Bluetooth connection to MPOS device failed. Please ensure the device is on and nearby."
                                                    )
                                                )
                                            )
                                        } else {
                                            kotlinx.coroutines.delay(2000)
                                        }
                                    }
                                    collectJob?.cancel()
                                }
                            }
                        }
                    }
                    
                    keyExchangeHandler.startKeyExchangeTransaction()
                }
            } catch (e: Exception) {
                android.util.Log.e("flutter", "[NATIVE CRASH] Error in loadParams coroutine: ", e)
                paramResultListener(
                    ParamResultListener.OnFailure(
                        ErrorData(ErrorType.UNKNOWN_ERROR, "Native Key Exchange crashed: ${e.message}")
                    )
                )
            }
        }
    }

    /**
     * Initiates the device pairing process.
     * This function checks if the device has been initialized.
     * If not, it immediately invokes the pairResultListener with an OnFailure result indicating that the device is not initialized.
     * If the device is initialized, it stores the provided pairResultListener and starts the ConnectingDeviceActivity to handle the actual pairing process.
     * Params:
     * [activity] - The Activity from which the pairing process is initiated.
     * [pairResultListener] - A callback function to receive the result of the pairing attempt.
     */
    fun pairDevice(activity: Activity, posSerialNumber: String? = null, pairResultListener: (PairResultListener) -> Unit) {
        if (!deviceInit) {
            pairResultListener(
                PairResultListener.OnFailure(
                    ErrorData(
                        ErrorType.DEVICE_NOT_INITIALIZED,
                        "Device has not been initialized, call [initMposDevice] first"
                    )
                )
            )
            return
        }

        this.pairResultListener = pairResultListener

        val intent = Intent(activity, ConnectingDeviceActivity::class.java)
        if (posSerialNumber != null) {
            intent.putExtra("posSerialNumber", posSerialNumber)
        }
        activity.startActivity(intent)
    }

    /**
     * Initiates a payment transaction.
     *
     * This function performs pre-payment checks:
     * - Verifies if the mPOS device has been initialized using [initMposDevice]. If not, it notifies the
     *   [transactionListener] with an [ErrorType.DEVICE_NOT_INITIALIZED] error and returns.
     * - Checks if a POS device has been paired. If not, it notifies the [transactionListener] with an
     *   [ErrorType.DEVICE_NOT_PAIRED] error and returns.
     *
     * If both checks pass, it stores the [amount] and [transactionListener], then starts
     * [ConnectingDeviceActivity] to proceed with the payment process.
     *
     * @param activity The Activity initiating the payment.
     * @param amount The amount to be charged for the transaction.
     * @param transactionListener A callback to receive the result of the transaction initiation attempt.
     */
    fun initiatePayment(
        activity: Activity,
        paymentRequest: PaymentRequest,
        transactionListener: (TransactionResultListener) -> Unit
    ) {
        if (!deviceInit) {
            transactionListener(
                TransactionResultListener.OnCompleted(
                    TransactionResult(
                        status = "",
                        errorData = ErrorData(
                            ErrorType.DEVICE_NOT_INITIALIZED,
                            "Device has not been initialized, call [initMposDevice] first"
                        )
                    )
                )
            )
            return
        }

        if (paymentRequest.amount < 1.00) {
            transactionListener(
                TransactionResultListener.OnCompleted(
                    TransactionResult(
                        status = "",
                        errorData = ErrorData(
                            ErrorType.INVALID_REQUEST,
                            "Invalid amount, amount should not be less than 1 naira"
                        )
                    )
                )
            )
            return
        }

        if (paymentRequest.terminalId.isEmpty()) {
            transactionListener(
                TransactionResultListener.OnCompleted(
                    TransactionResult(
                        status = "",
                        errorData = ErrorData(
                            ErrorType.INVALID_REQUEST,
                            "Terminal ID cannot be empty"
                        )
                    )
                )
            )
            return
        }

        this.paymentRequest = paymentRequest
        this.transactionListener = transactionListener

        val intent = Intent(activity, ProcessingTransactionActivity::class.java)
        activity.startActivity(intent)
    }
}