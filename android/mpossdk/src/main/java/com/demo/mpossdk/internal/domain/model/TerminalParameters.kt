package com.demo.mpossdk.internal.domain.model

import androidx.annotation.Keep

/**
 * @Author: ifechukwu.udorji
 * @Date: 7/3/2024
 */

@Keep
internal data class TerminalParameters(
    var terminalId: String? = null,
    var tmk: String? = null,
    var tsk: String? = null,
    var tpk: String? = null,
    var code: String? = null,
    var ctmk: String? = null,
    var zmk: String? = null,
    var merchantNo: String? = null,
    var merchantName: String? = null,
    var companyName: String? = null,
    var companyAddress: String? = null,
    var ptsp: String? = null,
    var mcc: String? = null,
    var serverIP: String? = null,
    var port: Int = 0,
    var cardAcceptorId: String? = null,
    var cardAcceptorLocation: String? = null,
    var currencyCode: String? = null,
    var tmk2: String? = null,
    var tsk2: String? = null,
    var tpk2: String? = null,
    var zmk2: String? = null,
    var tmkKCV: String? = null,
    var tskKCV: String? = null,
    var tpkKCV: String? = null,
    var zmkKCV: String? = null,
    var serverIP2: String? = null,
    var port2: Int = 0,
    var cardAcceptorId2: String? = null,
    var cardAcceptorLocation2: String? = null,
    var mcc2: String? = null,
    var ptsp2: String? = null,
    var terminalPtsp: String? = null,
    var enableSSL: Boolean = false,
    var serialNumber: String? = null,
    var footerMessage: String? = null,
    var bankName: String? = null,
    var bankLogo: String? = null,
    var hostType: String? = null,
    var activeHost: com.demo.mpossdk.open.ActiveHost = com.demo.mpossdk.open.ActiveHost.EXPRESS_PAY,
    var expressPayBaseUrl: String? = null,
    var expressPayAuthToken: String? = null,
    var timeoutSeconds: Int? = null,
)
