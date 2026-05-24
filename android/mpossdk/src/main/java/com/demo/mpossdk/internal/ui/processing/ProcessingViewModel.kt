package com.demo.mpossdk.internal.ui.processing

import android.util.Log
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.demo.mpossdk.internal.data.remote.socket.SocketChannel
import com.demo.mpossdk.internal.domain.model.EmvDetailResult
import com.demo.mpossdk.internal.domain.repository.SessionManager
import com.demo.mpossdk.internal.emv.CardScheme
import com.demo.mpossdk.internal.emv.CardType
import com.demo.mpossdk.internal.iso8583.IsoMessageBuilder
import com.demo.mpossdk.internal.iso8583.utils.ISOUtils
import com.demo.mpossdk.internal.utils.AmountUtils
import com.demo.mpossdk.internal.utils.Constants
import com.demo.mpossdk.internal.utils.LogUtil
import com.demo.mpossdk.internal.utils.toFormattedDateString
import com.demo.mpossdk.open.ErrorData
import com.demo.mpossdk.open.ErrorType
import com.demo.mpossdk.open.MposSdk
import com.demo.mpossdk.open.MposTransactionResponse
import com.demo.mpossdk.open.PaymentRequest
import com.vanstone.vm20sdk.api.CardApi
import com.vanstone.vm20sdk.api.CommonApi
import com.vanstone.vm20sdk.api.EmvApi
import com.vanstone.vm20sdk.api.IcApi
import com.vanstone.vm20sdk.api.LcdApi
import com.vanstone.vm20sdk.api.MagCardApi
import com.vanstone.vm20sdk.api.PaypassApi
import com.vanstone.vm20sdk.api.PaywaveApi
import com.vanstone.vm20sdk.api.PedApi
import com.vanstone.vm20sdk.api.PiccApi
import com.vanstone.vm20sdk.api.SystemApi
import com.vanstone.vm20sdk.constants.Led
import com.vanstone.vm20sdk.struct.COMMON_PPSE_STATUS
import com.vanstone.vm20sdk.struct.EMV_TERM_PARAM
import com.vanstone.vm20sdk.struct.QUICS_TERM_PARAM
import com.vanstone.vm20sdk.utils.ByteUtils
import com.vanstone.vm20sdk.utils.CommonConvert
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.cancel
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.receiveAsFlow
import kotlinx.coroutines.launch
import org.jpos.iso.ISOException
import org.jpos.iso.ISOMsg
import org.jpos.iso.ISOUtil
import java.io.EOFException
import java.io.IOException

