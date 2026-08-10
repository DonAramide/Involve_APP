package com.demo.mpossdk.internal.iso8583

import com.demo.mpossdk.internal.domain.model.EmvDetailResult
import com.demo.mpossdk.internal.domain.repository.SessionManager
import com.demo.mpossdk.internal.iso8583.cryptographyUtils.Sha256Utils
import com.demo.mpossdk.internal.iso8583.enums.ISOMessageType
import com.demo.mpossdk.internal.iso8583.enums.ISOProcCode
import com.demo.mpossdk.internal.iso8583.utils.ISOUtils
import com.demo.mpossdk.internal.iso8583.utils.PosPackager
import com.demo.mpossdk.internal.utils.Constants
import org.jpos.iso.ISODate
import org.jpos.iso.ISOMsg
import org.jpos.iso.ISOUtil
import java.util.Date

internal class IsoMessageBuilder(private val sessionManager: SessionManager){
    private val TAG = "IsoMessageBuilder"
    private val date = Date()
    private val transactionPackager: PosPackager = PosPackager()
    private val transactionDate = ISODate.getDate(date)
    private val transactionTime = ISODate.getTime(date)
    private val transactionDateTime = ISODate.getDateTime(date)

    fun buildKeyExchangeMessage(processingCode: ISOProcCode): ISOMsg {
        val terminalParameters = sessionManager.getTerminalParameters()!!

        val isoMsg = ISOMsg()
        isoMsg.packager = transactionPackager
        isoMsg.mti = ISOMessageType._0800.value
        isoMsg.set(3, processingCode.value)
        isoMsg.set(7, transactionDateTime)
        isoMsg.set(11, ISOUtils.getStan())
        isoMsg.set(12, transactionTime)
        isoMsg.set(13, transactionDate)
        isoMsg.set(41, terminalParameters.terminalId)

        if (processingCode == ISOProcCode.TERM_PARAM_DOWNLOAD_ISO_PROC_CODE) {
            if (terminalParameters.activeHost == com.demo.mpossdk.open.ActiveHost.NIBSS) {
                isoMsg.set(62, "01009233542415")
            } else {
                isoMsg.set(62, "01008".plus(terminalParameters.terminalId))
            }
            // IFA_BINARY(32) placeholder — 32 zero bytes from 64 hex zeros (Accelerex/mpos)
            isoMsg.set(64, ISOUtil.hex2byte(Constants.SIXTY_FOUR_ZEROS))
            isoMsg.recalcBitMap()

            val prePack = isoMsg.pack()
            val mac = sha256MacBinary(prePack, terminalParameters.tsk ?: "")
            isoMsg.set(64, mac)
        }

        return isoMsg
    }

