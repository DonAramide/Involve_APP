package com.demo.mpossdk.internal.iso8583.utils

import android.util.Log
import com.demo.mpossdk.internal.iso8583.cryptographyUtils.TripleDESUtils
import com.demo.mpossdk.internal.iso8583.enums.Tags
import org.jpos.iso.ISODate
import org.jpos.iso.ISOException
import org.jpos.iso.ISOMsg
import org.jpos.iso.ISOUtil
import java.text.NumberFormat
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.Random

internal object ISOUtils {
    private const val TAG = "ISOUtils"
    fun getStan(): String? {
        var random: String? = "999999"

        try {
            random = ISOUtil.zeropad(Random().nextInt(999999).toString(), 6)
        } catch (e: ISOException) {
            e.stackTrace
        }
        return random
    }

    fun generateRetrievalReferenceNumber(transDateTime: String, stan: String): String {
        val date = ISODate.parseISODate(transDateTime)
        val hour = SimpleDateFormat("HH", Locale.getDefault()).format(date)

        val julianDate = ISODate.getJulianDate(date)
        return julianDate + hour + stan
    }

    fun getAcquirerInstitutionIdFromTrack2Data(track2Data: String?): String {
        return track2Data?.substring(0, 6) ?: ""
    }

    fun getServiceCodeFromTrack2Data(track2Data: String): String {
        val value = getTrackDataFromSeparator(track2Data)
        return value.substring(4, 7)
    }

    fun getCardPanFromTrack2Data(track2Data: String): String {
        return track2Data.substring(0, track2Data.indexOf('D'))
    }

    fun getCardExpiryDateFromTrack2Data(track2Data: String): String {
        val value = getTrackDataFromSeparator(track2Data)
        return value.substring(0, 4)
    }

    fun getPinVerificationValueFromTrack2Data(track2Data: String): String {
        val value = getTrackDataFromSeparator(track2Data)
        return value.substring(7, 11)
    }

    fun getCardVerificationValueFromTrack2Data(track2Data: String): String {
        val value = getTrackDataFromSeparator(track2Data)
        return value.substring(11, 14)
    }

    private fun getTrackDataFromSeparator(track2Data: String): String {
        val separator = "D"
        val sepPos = track2Data.indexOf(separator)

        return track2Data.substring(sepPos + separator.length)
    }

    fun removeTagLengthFromTLV(key: String, tlv: String): String {
        val removePrefix = tlv.removePrefix(key)
        return removePrefix.substring(2)
    }

    fun maskCardPAN(cardPAN: String): String {
        return String.format(
            "%s************%s",
            cardPAN.substring(0, 4),
            cardPAN.substring(cardPAN.length - 3)
        )
    }

