package com.demo.mpossdk.internal.data.remote.socket

import org.jpos.iso.ISOClientSocketFactory
import java.net.InetSocketAddress
import java.net.Socket

internal class TimeoutSocketFactory(private val timeoutMs: Int) : ISOClientSocketFactory {
    override fun createSocket(host: String?, port: Int): Socket {
        val socket = Socket()
        socket.connect(InetSocketAddress(host, port), timeoutMs)
        return socket
    }
}