    fun buildPurchaseMessage(
        emvDetailResult: EmvDetailResult
    ): ISOMsg {
        val terminalParameters = sessionManager.getTerminalParameters()
        val purchaseRequest = ISOMsg()
        purchaseRequest.packager = transactionPackager
        purchaseRequest.mti = ISOMessageType._0200.value
        purchaseRequest.set(2, emvDetailResult.cardNo)
        purchaseRequest.set(3, ISOProcCode.PURCHASE_ISO_PROC_CODE.value)
        purchaseRequest.set(4, emvDetailResult.amountAuthorisedNumeric)
        purchaseRequest.set(7, transactionDateTime)
        purchaseRequest.set(11, ISOUtils.getStan())
        purchaseRequest.set(12, transactionTime)
        purchaseRequest.set(13, transactionDate)
        purchaseRequest.set(14, emvDetailResult.cardExpirationDate)
        purchaseRequest.set(22, Constants.POS_ENTRY_MODE)
        purchaseRequest.set(23, ISOUtil.zeropad(emvDetailResult.cardSequenceNumber, 3))
        purchaseRequest.set(25, Constants.POS_CONDITION_CODE)
        purchaseRequest.set(26, Constants.POS_PIN_CAPTURE_CODE)
        purchaseRequest.set(28, "D00000000")
        purchaseRequest.set(32, emvDetailResult.acquirerInstitutionId)
        purchaseRequest.set(35, normalizeTrack2(emvDetailResult.track2Data))
        purchaseRequest.set(37, ISOUtils.generateRetrievalReferenceNumber(transactionDateTime, purchaseRequest.getString(11)))
        purchaseRequest.set(40, emvDetailResult.serviceCode)
        purchaseRequest.set(55, emvDetailResult.iccData)
        purchaseRequest.set(123, Constants.POS_DATA_CODE)
        // IFA_BINARY(32) MAC placeholder (32 zero bytes) — NOT 64 ASCII hex chars
        purchaseRequest.set(128, ISOUtil.hex2byte(Constants.SIXTY_FOUR_ZEROS))

        val activeHost = terminalParameters?.activeHost ?: com.demo.mpossdk.open.ActiveHost.MEDUSA
        val isNibssFamily =
            activeHost == com.demo.mpossdk.open.ActiveHost.EXPRESS_PAY ||
                activeHost == com.demo.mpossdk.open.ActiveHost.NIBSS

        if (isNibssFamily && terminalParameters != null) {
            val mcc = terminalParameters.mcc?.trim().orEmpty().ifEmpty { "6012" }
            purchaseRequest.set(18, mcc)
            purchaseRequest.set(41, terminalParameters.terminalId ?: emvDetailResult.terminalId)
            purchaseRequest.set(42, terminalParameters.cardAcceptorId ?: "2214LA596401018")
            purchaseRequest.set(43, terminalParameters.cardAcceptorLocation ?: "3LINE CARD MANAGEMENT LLA           LANG")
            purchaseRequest.set(49, terminalParameters.currencyCode ?: "566")
        } else {
            // MEDUSA / Default
            purchaseRequest.set(18, "5411")
            purchaseRequest.set(41, emvDetailResult.terminalId)
            purchaseRequest.set(42, "2214LA596401018")
            purchaseRequest.set(43, "3LINE CARD MANAGEMENT LLA           LANG")
            purchaseRequest.set(49, "566")
        }

        val terminalId = if (isNibssFamily && terminalParameters != null) {
            terminalParameters.terminalId ?: ""
        } else {
            emvDetailResult.terminalId ?: ""
        }
        val cleanSerial = normalizeDeviceSerial(
            sessionManager.getDeviceName() ?: terminalParameters?.serialNumber ?: "000"
        )
        val rrn = purchaseRequest.getString(37) ?: ""

        // Accelerex GA (196.6.103.18:4001) peer-disconnects on default Flutter fields.
        // Match working morefunsdk applyGaNibssPurchaseOverrides before MAC.
        if (isAccelerexGaHost(terminalParameters)) {
            applyAccelerexGaPurchaseOverrides(
                purchaseRequest,
                terminalId,
                cleanSerial,
                rrn,
                emvDetailResult.pinBlock,
            )
        } else {
            purchaseRequest.set(59, "$terminalId$cleanSerial$rrn")
            // Non-GA: attach online PIN when present.
            applyPinBlockIfPresent(purchaseRequest, emvDetailResult.pinBlock)
        }

        purchaseRequest.recalcBitMap()

        val hashKey = if (isNibssFamily && terminalParameters != null) {
            terminalParameters.tsk ?: ""
        } else {
            Constants.MASTER_KEY
        }
        if (hashKey.isBlank()) {
            android.util.Log.e(TAG, "TSK/hash key empty — MAC will be rejected by host")
        }

        // Match C:\dev\mpos IsoMessageBuilder + morefunsdk applyBinaryPinAndMac:
        // IFA_BINARY(32) placeholder, trim last 64, SHA256(TSK||body) → 32 raw MAC bytes.
        purchaseRequest.set(128, ISOUtil.hex2byte(Constants.SIXTY_FOUR_ZEROS))
        purchaseRequest.recalcBitMap()
        val prePack = purchaseRequest.pack()
        val mac = sha256MacBinary(prePack, hashKey)
        purchaseRequest.set(128, mac)
        val f55 = purchaseRequest.getString(55).orEmpty()
        val f55Tags = listOf("9F26", "9F33", "9F34", "9F35", "9F41", "84").joinToString(",") { tag ->
            "$tag=${f55.contains(tag)}"
        }
        // jPOS IFA_BINARY uses AsciiHexInterpreter → 32 MAC bytes = 64 hex ASCII on wire.
        // HASH_LEN ≈ body+64 is expected (not body+32).
        val tskFp = if (hashKey.length >= 8) {
            hashKey.take(4) + "…" + hashKey.takeLast(4)
        } else {
            "short"
        }
        android.util.Log.i(
            TAG,
            "GA_MAC_BUILD v8 ONLINEPIN HASH_LEN=${prePack.size} trim=${prePack.size - 64} " +
                "tskLen=${hashKey.length} tskFp=$tskFp macLen=${mac.size} wireMacAscii=${mac.size * 2} " +
                "f35=${purchaseRequest.getString(35)} f59=${purchaseRequest.getString(59)} " +
                "f52=${purchaseRequest.hasField(52)} f55len=${f55.length} $f55Tags " +
                "tid=${purchaseRequest.getString(41)} " +
                "BUILD_MARKER=2026-08-09-ONLINEPIN"
        )
        return purchaseRequest
    }

