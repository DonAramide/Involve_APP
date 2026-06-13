package com.demo.mpossdk.open

import androidx.annotation.Keep

/**
 * @Author: ifechukwu.udorji
 * @Date: 8/2/2024
 */
@Keep
data class PaymentRequest(
    val amount: Double,
    val terminalId: String,
    val activeHost: ActiveHost = ActiveHost.EXPRESS_PAY,
    val processOnDevice: Boolean = false
)