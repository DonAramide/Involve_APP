package com.demo.mpossdk.internal.utils

import org.jpos.iso.ISOCurrency
import java.text.DecimalFormat

internal object AmountUtils {

    fun toIsoAmount(amount: Double, currencyCode: String): String {
        if (amount == 0.0 || currencyCode.isEmpty())
            return ""

        return ISOCurrency.convertToIsoMsg(amount, currencyCode)
    }

    fun fromIsoAmount(amount: String): String {
        if (amount.isNotEmpty()) {
            val longAmount = amount.toLong()
            val readableAmount = (longAmount.toDouble() / 100.00).toString()
            return formatToTwoDecimalPlaces(readableAmount)
        }
        return "0.00"
    }

    fun formatToTwoDecimalPlaces(amount: String): String {
        val decimalFormat = DecimalFormat("#.00")
        val doubleAmount = amount.toDoubleOrNull()
        doubleAmount?.let {
            return decimalFormat.format(it)
        }

        return amount
    }
}