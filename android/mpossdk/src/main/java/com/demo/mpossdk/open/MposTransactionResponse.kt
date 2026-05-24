package com.demo.mpossdk.open

import android.os.Parcelable
import androidx.annotation.Keep
import kotlinx.parcelize.Parcelize


@Keep
@Parcelize
data class TransactionResult(
    val status: String? = null,
    val mposTransactionResponse: MposTransactionResponse? = null,
    val emvData: com.demo.mpossdk.internal.domain.model.EmvDetailResult? = null,
    val errorData: ErrorData? = null
): Parcelable

@Keep
@Parcelize
data class MposTransactionResponse(
    var aid: String? = null,
    var amount: String? = null,
    var cashbackAmount: String? = null,
    var appLabel: String? = null,
    var authCode: String? = null,
    var cardExpireDate: String? = null,
    var cardHolderName: String? = null,
    var dateTime: String? = null,
    var maskedPan: String? = null,
    var message: String? = null,
    var rrn: String? = null,
    var stan: String? = null,
    var statusCode: String? = null,
    var transactionType: String? = null
): Parcelable {
    fun paymentSuccess(): Boolean = statusCode?.endsWith("00") == true
}
