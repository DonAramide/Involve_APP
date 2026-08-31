package com.demo.mpossdk.open

import androidx.annotation.Keep

@Keep
data class PaymentRequest(
    val amount: Double,
    val terminalId: String,
    val activeHost: ActiveHost = ActiveHost.MEDUSA,
    val processOnDevice: Boolean = false,
    val transactionType: String = "PURCHASE",
    val cashbackAmount: Double = 0.0,
    val originalRrn: String? = null,
    val originalStan: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
)