    fun getNibssMessage(responseCode: String): String {
        return when (responseCode) {
            "00" -> "Approve"
            "01" -> "Refer to card issuer"
            "02" -> "Refer to card issuer, special condition"
            "03" -> "Invalid merchant"
            "04" -> "Pick-up card"
            "05" -> "Do not honor"
            "06" -> "Error"
            "07" -> "Pick-up card, special condition"
            "08" -> "Honor with identification"
            "09" -> "Request in progress"
            "10" -> "Approved, partial"
            "11" -> "Approved, VIP"
            "12" -> "Invalid transaction"
            "13" -> "Invalid amount"
            "14" -> "Invalid card number"
            "15" -> "No such issuer"
            "16" -> "Approved, update track 3"
            "17" -> "Customer cancellation"
            "18" -> "Customer dispute"
            "19" -> "Re-enter transaction"
            "20" -> "Invalid response"
            "21" -> "No action taken"
            "22" -> "Suspected malfunction"
            "23" -> "Unacceptable transaction fee"
            "24" -> "File update not supported"
            "25" -> "Unable to locate record"
            "26" -> "Duplicate record"
            "27" -> "File update edit error"
            "28" -> "File update file locked"
            "29" -> "File update failed"
            "30" -> "Format error"
            "31" -> "Bank not supported"
            "32" -> "Completed partially"
            "33" -> "Expired card, pick-up"
            "34" -> "Suspected fraud, pick-up"
            "35" -> "Contact acquirer, pick-up"
            "36" -> "Restricted card, pick-up"
            "37" -> "Call acquirer security, pick-up"
            "38" -> "PIN tries exceeded, pick-up"
            "39" -> "No credit account"
            "40" -> "Function not supported"
            "41" -> "Lost card"
            "42" -> "No universal account"
            "43" -> "Stolen card"
            "44" -> "No investment account"
            "51" -> "Not sufficient funds"
            "52" -> "No check account"
            "53" -> "No savings account"
            "54" -> "Expired card"
            "55" -> "Incorrect PIN"
            "56" -> "No card record"
            "57" -> "Transaction not permitted to cardholder"
            "58" -> "Transaction not permitted on terminal"
            "59" -> "Suspected fraud"
            "60" -> "Contact acquirer"
            "61" -> "Exceeds withdrawal limit"
            "62" -> "Restricted card"
            "63" -> "Security violation"
            "64" -> "Original amount incorrect"
            "65" -> "Exceeds withdrawal frequency"
            "66" -> "Call acquirer security"
            "67" -> "Hard capture"
            "68" -> "Response received too late"
            "75" -> "PIN tries exceeded"
            "77" -> "Intervene, bank approval required"
            "78" -> "Intervene, bank approval required for partial amount"
            "90" -> "Cut-off in progress"
            "91" -> "Issuer or switch inoperative"
            "92" -> "Routing error"
            "93" -> "Violation of law"
            "94" -> "Duplicate transaction"
            "95" -> "Reconcile error"
            "96" -> "System malfunction"
            "98" -> "Exceeds cash limit"
            else -> "Unknown error"
        }
    }

    /**
     * Accelerex GA / NIBSS purchase DE55 tag order (matches morefunsdk NIBSS_FIELD55_TAGS).
     * Missing 9F33/9F34/9F35/9F41 causes host peer-disconnect on :4001.
     */
    fun getIccDataTags(): List<Tags> {
        return listOf(
            Tags.APPLICATION_CRYPTOGRAM,          // 9F26
            Tags.CRYPTOGRAM_INFORMATION_DATA,     // 9F27
            Tags.ISSUER_APPLICATION_DATA,         // 9F10
            Tags.UNPREDICTABLE_NUMBER,            // 9F37
            Tags.APPLICATION_TRANSACTION_COUNTER, // 9F36
            Tags.TERMINAL_VERIFICATION_RESULTS,   // 95
            Tags.TRANSACTION_DATE,                // 9A
            Tags.TRANSACTION_TYPE,                // 9C
            Tags.AMOUNT_AUTHORIZED_NUMERIC,       // 9F02
            Tags.TRANSACTION_CURRENCY_CODE,       // 5F2A
            Tags.APPLICATION_PAN_SEQUENCE_NUMBER, // 5F34
            Tags.APPLICATION_INTERCHANGE_PROFILE, // 82
            Tags.TERMINAL_COUNTRY_CODE,           // 9F1A
            Tags.AMOUNT_CASHBACK,                 // 9F03
            Tags.TERMINAL_CAPABILITIES,           // 9F33
            Tags.DF_NAME,                         // 84
            Tags.CVM_RESULT,                      // 9F34
            Tags.TERMINAL_TYPE,                   // 9F35
            Tags.TRANSACTION_SEQUENCE_COUNTER,   // 9F41
        )
    }

    fun isCardExpired(expiryDate: String): Boolean {
        try {
            val dateFormat = SimpleDateFormat("yyMM")
            val currentDate = Date()
            val cardExpiry = dateFormat.parse(expiryDate)

            // Compare the card expiry date with the current date
            return cardExpiry.before(currentDate)
        } catch (e: Exception) {
            // Handle parsing or other exceptions
            return true // Consider the card expired if there's an error
        }
    }

    /** Logs the available fields in the ISO message
     * @param data The packed ISO message. It will be unpacked in this function
     * @param packager The ISO packager to unpack the data
     **/

