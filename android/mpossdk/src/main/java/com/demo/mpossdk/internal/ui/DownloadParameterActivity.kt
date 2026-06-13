package com.demo.mpossdk.internal.ui

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.demo.mpossdk.databinding.ActivityDownloadParameterBinding
import com.demo.mpossdk.internal.data.ServiceLocator
import com.demo.mpossdk.internal.domain.model.TerminalParameters
import com.demo.mpossdk.internal.domain.repository.SessionManager
import com.demo.mpossdk.internal.emv.ParamUtils
import com.demo.mpossdk.internal.iso8583.KeyExchangeHandler
import com.demo.mpossdk.internal.iso8583.KeyExchangeResult
import com.demo.mpossdk.internal.utils.LogUtil
import com.demo.mpossdk.internal.utils.showSuccessSnackBar
import com.vanstone.vm20sdk.api.SystemApi
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

internal class DownloadParameterActivity : AppCompatActivity() {
    private lateinit var binding: ActivityDownloadParameterBinding
    private lateinit var coroutineScope: CoroutineScope
    private lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityDownloadParameterBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val serviceLocator = ServiceLocator.getInstance(this)
        sessionManager = serviceLocator.provideSessionManager()
        val keyExchangeHandler = serviceLocator.provideKeyExchangeHandler()
        coroutineScope = serviceLocator.provideCoroutineScope()

        coroutineScope.launch {
            val terminalParameters = TerminalParameters(
                terminalId = "",
                ctmk = ""
            )

            sessionManager.saveTerminalParameters(terminalParameters)

            ParamUtils.init(sessionManager.getTerminalParameters()!!) {
                SystemApi.Beep_Api(1)

                LogUtil.i("download parameter success")
                binding.root.showSuccessSnackBar("download parameter success")
                finish()
            }
        }

//        val terminalParameters = TerminalParameters(
//                terminalId = "",
//                ctmk = ""
//            )
//        sessionManager.saveTerminalParameters(terminalParameters)
//        coroutineScope.launch {
//            keyExchangeHandler.startKeyExchangeTransaction()
//        }
//
//        observeKeyExchangeState(keyExchangeHandler)
    }

    private fun observeKeyExchangeState(keyExchangeHandler: KeyExchangeHandler) {
        coroutineScope.launch {
            keyExchangeHandler.keyExchangeResultFlow.collect { result ->
                when(result) {
                    is KeyExchangeResult.Error -> {
                        LogUtil.e(result.message)
                    }
                    is KeyExchangeResult.Loading -> {

                    }
                    is KeyExchangeResult.Progress -> {
                        // Progress state handled elsewhere
                    }
                    is KeyExchangeResult.OnSuccess -> {
                        if (sessionManager.getTerminalParameters() == null) {
                            LogUtil.e("download parameter failed")
                            return@collect
                        }

                        ParamUtils.init(sessionManager.getTerminalParameters()!!) {
                            SystemApi.Beep_Api(1)

                            LogUtil.i("download parameter success")
                            binding.root.showSuccessSnackBar("download parameter success")
                            finish()
                        }
                    }
                }
            }
        }
    }

}