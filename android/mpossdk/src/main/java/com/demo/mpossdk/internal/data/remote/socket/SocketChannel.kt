package com.demo.mpossdk.internal.data.remote.socket

import com.demo.mpossdk.internal.domain.repository.SessionManager
import com.demo.mpossdk.internal.iso8583.utils.PosPackager
import org.jpos.util.Logger

internal class SocketChannel constructor(
    private val sessionManager: SessionManager,
    private val transactionPackager: PosPackager
) {
    fun setup(): org.jpos.iso.BaseChannel {
        val terminalParameters = sessionManager.getTerminalParameters()
        val host = if (terminalParameters?.activeHost == com.demo.mpossdk.open.ActiveHost.MEDUSA) {
            "core.medusang.com"
        } else {
            terminalParameters?.serverIP ?: "196.6.103.18"
        }
        val port = if (terminalParameters?.activeHost == com.demo.mpossdk.open.ActiveHost.MEDUSA) {
            8080
        } else {
            if (terminalParameters?.port != null && terminalParameters.port > 0) terminalParameters.port else 4018
        }

        val channel = org.jpos.iso.channel.PostChannel(
            host,
            port,
            transactionPackager
        )
        channel.timeout = if (terminalParameters?.timeoutSeconds != null) terminalParameters.timeoutSeconds!! * 1000 else 60000

        val logger = Logger()
        logger.addListener { ev ->
            val builder = java.lang.StringBuilder()
            ev.dump(java.io.PrintStream(object : java.io.OutputStream() {
                override fun write(b: Int) { builder.append(b.toChar()) }
            }), "")
            android.util.Log.e("flutter", "[ISO8583 NETWORK]\n$builder")
            ev
        }
        channel.setLogger(logger, "channel")

        // Accelerex GA :4001 is always TLS. Plain TCP connect "succeeds" then peer-closes on send.
        val forceSsl =
            terminalParameters?.enableSSL == true ||
                host == "196.6.103.18" ||
                port == 4001
        android.util.Log.i(
            "SocketChannel",
            "ISO channel host=$host port=$port ssl=$forceSsl (param=${terminalParameters?.enableSSL})"
        )
        if (forceSsl) {
            channel.socketFactory = TcpSsLConnection()
        } else {
            channel.socketFactory = TimeoutSocketFactory(15000)
        }
        return channel
    }
}