    fun parseResponse(data: String, packager: PosPackager): Map<String, String>? {
        val hashMap = HashMap<String, String>()

        try {
            val message = ISOMsg()
            message.packager = packager
            message.unpack(data.toByteArray())
            Log.i(TAG,"-------ISO MESSAGE-------")

            hashMap["0"] = message.mti
            Log.i(TAG,"MTI- ${message.mti}")

            for (field in 1..message.maxField) {
                if (message.hasField(field)) {
                    hashMap[field.toString()] = message.getString(field)
                    Log.i(TAG,"Field $field - ${message.getString(field)}")
                }
            }
        } catch (e: ISOException) {
            Log.i(TAG,"Error: ${e.message.toString()}")
        } finally {
            Log.i(TAG,"------------------------")
        }

        return hashMap
    }

    fun getDecryptedTMKFromHost(field53: String, ctmk: String): String? {
        val encryptedKey = field53.substring(0, 32) //This is the encrypted TMK from CTMS

        var plainKey: ByteArray? = null
        try {
            val bytesXORKeyComponents = ISOUtil.hex2byte(ctmk)
            val bytesEncryptedKeyFromCTMS = ISOUtil.hex2byte(encryptedKey)
            val cipherForKeyDecryption = TripleDESUtils(bytesXORKeyComponents)

            //decrypt
            plainKey = cipherForKeyDecryption.decode(bytesEncryptedKeyFromCTMS)
        } catch (ex: Exception) {
            Log.e(TAG,"getDecryptedTMKFromHost: Error (Decrypting TMK) - " + ex.message.toString())
        }

        return ISOUtil.byte2hex(plainKey)
    }

    fun getDecryptedKeyFromHost(field53: String, masterKey: String): String? {
        val encryptedKey = field53.substring(0, 32)

        var plainKey: ByteArray? = null

        try {
            val bytesXORKeyComponents = ISOUtil.hex2byte(masterKey)
            val bytesEncryptedKeyFromCTMS = ISOUtil.hex2byte(encryptedKey)
            val cipherForKeyDecryption = TripleDESUtils(bytesXORKeyComponents)

            //decrypt
            plainKey = cipherForKeyDecryption.decode(bytesEncryptedKeyFromCTMS)
        } catch (ex: Exception) {
            Log.e(TAG,"getDecryptedTSKFromHost: Error (Decrypting TSK) - " + ex.message.toString())
        }

        return ISOUtil.byte2hex(plainKey)
    }

//    private fun getXorOfComponentKey(): String {
//        val hostGroupKey = BuildConfig.HOST_GROUP_KEY
//        return AESUtils().decryptHexFormat(hostGroupKey).toString()
//    }

    fun parseTLV(resp: String, Tag: String): String? {
        var resp = resp
        var data = ""
        var len = ""
        val nextTag = 0
        for (i in resp.indices) {
            val tag = resp.substring(nextTag, nextTag + Tag.length)
            if (tag == Tag) {
                len = resp.substring(Tag.length, Tag.length + 3)
                data = resp.substring(5, 5 + len.toInt())
                return data
            }
            len = resp.substring(2, 5)
            data = resp.substring(5, 5 + len.toInt())
            resp = resp.substring(data.length + 5)
        }
        return data
    }

    fun extractAmountFromField54(field54: String): String {
        return if (field54.isNotEmpty()) {
            val f54 = field54.substring(9, 20).toDouble()
            val amount = f54 / 100
            val formatter = NumberFormat.getCurrencyInstance()
            val formattedAmount = formatter.format(amount)
            formattedAmount.substring(1)
        } else ""
    }

    fun hexToAscii(hexStr: String?): String {
        if (hexStr.isNullOrEmpty() || hexStr.length % 2 != 0) {
            return ""
        }
        val output = StringBuilder("")
        var i = 0
        while (i < hexStr.length) {
            val str = hexStr.substring(i, i + 2)
            output.append(str.toInt(16).toChar())
            i += 2
        }
        return output.toString()
    }
}