internal class ProcessingViewModel(
    private val sessionManager: SessionManager,
    private val coroutineScope: CoroutineScope,
    private val isoMessageBuilder: IsoMessageBuilder,
    private val socketChannel: SocketChannel
) : ViewModel() {
    private val _actionTextLiveData = MutableLiveData("Processing...")
    val actionTextLiveData = _actionTextLiveData

    private val _errorFlow = Channel<ErrorData?>()
    val errorFlow = _errorFlow.receiveAsFlow()

    private val _transactionStatusFlow = Channel<com.demo.mpossdk.open.TransactionResult?>()
    val transactionStatusFlow = _transactionStatusFlow.receiveAsFlow()

    private val _loadingLiveData = MutableLiveData(false)
    val loadingLiveData = _loadingLiveData

    private var emvDetailResult: EmvDetailResult = EmvDetailResult()

    fun startTransaction(paymentRequest: PaymentRequest) = coroutineScope.launch {
        LcdApi.LedLightOn_Api(Led.LED_BLUE)
        SystemApi.Beep_Api(0)

        _actionTextLiveData.postValue("Please swipe/insert/tap card...")

        emvDetailResult = emvDetailResult.copy(terminalId = paymentRequest.terminalId)

        LcdApi.ScrCls_Api()
        LcdApi.ScrDisp_Api(0, 0, "Transaction Amount:", 0x08)
        LcdApi.ScrDisp_Api(1, 0, "NGN${AmountUtils.formatToTwoDecimalPlaces(paymentRequest.amount.toString())}", 0x08)
        LcdApi.ScrDisp_Api(2, 0, "Swipe/Insert/Tap card", 0x08)
        LcdApi.ScrDrLogoxy_Api(162, 96, 90, 100, Constants.clLogo)


        MagCardApi.MagClose_Api()
        var result = MagCardApi.MagOpen_Api()
        MagCardApi.MagReset_Api()
        if (result != -1) {
            LogUtil.d("Mag Api Opened")
        }

        result = PiccApi.PiccOpen_Api().toInt()
        if (result != -1) {
            LogUtil.d("Contactless Api Opened")
        }

        val dataOut = ByteArray(128)
        result = CardApi.DetectCardSupCancel_Api(CardType.fetchModes(), 60 * 1000, dataOut)

        LcdApi.LedLightOn_Api(Led.LED_YELLOW)

        _actionTextLiveData.postValue("Processing...")
        _loadingLiveData.postValue(true)

        LcdApi.ScrCls_Api()
        LcdApi.ScrDisp_Api(1, 0, "Processing...", 0x08)

        when (CardType.fromMode(result)) {
            CardType.ICC -> {
                result = PiccApi.PiccClose_Api().toInt()
                if (result == 0) {
                    LogUtil.d("Contactless Api Closed")
                }
                processIccTransaction(paymentRequest.amount)
            }

            CardType.CONTACTLESS -> {
                processContactlessTransaction(paymentRequest.amount)
            }

            CardType.MAG -> {
                result = PiccApi.PiccClose_Api().toInt()
                if (result == 0) {
                    LogUtil.d("Contactless Api Closed")
                }
                processMagTransaction(paymentRequest.amount)
            }

            CardType.UNKNOWN -> Unit
        }
    }

    private suspend fun processMagTransaction(amount: Double) {
        val buf = ByteArray(256)
        val len = ShortArray(2)
        var result = MagCardApi.MagRead_Api(buf, len)
        if(result != 0x31) {
            processTransactionResult(result)
        }

        extractEmvData()
        result = getPIN(AmountUtils.formatToTwoDecimalPlaces(amount.toString()))
        processTransactionResult(result)
    }

    private suspend fun processContactlessTransaction(amount: Double) {
        CommonApi.Common_SetIcCardType_Api(0x03, 0x00)

        val p2 = ByteArray(6)
        val isoAmount = AmountUtils.toIsoAmount(amount, "566")
        var result = PaywaveApi.PayWave_PreProcess_Api(CommonConvert.ascStringToBCD(isoAmount), p2)
        if(result == 0) {
            LogUtil.i("PAYWAVE PREPROCESS SUCCESS")
        }

        result = PaypassApi.PayPass_PreProcess_Api(CommonConvert.ascStringToBCD(isoAmount), p2)
        if (result == 0) {
            LogUtil.i("PAYPASS PREPROCESS SUCCESS")
        }

        val ppse = COMMON_PPSE_STATUS()
        result = CommonApi.Common_SelectPPSE_Api(ppse)
        var cardScheme = CardScheme.UNKNOWN

        if (result == CommonApi.EMV_OK) {
            result = PaywaveApi.PayWave_SelectApp_Api(ppse)
            if (result == CommonApi.EMV_OK) {
                cardScheme = CardScheme.VISA
            } else {
                result = PaypassApi.PayPass_SelectApp_Api(ppse)
                if (result == CommonApi.EMV_OK) {
                    cardScheme = CardScheme.MASTERCARD
                }
            }
        }

        val path = IntArray(1)
        when(cardScheme) {
            CardScheme.VISA -> {
                result = PaywaveApi.PayWave_InitApp_Api(path)
                if (result == CommonApi.EMV_OK) {
                    result = PaywaveApi.PayWave_ReadAppData_Api()
                    if (result != CommonApi.EMV_OK) {
                        //TODO -> THROW ERROR
                    }
                }
            }
            CardScheme.MASTERCARD -> {
                result = PaypassApi.PayPass_InitApp_Api(path)
                if (result == CommonApi.EMV_OK) {
                    result = PaypassApi.PayPass_ReadAppData_Api()
                    if (result != CommonApi.EMV_OK) {
                        //TODO -> THROW ERROR
                    }
                }
            }
            CardScheme.UNKNOWN -> {
                _errorFlow.send(ErrorData(ErrorType.EMV_DATA_ERROR, "Card Scheme not supported"))
                return
            }
        }

        result = PiccApi.PiccClose_Api().toInt()
        SystemApi.Beep_Api(0)

        if (result != 0) {
            if (result == -4) {
                _errorFlow.send(ErrorData(ErrorType.EMV_DATA_ERROR, "No Visa/MasterCard/Verve App"))
            } else {
                _errorFlow.send(ErrorData(ErrorType.EMV_DATA_ERROR, "Read card error"))
            }

            return
        }

        extractEmvData()
        result = getPIN(AmountUtils.formatToTwoDecimalPlaces(amount.toString()))
        processTransactionResult(result)
    }

    private suspend fun processIccTransaction(amount: Double) {
        CommonApi.Common_SetIcCardType_Api(0x01, 0x00)

        EmvApi.EMV_Clear_Api()
        val emvTermParam = EMV_TERM_PARAM()
        EmvApi.EMV_GetParam_Api(emvTermParam)
        ByteUtils.memcpy(emvTermParam.Capability, CommonConvert.ascStringToBCD("E0F1C8"))
        emvTermParam.forceOnline = 1
        EmvApi.EMV_SetParam_Api(emvTermParam)

        IcApi.IccInit_Api(0, 3, ByteArray(256), ShortArray(4))
        val isoAmount = AmountUtils.toIsoAmount(amount, "566")
        EmvApi.EMV_SetTradeAmt_Api(CommonConvert.ascStringToBCD(isoAmount), ByteArray(6))

        emvDetailResult = emvDetailResult.copy(amountAuthorisedNumeric = isoAmount)

        var result = EmvApi.EMV_SelectApp_Api(0, 1)

        if (result == 0) {
            result = EmvApi.EMV_InitApp_Api()
        }

        if (result == 0) {
            result = EmvApi.EMV_ReadAppData_Api()
        }

        if (result != 0) {
            if (result == -4) {
                _errorFlow.send(ErrorData(ErrorType.EMV_DATA_ERROR, "No Visa/MasterCard/Verve App"))
            } else {
                _errorFlow.send(ErrorData(ErrorType.EMV_DATA_ERROR, "Read card error"))
            }

            return
        }

        extractEmvData()

        if (emvDetailResult.cardNo == null) {
            return
        }

        result = EmvApi.EMV_OfflineDataAuth_Api()
        if (result != 0) {
            processTransactionResult(result)
        }

        result = EmvApi.EMV_ProcRestrictions_Api()
        if (result != 0) {
            processTransactionResult(result)
        }

        result = EmvApi.EMV_RiskManagement_Api()
        if (result != 0) {
            processTransactionResult(result)
            return
        }

        val needOnline = IntArray(1)
        result = EmvApi.EMV_TermActAnalyse_Api(needOnline)
        if (result != 0) {
            processTransactionResult(result)
            return
        }

        result = getPIN(AmountUtils.formatToTwoDecimalPlaces(amount.toString()))

        if (result != CommonApi.EMV_OK) {
            processTransactionResult(result)
            return
        }

        _actionTextLiveData.postValue("Processing...")

        LcdApi.ScrCls_Api()
        LcdApi.ScrDisp_Api(3, 0, "Processing...", Led.LED_RED)

        result = EmvApi.EMV_Complete_Api(
            CommonApi.ONLINE_APPROVE,
            CommonConvert.ascStringToBCD("3030"),
            ByteArray(2), 0,
            ByteArray(2), 0,
            ByteArray(400), 0
        )

        processTransactionResult(result)
    }

    private suspend fun processTransactionResult(result: Int) {
        when(result) {
            CommonApi.EMV_OK -> {
                extractIccData()

                postToHostServer()
            }
            CommonApi.ERR_USERCANCEL -> {
                LcdApi.ScrCls_Api()
                LcdApi.ScrDisp_Api(1, 0, "Transaction Cancelled!", Led.LED_RED)

                _loadingLiveData.postValue(false)
                _errorFlow.send(ErrorData(ErrorType.TRANSACTION_FAILED, "Transaction Cancelled!"))
            }
            CommonApi.ERR_TIMEOUT -> {
                LcdApi.ScrCls_Api()
                LcdApi.ScrDisp_Api(1, 0, "Transaction Timeout!", Led.LED_RED)

                _loadingLiveData.postValue(false)
                _errorFlow.send(ErrorData(ErrorType.TRANSACTION_FAILED, "Transaction Timeout!"))
            }
            else -> {
                LcdApi.LedLightOn_Api(Led.LED_RED)
                LcdApi.ScrCls_Api()
                LcdApi.ScrDisp_Api(1, 0, "Transaction Failed!", Led.LED_RED)

                _loadingLiveData.postValue(false)
                _errorFlow.send(ErrorData(ErrorType.TRANSACTION_FAILED, "Transaction Failed!"))

                SystemApi.Beep_Api(1)
                SystemApi.Beep_Api(1)
                SystemApi.Beep_Api(1)
            }
        }

        LcdApi.LedLightOff_Api(Led.LED_ALL)
        LcdApi.ScrCls_Api()
        SystemApi.BackToMainMenu_Api()
    }

    private suspend fun postToHostServer() {
        try {
            LcdApi.LedLightOn_Api(0x04)
            LcdApi.ScrCls_Api()
            LcdApi.ScrDisp_Api(1, 0, "Processing on Server...", 0x08)

            SystemApi.Beep_Api(1)

            _transactionStatusFlow.send(
                com.demo.mpossdk.open.TransactionResult(
                    status = "emv_data_ready",
                    emvData = emvDetailResult
                )
            )
        } catch (e: Exception) {
            e.printStackTrace()
            _errorFlow.send(ErrorData(ErrorType.UNKNOWN_ERROR, "An error occurred extracting EMV data"))
        }
    }

    private fun setupTransactionResponse(
        response: ISOMsg,
        emvDetailResult: EmvDetailResult
    ): MposTransactionResponse {
        val responseCode = response.getString(39)
        val authCode = when {
            response.hasField(38) -> response.getString(38)
            else -> null
        }

        return MposTransactionResponse(
            aid = emvDetailResult.aid!!,
            amount = AmountUtils.fromIsoAmount(emvDetailResult.amountAuthorisedNumeric!!),
            cashbackAmount = AmountUtils.fromIsoAmount(emvDetailResult.amountOtherNumeric ?: "0"),
            appLabel = emvDetailResult.applicationLabel!!,
            authCode = authCode,
            cardExpireDate = emvDetailResult.cardExpirationDate!!,
            cardHolderName = emvDetailResult.cardHolderName ?: "N/A",
            dateTime = System.currentTimeMillis().toFormattedDateString(),
            maskedPan = ISOUtils.maskCardPAN(emvDetailResult.cardNo ?: ""),
            message = ISOUtils.getNibssMessage(responseCode),
            rrn = response.getString(37),
            stan = response.getString(11),
            statusCode = responseCode,
            transactionType = "PURCHASE",
        )
    }


    private suspend fun extractEmvData() {
        val buf = ByteArray(256)
        val len = IntArray(2)

        //Card No
        var result = CommonApi.Common_GetTLV_Api(0x5A, buf, len)
        if (result == 0) {
            val pan = CommonConvert.bcdToASCString(buf, 0, len[0]).replace("F", "")
            emvDetailResult = emvDetailResult.copy(cardNo = pan)
        } else {
            result = CommonApi.Common_GetTLV_Api(0x57, buf, len)
            if (result == 0) {
                val track2 = CommonConvert.bcdToASCString(buf, 0, len[0])
                emvDetailResult = emvDetailResult.copy(cardNo = track2.substring(0, track2.indexOf('D')))
            } else {
                _errorFlow.send(ErrorData(ErrorType.EMV_DATA_ERROR, "Read card error"))
                return
            }
        }

        //Application Label
        result = CommonApi.Common_GetTLV_Api(0x50, buf, len)
        if (result == 0) {
            val appLabel = ISOUtil.byte2hex(buf, 0, len[0])
            emvDetailResult = emvDetailResult.copy(applicationLabel = ISOUtils.hexToAscii(appLabel))
        }

        //Track2Data
        result = CommonApi.Common_GetTLV_Api(0x57, buf, len)
        if (result == 0) {
            val track2 = CommonConvert.bcdToASCString(buf, 0, len[0])
            emvDetailResult = emvDetailResult.copy(track2Data = track2)

            //AcquirerInstitutionId
            emvDetailResult = emvDetailResult.copy(
                acquirerInstitutionId = ISOUtils.getAcquirerInstitutionIdFromTrack2Data(track2)
            )

            //Card Expire Date
            emvDetailResult = emvDetailResult.copy(
                cardExpirationDate = ISOUtils.getCardExpiryDateFromTrack2Data(track2)
            )

            //serviceCode
            emvDetailResult = emvDetailResult.copy(
                serviceCode = ISOUtils.getServiceCodeFromTrack2Data(track2)
            )

            //PVV
            emvDetailResult = emvDetailResult.copy(
                pinVerificationValue = ISOUtils.getPinVerificationValueFromTrack2Data(track2)
            )

            //CVV
            emvDetailResult = emvDetailResult.copy(
                cardVerificationValue = ISOUtils.getCardVerificationValueFromTrack2Data(track2)
            )
        }

        //CardHolder Name
        result = CommonApi.Common_GetTLV_Api(0x5F20, buf, len)
        if (result == 0) {
            val cardHolderName = ISOUtil.byte2hex(buf, 0, len[0])
            emvDetailResult = emvDetailResult.copy(cardHolderName = ISOUtils.hexToAscii(cardHolderName).trim())
        }

        //AID
        result = CommonApi.Common_GetTLV_Api(0x9F06, buf, len)
        if (result == 0) {
            val aid = CommonConvert.bcdToASCString(buf, 0, len[0])
            emvDetailResult = emvDetailResult.copy(aid = aid)
        }

        //Card Sequence Number
        result = CommonApi.Common_GetTLV_Api(0x5F34, buf, len)
        if (result == 0) {
            val cardSequenceNumber = CommonConvert.bcdToASCString(buf, 0, len[0])
            emvDetailResult = emvDetailResult.copy(cardSequenceNumber = cardSequenceNumber)
        }

        //Point of Service Entry Mode
        result = CommonApi.Common_GetTLV_Api(0x5F30, buf, len)
        if (result == 0) {
            val posData = CommonConvert.bcdToASCString(buf, 0, len[0])
            emvDetailResult = emvDetailResult.copy(pointOfServiceEntryMode = posData)
        }

        LogUtil.i("EMV DETAILS --> $emvDetailResult")
    }

    private fun extractIccData() {
        LogUtil.d("EXTRACT ICC DATA :::::::::::::::::::::")

        val buf = ByteArray(256)
        val len = IntArray(2)

        var iccData = ""
        val tagList = ISOUtils.getIccDataTags()
        for (emvTLV in tagList) {
            val ret = CommonApi.Common_GetTLV_Api(emvTLV.value.toInt(16), buf, len)
            if (ret == 0) {
                val tagValue = CommonConvert.bcdToASCString(buf, 0, len[0])
                val tagLength = countByTwoGetSize(tagValue)
                LogUtil.d("TLV : ${emvTLV.value + tagLength + tagValue.uppercase()}")
                LogUtil.d("------------------------------------")
                iccData += (emvTLV.value + tagLength + tagValue.uppercase())
            }
        }

        LogUtil.d("ICC DATA : $iccData")
        emvDetailResult = emvDetailResult.copy(iccData = iccData)
    }

    private fun countByTwoGetSize(inputString: String): String {
        val halfLength = inputString.length / 2
        return if (halfLength <= 9) {
            String.format("%02d", halfLength) // Format with leading zero if single digit
        } else {
            Integer.toHexString(halfLength) // Return normal string representation otherwise
        }
    }

    private fun getPIN(amount: String): Int {
        _actionTextLiveData.postValue("Enter Card PIN")

        LcdApi.ScrCls_Api()
        LcdApi.ScrDisp_Api(0, 0, "NGN$amount", 0x08)
        LcdApi.ScrDisp_Api(1, 0, "Enter PIN:", 0x08)

        val pin = ByteArray(8)
        val panBytes = emvDetailResult.cardNo!!.toByteArray()
        val result = PedApi.PEDGetPwd_Api(0x01, 4, 6, panBytes, pin, 0x03)

        emvDetailResult = emvDetailResult.copy(pinBlock = CommonConvert.bytes2HexString(pin))

        LogUtil.d("PIN BLOCK : ${emvDetailResult.pinBlock}")

        return if (result == 1 || result == 2) -1 else 0
    }

    override fun onCleared() {
        super.onCleared()
        LogUtil.d("onCleared")
        coroutineScope.cancel()
    }

    suspend fun cancelTransaction() {
        processTransactionResult(CommonApi.ERR_USERCANCEL)
    }
}
