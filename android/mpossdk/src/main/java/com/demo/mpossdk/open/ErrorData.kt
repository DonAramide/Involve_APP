package com.demo.mpossdk.open

import android.os.Parcelable
import androidx.annotation.Keep
import kotlinx.parcelize.Parcelize

enum class ErrorType(val code: String) {
    DEVICE_NOT_INITIALIZED("D10"),
    DEVICE_NOT_PAIRED("D11"),
    EMV_DATA_ERROR("E12"),
    TRANSACTION_CANCELLED("03"),
    TRANSACTION_FAILED("04"),
    NETWORK_ERROR("05"),
    UNKNOWN_ERROR("99"),
    INVALID_REQUEST("09")
}

@Keep
@Parcelize
data class ErrorData(
    val errorType: ErrorType,
    val message: String
): Parcelable