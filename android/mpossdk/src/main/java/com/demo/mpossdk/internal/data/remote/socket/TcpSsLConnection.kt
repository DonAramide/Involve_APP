package com.demo.mpossdk.internal.data.remote.socket

import org.jpos.core.Configurable
import org.jpos.core.Configuration
import org.jpos.iso.ISOClientSocketFactory
import org.jpos.iso.ISOException
import org.jpos.iso.ISOServerSocketFactory
import org.jpos.util.SimpleLogSource
import java.io.File
import java.net.ServerSocket
import java.net.Socket
import java.security.KeyStore
import java.security.SecureRandom
import java.security.cert.X509Certificate
import javax.net.ssl.*

internal class TcpSsLConnection : SimpleLogSource(), ISOServerSocketFactory, ISOClientSocketFactory,
    Configurable {
    private var sslc: SSLContext? = null
    private var serverFactory: SSLServerSocketFactory? = null
    private var socketFactory: SSLSocketFactory? = null
    private var keyStore: String? = null
    private var password: String? = null
    private var keyPassword: String? = null
    private var serverName: String? = null
    private var clientAuthNeeded = false
    private var serverAuthNeeded = false
    private var enabledCipherSuites: Array<String>? = null

    fun setKeyStore(keyStore: String?) {
        this.keyStore = keyStore
    }

    fun setPassword(password: String?) {
        this.password = password
    }

    private fun getTrustManagers(ks: KeyStore): Array<TrustManager> {
        return if (serverAuthNeeded) {
            val tm = TrustManagerFactory.getInstance("SunX509")
            tm.init(ks)
            tm.trustManagers
        } else {
            arrayOf(object : X509TrustManager {
                override fun getAcceptedIssuers(): Array<X509Certificate?> {
                    return arrayOfNulls(0)
                }

                override fun checkClientTrusted(certs: Array<X509Certificate>, authType: String) {}
                override fun checkServerTrusted(certs: Array<X509Certificate>, authType: String) {}
            })
        }
    }


    private fun getSSLContext(): SSLContext {
        if (password == null) {
            password = getPassword()
        }
        if (keyPassword == null) {
            keyPassword = getKeyPassword()
        }
        if (keyStore == null || keyStore!!.isEmpty()) {
            keyStore = (System.getProperty("user.home")?.plus(File.separator)) + ".keystore"
        }
        val var7: SSLContext
        try {
            val ks = KeyStore.getInstance("BKS")
            val km = KeyManagerFactory.getInstance("X509")
            km.init(ks, keyPassword!!.toCharArray())
            val kma = km.keyManagers
            val tma = getTrustManagers(ks)
            val sslc = SSLContext.getInstance("TLS")
            sslc.init(kma, tma, SecureRandom.getInstance("SHA1PRNG"))
            var7 = sslc
        } catch (var11: Exception) {
            throw ISOException(var11)
        } finally {
            password = null
            keyPassword = null
        }
        return var7
    }

    private fun createServerSocketFactory(): SSLServerSocketFactory? {
        if (sslc == null) {
            sslc = getSSLContext()
        }
        return sslc!!.serverSocketFactory
    }

    private fun createSocketFactory(): SSLSocketFactory? {
        if (sslc == null) {
            sslc = getSSLContext()
        }
        return sslc!!.socketFactory
    }

    override fun createServerSocket(port: Int): ServerSocket {
        if (serverFactory == null) {
            serverFactory = this.createServerSocketFactory()
        }

        val socket = serverFactory!!.createServerSocket(port)
        val serverSocket = socket as SSLServerSocket
        serverSocket.needClientAuth = clientAuthNeeded
        if (enabledCipherSuites != null && enabledCipherSuites!!.isNotEmpty()) {
            serverSocket.enabledCipherSuites = enabledCipherSuites
        }

        return socket
    }

    override fun createSocket(host: String?, port: Int): Socket {
        if (socketFactory == null) {
            socketFactory = this.createSocketFactory()
        }
        return socketFactory?.createSocket(host, port) as SSLSocket
    }

    private fun getPassword(): String? {
        return System.getProperty("jpos.ssl.storepass", "password")
    }

    private fun getKeyPassword(): String? {
        return System.getProperty("jpos.ssl.keypass", "password")
    }

    override fun setConfiguration(cfg: Configuration?) {
        serverName = cfg!!["servername"]
        password = cfg["storepassword", null]
        keyPassword = cfg["keypassword", null]
        enabledCipherSuites = cfg.getAll("addEnabledCipherSuite")
    }
}