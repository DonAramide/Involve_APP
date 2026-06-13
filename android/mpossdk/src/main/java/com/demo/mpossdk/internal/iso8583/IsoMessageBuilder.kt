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
            isoMsg.set(64, ISOUtil.hex2byte(Constants.SIXTY_FOUR_ZEROS))
            isoMsg.recalcBitMap()

            val prePack = isoMsg.pack()
            isoMsg.set(
                64,
                Sha256Utils.performSha256Hash(
                    ISOUtil.trim(prePack, prePack.size - 64),
                    ISOUtil.hex2byte(terminalParameters.tsk)
                )
            )
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
        purchaseRequest.set(35, emvDetailResult.track2Data)
        purchaseRequest.set(37, ISOUtils.generateRetrievalReferenceNumber(transactionDateTime, purchaseRequest.getString(11)))
        purchaseRequest.set(40, emvDetailResult.serviceCode)
        purchaseRequest.set(55, emvDetailResult.iccData)
        purchaseRequest.set(123, Constants.POS_DATA_CODE)
        purchaseRequest.set(128, ISOUtil.hex2byte(Constants.SIXTY_FOUR_ZEROS))

        // Commented out pin data as requested by user's update
        // emvDetailResult.pinBlock?.let { block ->
        //     if (block.length == 16) {
        //         purchaseRequest.set(52, block)
        //     }
        // }

        val activeHost = terminalParameters?.activeHost ?: com.demo.mpossdk.open.ActiveHost.MEDUSA
        
        if (activeHost == com.demo.mpossdk.open.ActiveHost.EXPRESS_PAY && terminalParameters != null) {
            purchaseRequest.set(18, terminalParameters.mcc)
            purchaseRequest.set(41, terminalParameters.terminalId)
            purchaseRequest.set(42, terminalParameters.cardAcceptorId)
            purchaseRequest.set(43, terminalParameters.cardAcceptorLocation)
            purchaseRequest.set(49, terminalParameters.currencyCode)
        } else {
            // MEDUSA / Default
            purchaseRequest.set(18, "5411")
            purchaseRequest.set(41, emvDetailResult.terminalId)
            purchaseRequest.set(42, "2214LA596401018")
            purchaseRequest.set(43, "3LINE CARD MANAGEMENT LLA           LANG")
            purchaseRequest.set(49, "566")
        }

        // Set Field 59
        val terminalId = if (activeHost == com.demo.mpossdk.open.ActiveHost.EXPRESS_PAY && terminalParameters != null) {
            terminalParameters.terminalId ?: ""
        } else {
            emvDetailResult.terminalId ?: ""
        }
        val rawSerial = sessionManager.getDeviceName() ?: "000"
        val cleanSerial = rawSerial.replace("[^a-zA-Z0-9]".toRegex(), "").removeSuffix("android")
        val rrn = purchaseRequest.getString(37) ?: ""
        purchaseRequest.set(59, "$terminalId$cleanSerial$rrn")

        purchaseRequest.recalcBitMap()

        val prePack = purchaseRequest.pack()
        val hashKey = if (activeHost == com.demo.mpossdk.open.ActiveHost.EXPRESS_PAY && terminalParameters != null) {
            terminalParameters.tsk ?: ""
        } else {
            Constants.MASTER_KEY
        }
        
        purchaseRequest.set(
            128,
            Sha256Utils.performSha256Hash(
                ISOUtil.trim(prePack, prePack.size - 64),
                ISOUtil.hex2byte(hashKey)
            )
        )
        return purchaseRequest
    }

//    fun buildPurchaseMessage(
//        emvDetailResult: EmvDetailResult
//    ): ISOMsg {
//        val terminalParameters = sessionManager.getTerminalParameters()!!
//        val purchaseRequest = ISOMsg()
//        purchaseRequest.packager = transactionPackager
//        purchaseRequest.mti = ISOMessageType._0200.value
//        purchaseRequest.set(2, emvDetailResult.cardNo)
//        purchaseRequest.set(3, ISOProcCode.PURCHASE_ISO_PROC_CODE.value)
//        purchaseRequest.set(4, emvDetailResult.amountAuthorisedNumeric)
//        purchaseRequest.set(7, transactionDateTime)
//        purchaseRequest.set(11, ISOUtils.getStan())
//        purchaseRequest.set(12, transactionTime)
//        purchaseRequest.set(13, transactionDate)
//        purchaseRequest.set(14, emvDetailResult.cardExpirationDate)
//        purchaseRequest.set(18, terminalParameters.mcc)
//        purchaseRequest.set(22, Constants.POS_ENTRY_MODE)
//        purchaseRequest.set(23, ISOUtil.zeropad(emvDetailResult.cardSequenceNumber, 3))
//        purchaseRequest.set(25, Constants.POS_CONDITION_CODE)
//        purchaseRequest.set(26, Constants.POS_PIN_CAPTURE_CODE)
//        purchaseRequest.set(28, "D00000000")
//        purchaseRequest.set(32, emvDetailResult.acquirerInstitutionId)
//        purchaseRequest.set(35, emvDetailResult.track2Data)
//        purchaseRequest.set(37, ISOUtils.generateRetrievalReferenceNumber(transactionDateTime, purchaseRequest.getString(11)))
//        purchaseRequest.set(40, emvDetailResult.serviceCode)
//        purchaseRequest.set(41, terminalParameters.terminalId)
//        purchaseRequest.set(42, terminalParameters.cardAcceptorId)
//        purchaseRequest.set(43, terminalParameters.cardAcceptorLocation)
//        purchaseRequest.set(49, terminalParameters.currencyCode)
//        emvDetailResult.pinBlock?.let { block ->
//            if (block.length == 16) {
//                purchaseRequest.set(52, block)
//            }
//        }
//        purchaseRequest.set(55, emvDetailResult.iccData)
//        purchaseRequest.set(123, Constants.POS_DATA_CODE)
//        purchaseRequest.set(128, ISOUtil.hex2byte(Constants.SIXTY_FOUR_ZEROS))
//        purchaseRequest.recalcBitMap()
//
//        val prePack = purchaseRequest.pack()
//        purchaseRequest.set(
//            128,
//            Sha256Utils.performSha256Hash(
//                ISOUtil.trim(prePack, prePack.size - 64),
//                ISOUtil.hex2byte(terminalParameters.tsk)
//            )
//        )
//        return purchaseRequest
//    }
}