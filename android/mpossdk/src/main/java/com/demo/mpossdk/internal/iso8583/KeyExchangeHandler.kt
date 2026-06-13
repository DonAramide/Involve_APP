package com.demo.mpossdk.internal.iso8583

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import org.jpos.iso.ISOException
import com.demo.mpossdk.R
import com.demo.mpossdk.internal.data.remote.socket.SocketChannel
import com.demo.mpossdk.internal.domain.model.TerminalParameters
import com.demo.mpossdk.internal.domain.repository.SessionManager
import com.demo.mpossdk.internal.iso8583.enums.ISOProcCode
import com.demo.mpossdk.internal.iso8583.utils.ISOUtils
import com.demo.mpossdk.internal.utils.Constants
import com.demo.mpossdk.internal.utils.LogUtil
import java.io.EOFException
import java.io.IOException

/**
 * @Author: ifechukwu.udorji
 * @Date: 7/3/2024
 */

internal sealed class KeyExchangeResult {
    data class Error(val message: String): KeyExchangeResult()
    data object Loading: KeyExchangeResult()
    data class Progress(val message: String): KeyExchangeResult()
    data class OnSuccess(val message: String): KeyExchangeResult()
}

internal class KeyExchangeHandler(
    private val context: Context,
    private val sessionManager: SessionManager,
    private val socketChannel: SocketChannel,
    private val isoMessageBuilder: IsoMessageBuilder
) {
    private val coroutineScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val keyExchangeResult = MutableStateFlow<KeyExchangeResult>(KeyExchangeResult.Loading)
    val keyExchangeResultFlow = keyExchangeResult.asStateFlow()

    private var terminalParameters: TerminalParameters? = null

    suspend fun startKeyExchangeTransaction() {
        terminalParameters = sessionManager.getTerminalParameters()
        if (terminalParameters == null) {
            keyExchangeResult.update {
                KeyExchangeResult.Error("Terminal Parameters not found")
            }
            return
        }


        doTMKTransaction()
    }

    private suspend fun doTMKTransaction() {
        android.util.Log.e("flutter", "[NATIVE] Starting TMK Transaction... connecting to server")
        try {
            val channel = socketChannel.setup()
            android.util.Log.e("flutter", "[NATIVE] Calling channel.connect()")
            channel.connect()
            android.util.Log.e("flutter", "[NATIVE] channel.connect() succeeded! Downloading TMK...")
            keyExchangeResult.update { KeyExchangeResult.Progress("Downloading TMK...") }
            val tmkRequest =
                isoMessageBuilder.buildKeyExchangeMessage(ISOProcCode.TMK_DOWNLOAD_ISO_PROC_CODE)

            android.util.Log.e("flutter", "[NATIVE] Calling channel.send(tmkRequest)")
            channel.send(tmkRequest)
            android.util.Log.e("flutter", "[NATIVE] Calling channel.receive()")
            val response = channel.receive()
            android.util.Log.e("flutter", "[NATIVE] Received response!")
            channel.disconnect()

            val responseCode = response.getString(39)
            if (responseCode != Constants.ISO_SUCCESS_CODE) {
                val message = ISOUtils.getNibssMessage(responseCode)
                LogUtil.i("Message :::::::::::::: $message")
                keyExchangeResult.update {
                    KeyExchangeResult.Error("TMK Failed. Response code: $responseCode")
                }
                return
            }

            val field53 = response.getString(53)
            val masterKey = if (terminalParameters?.activeHost == com.demo.mpossdk.open.ActiveHost.EXPRESS_PAY) {
                val baseUrl = terminalParameters?.expressPayBaseUrl ?: "http://80.88.8.56:552/api/GetPlainMasterKey"
                val authToken = terminalParameters?.expressPayAuthToken ?: ""
                val payload = "{\"MasterKey\":\"$field53\"}"
                
                kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.IO) {
                    val url = java.net.URL(baseUrl)
                    val conn = url.openConnection() as java.net.HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "application/json; charset=UTF-8")
                    if (authToken.isNotEmpty()) {
                        conn.setRequestProperty("Authorization", "Basic $authToken")
                    }
                    conn.doOutput = true
                    val os = conn.outputStream
                    os.write(payload.toByteArray(Charsets.UTF_8))
                    os.flush()
                    os.close()

                    val responseCodeHttp = conn.responseCode
                    if (responseCodeHttp == 200) {
                        val reader = java.io.BufferedReader(java.io.InputStreamReader(conn.inputStream))
                        val responseStr = reader.readText().replace("\"", "").trim()
                        reader.close()
                        responseStr
                    } else {
                        throw Exception("Express Pay API failed with code $responseCodeHttp")
                    }
                }
            } else {
                ISOUtils.getDecryptedTMKFromHost(field53, terminalParameters?.ctmk ?: "").toString()
            }

            val eTmk = field53.substring(0, 32)
            val kcv = field53.substring(32, 38)
            terminalParameters?.tmkKCV = kcv
            terminalParameters?.tmk2 = eTmk
            terminalParameters?.tmk = masterKey
            sessionManager.saveTerminalParameters(terminalParameters!!)

            doTSKTransaction()
        } catch (e: ISOException) {
            LogUtil.e(e.message ?: "An error occurred")
            keyExchangeResult.update {
                KeyExchangeResult.Error("TMK Failed\n${context.getString(R.string.error_packing_message)}")
            }
        } catch (e: EOFException) {
            LogUtil.e(e.message ?: "An error occurred")
            keyExchangeResult.update {
                KeyExchangeResult.Error("TMK Failed\n${context.getString(R.string.host_disconnect)}")
            }
        } catch (e: IOException) {
            LogUtil.e(e.message ?: "An error occurred")
            keyExchangeResult.update {
                KeyExchangeResult.Error("TMK Failed\n${context.getString(R.string.network_error_please_check_your_connection_and_try_again)}")
            }
        } catch (e: Throwable) {
            android.util.Log.e("flutter", "[NATIVE] TMK Transaction failed with error: ${e.message}", e)
            keyExchangeResult.update {
                KeyExchangeResult.Error("TMK Failed\n${context.getString(R.string.an_error_occurred)}: ${e.message}")
            }
        }
    }

    private suspend fun doTSKTransaction() {
        try {
            val channel = socketChannel.setup()
            channel.connect()
            val tskRequest =
                isoMessageBuilder.buildKeyExchangeMessage(ISOProcCode.TSK_DOWNLOAD_ISO_PROC_CODE)

            channel.send(tskRequest)
            val response = channel.receive()
            channel.disconnect()

            val responseCode = response.getString(39)
            if (responseCode != Constants.ISO_SUCCESS_CODE) {
                val message: String = ISOUtils.getNibssMessage(responseCode)
                LogUtil.i("TSK Failed ::::: $message")
                keyExchangeResult.update {
                    KeyExchangeResult.Error("TSK Failed. Response code: $responseCode")
                }
                return
            }


            val sessionKey =
                ISOUtils.getDecryptedKeyFromHost(response.getString(53), terminalParameters?.tmk!!)
                    .toString()

            val field53 = response.getString(53)
            val eTSK = field53.substring(0, 32)
            val kcv = field53.substring(32, 38)
            terminalParameters?.tskKCV = kcv
            terminalParameters?.tsk2 = eTSK
            terminalParameters?.tsk = sessionKey
            sessionManager.saveTerminalParameters(terminalParameters!!)

            doTPKTransaction()
        } catch (e: ISOException) {
            LogUtil.e(e.message ?: "An error occurred")
            keyExchangeResult.update {
                KeyExchangeResult.Error("TSK Failed\n${context.getString(R.string.error_packing_message)}")
            }
        } catch (e: EOFException) {
            LogUtil.e(e.message ?: "An error occurred")
            keyExchangeResult.update {
                KeyExchangeResult.Error("TSK Failed\n${context.getString(R.string.host_disconnect)}")
            }
        } catch (e: IOException) {
            LogUtil.e(e.message ?: "An error occurred")
            keyExchangeResult.update {
                KeyExchangeResult.Error("TSK Failed\n${context.getString(R.string.network_error_please_check_your_connection_and_try_again)}")
            }
        } catch (e: Exception) {
            LogUtil.e(e.message ?: "An error occurred")
            keyExchangeResult.update {
                KeyExchangeResult.Error("TSK Failed\n${context.getString(R.string.an_error_occurred)}")
            }
        }
    }

    private suspend fun doTPKTransaction() {
        try {
            val channel = socketChannel.setup()
            channel.connect()
            val tpkRequest =
                isoMessageBuilder.buildKeyExchangeMessage(ISOProcCode.TPK_DOWNLOAD_ISO_PROC_CODE)

            channel.send(tpkRequest)
            val response = channel.receive()
            channel.disconnect()

            val responseCode = response.getString(39)
            if (responseCode != Constants.ISO_SUCCESS_CODE) {
                val message: String = ISOUtils.getNibssMessage(responseCode)
                LogUtil.i("TPK Failed ::::: $message")
                keyExchangeResult.update {
                    KeyExchangeResult.Error("TPK Failed. Response code: $responseCode")
                }
                return
            }

            val pinKey =
                ISOUtils.getDecryptedKeyFromHost(response.getString(53), terminalParameters?.tmk!!)
                    .toString()
            val field53 = response.getString(53)
            val encryptedTerminalPinKey = field53.substring(0, 32)
            val kcv = field53.substring(32, 38)

            terminalParameters?.tpkKCV = kcv
            terminalParameters?.tpk2 = encryptedTerminalPinKey
            terminalParameters?.tpk = pinKey
            sessionManager.saveTerminalParameters(terminalParameters!!)

            doParameterDownloadTransaction()
        } catch (e: ISOException) {
            LogUtil.e(e.message ?: "An error occurred")
            keyExchangeResult.update {
                KeyExchangeResult.Error("TPK Failed\n${context.getString(R.string.error_packing_message)}")
            }
        } catch (e: EOFException) {
            LogUtil.e(e.message ?: "An error occurred")
            keyExchangeResult.update {
                KeyExchangeResult.Error("TPK Failed\n${context.getString(R.string.host_disconnect)}")
            }
        } catch (e: IOException) {
            LogUtil.e(e.message ?: "An error occurred")
            keyExchangeResult.update {
                KeyExchangeResult.Error("TPK Failed\n${context.getString(R.string.network_error_please_check_your_connection_and_try_again)}")
            }
        } catch (e: Exception) {
            LogUtil.e(e.message ?: "An error occurred")
            keyExchangeResult.update {
                KeyExchangeResult.Error("TPK Failed\n${context.getString(R.string.an_error_occurred)}")
            }
        }
    }

    private suspend fun doParameterDownloadTransaction() {
        try {
            val channel = socketChannel.setup()
            channel.connect()

            val parameterDownloadRequest =
                isoMessageBuilder.buildKeyExchangeMessage(ISOProcCode.TERM_PARAM_DOWNLOAD_ISO_PROC_CODE)

            channel.send(parameterDownloadRequest)
            val response = channel.receive()
            channel.disconnect()

            val responseCode = response.getString(39)
            if (responseCode != Constants.ISO_SUCCESS_CODE) {
                val message: String = ISOUtils.getNibssMessage(responseCode)
                LogUtil.i("Terminal Param Failed ::::: $message")
                keyExchangeResult.update {
                    KeyExchangeResult.Error("Terminal Param Failed. Response code: $responseCode")
                }
                return
            }


            val field62 = response.getString(62)

            val merchantId = ISOUtils.parseTLV(field62, "03").toString()
            val merchantCategoryCode = ISOUtils.parseTLV(field62, "08").toString()
            val merchantLocation = ISOUtils.parseTLV(field62, "52").toString()
            val currencyCode = ISOUtils.parseTLV(field62, "05").toString()
            val countryCode = ISOUtils.parseTLV(field62, "06").toString()
            val ctmsTimeDate = ISOUtils.parseTLV(field62, "02").toString()

            terminalParameters?.merchantNo = merchantId
            terminalParameters?.merchantName = merchantLocation
            terminalParameters?.currencyCode = currencyCode
            terminalParameters?.mcc = merchantCategoryCode
            terminalParameters?.cardAcceptorLocation = merchantLocation
            terminalParameters?.cardAcceptorId = merchantId


            if (terminalParameters != null && !terminalParameters?.tmk.isNullOrEmpty() && !terminalParameters?.tpk.isNullOrEmpty()) {
                keyExchangeResult.update {
                    KeyExchangeResult.OnSuccess("Key Exchange Successful")
                }

                sessionManager.saveTerminalParameters(terminalParameters!!)
            } else {
                //Restart Key Exchange
                startKeyExchangeTransaction()
            }

        } catch (e: ISOException) {
            LogUtil.e(e.message ?: "An error occurred")
            keyExchangeResult.update {
                KeyExchangeResult.Error("Parameter Download Failed\n${context.getString(R.string.error_packing_message)}")
            }
        } catch (e: EOFException) {
            LogUtil.e(e.message ?: "An error occurred")
            keyExchangeResult.update {
                KeyExchangeResult.Error("Parameter Download Failed\n${context.getString(R.string.host_disconnect)}")
            }
        } catch (e: IOException) {
            LogUtil.e(e.message ?: "An error occurred")
            keyExchangeResult.update {
                KeyExchangeResult.Error("Parameter Download Failed\n${context.getString(R.string.network_error_please_check_your_connection_and_try_again)}")

            }
        } catch (e: Exception) {
            LogUtil.e(e.message ?: "An error occurred")
            keyExchangeResult.update {
                KeyExchangeResult.Error("Parameter Download Failed\n${context.getString(R.string.an_error_occurred)}")
            }
        }
    }
}
