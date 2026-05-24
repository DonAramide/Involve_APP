package com.demo.mpossdk.internal.ui.processing

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import com.demo.mpossdk.internal.data.remote.socket.SocketChannel
import com.demo.mpossdk.internal.domain.repository.SessionManager
import com.demo.mpossdk.internal.iso8583.IsoMessageBuilder
import kotlinx.coroutines.CoroutineScope

internal class ProcessingViewModelFactory(
    private val sessionManager: SessionManager,
    private val coroutineScope: CoroutineScope,
    private val isoMessageBuilder: IsoMessageBuilder,
    private val socketChannel: SocketChannel
): ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        if (modelClass.isAssignableFrom(ProcessingViewModel::class.java)) {
            @Suppress("UNCHECKED_CAST")
            return ProcessingViewModel(
                sessionManager,
                coroutineScope,
                isoMessageBuilder,
                socketChannel
            ) as T
        }
        throw IllegalArgumentException("Unknown ViewModel class")
    }
}