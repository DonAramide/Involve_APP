package com.demo.mpossdk.internal.ui.processing

import android.Manifest
import android.bluetooth.BluetoothManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.core.view.isVisible
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.demo.mpossdk.databinding.ActivityProcessingTransactionBinding
import com.demo.mpossdk.internal.data.ServiceLocator
import com.demo.mpossdk.internal.domain.model.ConnectionMode
import com.demo.mpossdk.internal.domain.repository.SessionManager
import com.demo.mpossdk.internal.utils.AmountUtils
import com.demo.mpossdk.internal.utils.LogUtil
import com.demo.mpossdk.internal.utils.showAlertDialog
import com.demo.mpossdk.open.MposSdk
import com.demo.mpossdk.open.TransactionResult
import com.demo.mpossdk.open.TransactionResultListener
import com.vanstone.vm20sdk.api.SystemApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

internal class ProcessingTransactionActivity : AppCompatActivity() {
    private lateinit var binding: ActivityProcessingTransactionBinding
    private lateinit var coroutineScope: CoroutineScope
    private lateinit var viewModel: ProcessingViewModel
    private var backPressCount = 0
    private var stopPromptVisible = false
    private var cancelRequested = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityProcessingTransactionBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val serviceLocator = ServiceLocator.getInstance(this)
        val sessionManager = serviceLocator.provideSessionManager()
        coroutineScope = serviceLocator.provideCoroutineScope()
        val isoMessageBuilder = serviceLocator.provideIsoMessageBuilder()
        val socketChannel = serviceLocator.provideSocketChannel()

        val viewModelFactory = ProcessingViewModelFactory(
            sessionManager,
            coroutineScope,
            isoMessageBuilder,
            socketChannel
        )
        viewModel = ViewModelProvider(this, viewModelFactory)[ProcessingViewModel::class.java]
        val request = MposSdk.paymentRequest!!
        binding.tvProcessingAction.text = "Checking device..."
        lifecycleScope.launch {
            val ready = ensureReaderPaired(sessionManager)
            if (!ready) {
                showAlertDialog(
                    message = "POS device did not respond. Pair the reader and try again.",
                    showNegativeButton = false
                ) {
                    finish()
                }
                return@launch
            }
            viewModel.startTransaction(request)
        }

        val isBalance = request.transactionType.uppercase().contains("BALANCE")
        if (isBalance) {
            binding.tvTransactionTitle.text = "Check Balance"
            binding.tvTransactionAmount.isVisible = false
        } else {
            binding.tvTransactionTitle.text = "Purchase Amount"
            binding.tvTransactionAmount.text =
                "NGN ${AmountUtils.formatToTwoDecimalPlaces(request.amount.toString())}"
        }

        observeViewModel()
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (stopPromptVisible || cancelRequested) return
                backPressCount += 1
                if (backPressCount < 3) return
                backPressCount = 0
                askToStopTransaction()
            }
        })
    }

    private fun askToStopTransaction() {
        stopPromptVisible = true
        showAlertDialog(
            title = "Stop transaction?",
            message = "Do you want to stop this transaction?",
            positiveTitle = "Stop",
            negativeTitle = "Continue",
            showNegativeButton = true
        ) { confirmed ->
            stopPromptVisible = false
            if (!confirmed) return@showAlertDialog
            requestCancel()
        }
    }

    private fun requestCancel() {
        if (cancelRequested) return
        cancelRequested = true
        binding.tvProcessingAction.text = "Stopping transaction..."
        lifecycleScope.launch {
            viewModel.cancelTransaction()
        }
    }

    /**
     * Ping the saved reader. If it stays silent for 2 seconds, pair the first
     * bonded Bluetooth device and ping once more.
     */
    private suspend fun ensureReaderPaired(sessionManager: SessionManager): Boolean {
        val savedMac = sessionManager.getDeviceMac()
        if (!savedMac.isNullOrBlank()) {
            SystemApi.setMacAddr(savedMac)
            if (readerRespondsWithin(2_000)) return true
        }

        binding.tvProcessingAction.text = "Pairing device..."
        val device = firstBondedDevice() ?: return false
        LogUtil.i("Auto-pairing first reader ${device.name} [${device.address}]")
        sessionManager.setDeviceName(device.name ?: "")
        sessionManager.setDeviceMac(device.address)
        sessionManager.setConnectionMode(ConnectionMode.BLUETOOTH)
        SystemApi.setMacAddr(device.address)
        return readerRespondsWithin(2_000)
    }

    private suspend fun readerRespondsWithin(timeoutMs: Long): Boolean {
        return withTimeoutOrNull(timeoutMs) {
            withContext(Dispatchers.IO) {
                SystemApi.Beep_Api(0)
                true
            }
        } == true
    }

    private fun firstBondedDevice(): android.bluetooth.BluetoothDevice? {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
            ContextCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT)
            != PackageManager.PERMISSION_GRANTED
        ) {
            return null
        }
        val adapter = (getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager).adapter
            ?: return null
        if (!adapter.isEnabled) return null
        return try {
            adapter.bondedDevices?.firstOrNull()
        } catch (e: SecurityException) {
            LogUtil.e("Auto-pair failed: ${e.message}")
            null
        }
    }

    private fun observeViewModel() {
        viewModel.actionTextLiveData.observe(this) {
            binding.tvProcessingAction.text = it
        }

        viewModel.loadingLiveData.observe(this) { loading ->
            binding.progressBar.isVisible = loading
        }

        lifecycleScope.launch(Dispatchers.Main) {
            viewModel.errorFlow.collect { errorData ->
                if (cancelRequested) {
                    MposSdk.transactionListener(
                        TransactionResultListener.OnCompleted(
                            TransactionResult(
                                status = errorData?.errorType?.code ?: "cancelled",
                                errorData = errorData
                            )
                        )
                    )
                    finish()
                    return@collect
                }
                showAlertDialog(
                    message = errorData?.message ?: "Something went wrong",
                    showNegativeButton = false
                ) {
                    MposSdk.transactionListener(
                        TransactionResultListener.OnCompleted(
                            TransactionResult(
                                status = errorData?.errorType?.code!!,
                                errorData = errorData
                            )
                        )
                    )

                    finish()
                }
            }
        }

        lifecycleScope.launch {
            viewModel.transactionStatusFlow.collect { transactionResult ->
                MposSdk.transactionListener(
                    TransactionResultListener.OnCompleted(
                        transactionResult ?: TransactionResult(status = "unknown_error")
                    )
                )

                finish()
            }
        }
    }

    override fun onStop() {
        super.onStop()
        if (cancelRequested) return
        cancelRequested = true
        lifecycleScope.launch {
            viewModel.cancelTransaction()
        }
    }
}