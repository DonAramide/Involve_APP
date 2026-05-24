package com.demo.mpossdk.internal.ui.processing

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.isVisible
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.lifecycleScope
import com.demo.mpossdk.databinding.ActivityProcessingTransactionBinding
import com.demo.mpossdk.internal.data.ServiceLocator
import com.demo.mpossdk.internal.utils.AmountUtils
import com.demo.mpossdk.internal.utils.showAlertDialog
import com.demo.mpossdk.open.MposSdk
import com.demo.mpossdk.open.TransactionResult
import com.demo.mpossdk.open.TransactionResultListener
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

internal class ProcessingTransactionActivity : AppCompatActivity() {
    private lateinit var binding: ActivityProcessingTransactionBinding
    private lateinit var coroutineScope: CoroutineScope
    private lateinit var viewModel: ProcessingViewModel

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
        viewModel.startTransaction(MposSdk.paymentRequest!!)

        binding.tvTransactionAmount.text =
            "NGN ${AmountUtils.formatToTwoDecimalPlaces(MposSdk.paymentRequest?.amount.toString())}"

        observeViewModel()
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
            viewModel.transactionStatusFlow.collect { transactionData ->
                MposSdk.transactionListener(
                    TransactionResultListener.OnCompleted(
                        TransactionResult(
                            mposTransactionResponse = transactionData,
                            status = transactionData?.statusCode
                        )
                    )
                )

                finish()
            }
        }
    }

    override fun onStop() {
        super.onStop()
        lifecycleScope.launch {
            viewModel.cancelTransaction()
        }
    }
}