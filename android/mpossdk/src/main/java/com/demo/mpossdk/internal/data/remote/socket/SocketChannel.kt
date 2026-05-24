package com.demo.mpossdk.internal.data.remote.socket

import com.demo.mpossdk.BuildConfig
import com.demo.mpossdk.internal.domain.repository.SessionManager
import com.demo.mpossdk.internal.iso8583.utils.PosPackager
import org.jpos.iso.channel.PostChannel
import org.jpos.util.Logger
import org.jpos.util.SimpleLogListener

internal class SocketChannel constructor(
    private val sessionManager: SessionManager,
    private val transactionPackager: PosPackager
) {
    fun setup(): PostChannel {
        val channel = PostChannel(
            "core.medusang.com",
            8080,
            transactionPackager
        )

        if (BuildConfig.DEBUG) {
            val logger = Logger()
            logger.addListener(SimpleLogListener(System.out))
            channel.setLogger(logger, "channel")
        }

        channel.timeout = 60000
        //if (terminalParameters.enableSSL) channel.socketFactory = TcpSsLConnection()
        //channel.socketFactory = TcpSsLConnection()
        return channel
    }
}