    /**
     * Accelerex/mpos: SHA-256(keyBytes || dataWithoutLast64) → 32 binary bytes for F64/F128.
     * Trim stays 64 even though wire MAC is 32 bytes (matches working mpos IsoMessageBuilder).
     */
    private fun sha256MacBinary(prePack: ByteArray, tskHex: String): ByteArray {
        val trimLen = (prePack.size - 64).coerceAtLeast(0)
        val toHash = ISOUtil.trim(prePack, trimLen)
        return Sha256Utils.performSha256Hash(toHash, ISOUtil.hex2byte(tskHex))
            ?: ByteArray(32)
    }

    /** Accelerex/mpos PosPackager uses IFA_LLNUM — separator must be 'D' (hex digit), not '='. */
    private fun normalizeTrack2(track2: String?): String {
        if (track2.isNullOrBlank()) return ""
        var value = track2.trim().replace('=', 'D').replace('d', 'D')
        if (value.endsWith("F", ignoreCase = true) && value.length > 1) {
            value = value.substring(0, value.length - 1)
        }
        return if (value.length > 37) value.substring(0, 37) else value
    }

    private fun normalizeDeviceSerial(raw: String): String {
        return raw.replace("[^a-zA-Z0-9]".toRegex(), "")
            .replace(Regex("(?i)android"), "")
            .ifEmpty { "000" }
    }

    /**
     * Accelerex GA on :4001 rejects generic purchase fields with a silent peer-close.
     * Values from working horizonbaseapp / morefunsdk dumps.
     */
    private fun isAccelerexGaHost(
        terminalParameters: com.demo.mpossdk.internal.domain.model.TerminalParameters?
    ): Boolean {
        if (terminalParameters == null) return false
        val ip = terminalParameters.serverIP?.trim().orEmpty()
        val port = terminalParameters.port ?: 0
        return ip == "196.6.103.18" || port == 4001
    }

    private fun applyAccelerexGaPurchaseOverrides(
        request: ISOMsg,
        terminalId: String,
        cleanSerial: String,
        rrn: String,
        pinBlock: String?,
    ) {
        // Savings purchase proc code — 000000 causes peer-disconnect on GA.
        request.set(3, "001000")
        request.set(26, "12")
        request.set(28, "D00000000")
        // Institution routing from approved Accelerex dumps (not card BIN).
        request.set(32, "111129")
        request.set(33, "557694")
        request.set(123, "A1010171134C101")
        if (terminalId.isNotEmpty() && rrn.isNotEmpty()) {
            request.set(59, "$terminalId-$cleanSerial-$rrn")
        }

        // Force track2 'D' separator for GA (IFA_LLNUM / NIBSS CreatePurchaseMessageNIBSS).
        val track2 = request.getString(35)
        if (!track2.isNullOrBlank()) {
            request.set(35, normalizeTrack2(track2))
        }

        // PIN / CVM policy (live GA):
        // - Verve (A000000371…) + CVM 41… + no f52 → 0210/00
        // - Mastercard with PIN entered but CVM left as 41… + no f52 → 0210/59
        //   Kernel often reports offline-PIN CVM even after PED online PIN entry.
        //   For non-Verve: always send f52 when pinBlock exists and force CVM 42….
        val aid = extractEmvTag(request.getString(55), "84")
        val isVerve = aid?.startsWith("A000000371") == true
        val pinHex = normalizePinBlockHex(pinBlock)
        val cvmBefore = extractEmvTag(request.getString(55), "9F34")

        if (pinHex != null && !isVerve) {
            request.set(52, ISOUtil.hex2byte(pinHex))
            val f55 = request.getString(55)
            if (!f55.isNullOrBlank()) {
                val forced = forceEmvCvmOnlinePin(f55)
                if (forced != f55) {
                    request.set(55, forced)
                }
            }
            android.util.Log.i(
                TAG,
                "GA online-PIN path: f52=true aid=$aid cvmBefore=$cvmBefore " +
                    "cvmAfter=${extractEmvTag(request.getString(55), "9F34")} pinLen=${pinHex.length / 2}"
            )
        } else {
            if (request.hasField(52)) {
                request.unset(52)
            }
            val f55 = request.getString(55)
            if (!f55.isNullOrBlank()) {
                val rewritten = rewriteEmvCvmForGaNoPin(f55)
                if (rewritten != f55) {
                    request.set(55, rewritten)
                    android.util.Log.i(TAG, "GA CVM rewrite 9F34→offline-PIN (Verve/no-pin path)")
                }
            }
            android.util.Log.i(
                TAG,
                "GA offline-PIN path: f52=false aid=$aid cvm=${extractEmvTag(request.getString(55), "9F34")} " +
                    "pinPresent=${pinHex != null} isVerve=$isVerve"
            )
        }

        android.util.Log.i(
            TAG,
            "Accelerex GA overrides f3=001000 f32=111129 f33=557694 " +
                "f59=${request.getString(59)} f123=${request.getString(123)} " +
                "f35=${request.getString(35)} f52=${request.hasField(52)} " +
                "cvm9F34=${extractEmvTag(request.getString(55), "9F34")}"
        )
    }

