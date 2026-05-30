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
            SystemApi.Beep_Api(0)
            ParamUtils.init {
                SystemApi.Beep_Api(1)

                paramResultListener(
                    ParamResultListener.OnSuccess("Params Loaded successfully")
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
    fun pairDevice(activity: Activity, pairResultListener: (PairResultListener) -> Unit) {
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