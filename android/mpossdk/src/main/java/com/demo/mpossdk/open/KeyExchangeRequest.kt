package com.demo.mpossdk.open

import android.os.Parcelable
import androidx.annotation.Keep
import kotlinx.parcelize.Parcelize

@Keep
@Parcelize
data class KeyExchangeRequest(
    val terminalId: String? = null,
    val key1: String? = null,
    val key2: String? = null,
    val ipAddress: String? = null,
    val portNumber: String? = null,
    val enableSsl: Boolean = false,
    val activeHost: ActiveHost = ActiveHost.EXPRESS_PAY,
    val expressPayBaseUrl: String? = null,
    val expressPayAuthToken: String? = null,
    val timeoutSeconds: Int? = null,
) : Parcelable