    /** ISO-0 PIN block: 16 hex chars → 8 binary bytes for IFA_BINARY(8). */
    private fun normalizePinBlockHex(pinBlock: String?): String? {
        if (pinBlock.isNullOrBlank()) return null
        var hex = pinBlock.replace("\\s".toRegex(), "").uppercase()
        if (hex.length > 16) hex = hex.substring(0, 16)
        if (hex.length != 16 || !hex.all { it in '0'..'9' || it in 'A'..'F' }) {
            android.util.Log.w(TAG, "Invalid PIN block hex len=${hex.length}")
            return null
        }
        return hex
    }

    private fun applyPinBlockIfPresent(request: ISOMsg, pinBlock: String?) {
        val pinHex = normalizePinBlockHex(pinBlock) ?: return
        request.set(52, ISOUtil.hex2byte(pinHex))
    }

    /**
     * Force 9F34 CVM to online enciphered PIN (0x42) when sending f52.
     * Kernel often reports 0x41 (offline PIN) after PEDGetPwd even for Mastercard online path.
     */
    private fun forceEmvCvmOnlinePin(field55Hex: String): String {
        val hex = field55Hex.replace("\\s".toRegex(), "").uppercase()
        val tag = "9F34"
        val idx = hex.indexOf(tag)
        if (idx < 0) {
            // Insert before end if missing
            return hex + "9F3403420300"
        }
        val lenIdx = idx + tag.length
        if (lenIdx + 2 > hex.length) return hex
        val len = hex.substring(lenIdx, lenIdx + 2).toIntOrNull(16) ?: return hex
        val valIdx = lenIdx + 2
        val valEnd = valIdx + len * 2
        if (valEnd > hex.length || len < 1) return hex
        val value = hex.substring(valIdx, valEnd)
        if (value.startsWith("42")) return hex
        val newValue = "42" + if (value.length >= 2) value.substring(2) else "0300"
        val padded = if (newValue.length >= len * 2) {
            newValue.substring(0, len * 2)
        } else {
            newValue.padEnd(len * 2, '0')
        }
        return hex.substring(0, valIdx) + padded + hex.substring(valEnd)
    }

    /**
     * Replace 9F34 CVM code 0x42 (online PIN) with 0x41 (offline PIN) when f52 is omitted.
     * Keeps condition/result bytes. Matches working Verve GA path (CVM 41, no f52).
     */
    private fun rewriteEmvCvmForGaNoPin(field55Hex: String): String {
        val hex = field55Hex.replace("\\s".toRegex(), "").uppercase()
        val tag = "9F34"
        val idx = hex.indexOf(tag)
        if (idx < 0) return hex
        val lenIdx = idx + tag.length
        if (lenIdx + 2 > hex.length) return hex
        val len = hex.substring(lenIdx, lenIdx + 2).toIntOrNull(16) ?: return hex
        val valIdx = lenIdx + 2
        val valEnd = valIdx + len * 2
        if (valEnd > hex.length || len < 1) return hex
        val value = hex.substring(valIdx, valEnd)
        if (!value.startsWith("42")) return hex
        val newValue = "41" + value.substring(2)
        return hex.substring(0, valIdx) + newValue + hex.substring(valEnd)
    }

    private fun extractEmvTag(field55Hex: String?, tag: String): String? {
        if (field55Hex.isNullOrBlank()) return null
        val hex = field55Hex.replace("\\s".toRegex(), "").uppercase()
        val idx = hex.indexOf(tag.uppercase())
        if (idx < 0) return null
        val lenIdx = idx + tag.length
        if (lenIdx + 2 > hex.length) return null
        val len = hex.substring(lenIdx, lenIdx + 2).toIntOrNull(16) ?: return null
        val valIdx = lenIdx + 2
        val valEnd = valIdx + len * 2
        if (valEnd > hex.length) return null
        return hex.substring(valIdx, valEnd)
    }
}
