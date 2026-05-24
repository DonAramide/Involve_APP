package com.demo.mpossdk.internal.data

import android.annotation.SuppressLint
import android.content.Context
import android.content.SharedPreferences
import com.demo.mpossdk.internal.data.remote.socket.SocketChannel
import com.demo.mpossdk.internal.data.repository.LocationProvider
import com.demo.mpossdk.internal.data.repository.SessionManagerImpl
import com.demo.mpossdk.internal.domain.repository.SessionManager
import com.demo.mpossdk.internal.iso8583.IsoMessageBuilder
import com.demo.mpossdk.internal.iso8583.KeyExchangeHandler
import com.demo.mpossdk.internal.iso8583.utils.PosPackager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob

internal class ServiceLocator private constructor(private val context: Context) {
    companion object {

        @SuppressLint("StaticFieldLeak")
        @Volatile private var instance: ServiceLocator? = null // Volatile modifier is necessary

        fun getInstance(context: Context) =
            instance ?: synchronized(this) { // synchronized to avoid concurrency problem
                instance ?: ServiceLocator(context).also { instance = it }
            }
    }

    private fun provideSharedPreference(): SharedPreferences {
        return context.getSharedPreferences("mposAisinoPref", Context.MODE_PRIVATE)
    }

    fun provideSessionManager(): SessionManager {
        return SessionManagerImpl(context, provideSharedPreference())
    }

    fun provideIsoMessageBuilder(): IsoMessageBuilder {
        return IsoMessageBuilder(provideSessionManager())
    }

    private fun provideNibbsPackager(): PosPackager {
        return PosPackager()
    }

    fun provideSocketChannel(): SocketChannel {
        return SocketChannel(provideSessionManager(), provideNibbsPackager())
    }

    fun provideLocationProvider(): LocationProvider {
        return LocationProvider(context, provideSessionManager())
    }

    fun provideCoroutineScope(): CoroutineScope {
        return CoroutineScope(Dispatchers.IO + SupervisorJob())
    }

    fun provideKeyExchangeHandler(): KeyExchangeHandler {
        return KeyExchangeHandler(context, provideSessionManager(), provideSocketChannel(), provideIsoMessageBuilder())
    }
}