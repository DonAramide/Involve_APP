package com.demo.mpossdk.internal.emv

import android.util.Log
import com.demo.mpossdk.internal.domain.model.TerminalParameters
import com.demo.mpossdk.internal.iso8583.cryptographyUtils.TripleDESUtils
import com.demo.mpossdk.internal.utils.Constants
import com.demo.mpossdk.internal.utils.LogUtil
import com.vanstone.vm20sdk.api.CommonApi
import com.vanstone.vm20sdk.api.EmvApi
import com.vanstone.vm20sdk.api.PaypassApi
import com.vanstone.vm20sdk.api.PaywaveApi
import com.vanstone.vm20sdk.api.PedApi
import com.vanstone.vm20sdk.struct.COMMON_TERMINAL_PARAM
import com.vanstone.vm20sdk.struct.EMV_APPLIST
import com.vanstone.vm20sdk.struct.EMV_CAPK
import com.vanstone.vm20sdk.struct.EMV_TERM_PARAM
import com.vanstone.vm20sdk.struct.PAYPASS_APPLIST
import com.vanstone.vm20sdk.struct.PAYWAVE_APPLIST
import com.vanstone.vm20sdk.utils.ByteUtils
import com.vanstone.vm20sdk.utils.CommonConvert

internal object ParamUtils {

    /**
     * Initializes the necessary parameters and resources.
     * This function performs the following steps:
     * 1. Sets common parameters.
     * 2. Downloads required keys.
     * 3. Loads the AID (Application Identifier).
     * 4. Loads the CAPK (Certificate Authority Public Key), and upon completion, invokes the onParamLoaded callback.
     *    Params:
     *
     * [onParamLoaded] - Callback to be executed after all parameters have been loaded.
     */
    fun init(terminalParameters: TerminalParameters? = null, onParamLoaded: () -> Unit) {
        setCommonParam(terminalParameters)
        downloadKeys(terminalParameters)
        loadAID()
        loadCAPK(onParamLoaded)
    }

    private fun setCommonParam(terminalParameters: TerminalParameters?) {
        LogUtil.i(">>>>>> START COMMON PARAM <<<<<<")

        val emvTermParam = EMV_TERM_PARAM()
        EmvApi.EMV_GetParam_Api(emvTermParam)

        ByteUtils.memcpy(emvTermParam.Capability, CommonConvert.ascStringToBCD("E0F1C8"))
        emvTermParam.ForceOnline = 1
        EmvApi.EMV_SetParam_Api(emvTermParam)

        val param = COMMON_TERMINAL_PARAM()
        CommonApi.Common_GetParam_Api(param)
        //val terminalId = CommonConvert.hexStringToByte(terminalParameters.terminalId)
        val currencyCode = CommonConvert.hexStringToByte("0566")
        val countryCode = CommonConvert.hexStringToByte("0566")
        //System.arraycopy(terminalId, 0, param.termId, 0, 2)
        System.arraycopy(currencyCode, 0, param.TransCurrCode, 0, 2)
        System.arraycopy(countryCode, 0, param.CountryCode, 0, 2)
        param.terminalType = 0x22
        param.transCurrExp = 0x02
        CommonApi.Common_SaveParam_Api(param)

        LogUtil.i(">>>>>> END COMMON PARAM <<<<<<")
    }

    private fun downloadKeys(terminalParameters: TerminalParameters?) {
        LogUtil.i(">>>>>> START DOWNLOAD KEYS <<<<<<")
        var result: Int

        val mKeyIndex = 0
        val wKeyIndex = 1
        result = PedApi.PEDWriteMKey_Api(
            mKeyIndex,
            0x03,
            CommonConvert.hexStringToByte(Constants.MASTER_KEY)
            //CommonConvert.hexStringToByte(terminalParameters.tmk)
        )
        LogUtil.e("PEDWriteMKey_Api: $result")

        val tripleDESUtils = TripleDESUtils(CommonConvert.hexStringToByte(Constants.MASTER_KEY))
        val encoded = tripleDESUtils.encode(CommonConvert.hexStringToByte(Constants.PIN_KEY))
        if (result == 0) {
            result = PedApi.PEDWriteWKey_Api(
                mKeyIndex,
                wKeyIndex,
                0x83,
                encoded
                //CommonConvert.hexStringToByte(terminalParameters.tpk2)
            )
            LogUtil.e("PEDWriteMKey_Api: $result")
        }

        LogUtil.i(">>>>>> END DOWNLOAD KEYS <<<<<<")
    }

    private fun loadAID() {
        LogUtil.i(">>>>>> START LOAD AID <<<<<<")
        var result: Int

        CommonApi.Common_Init_Api();
        EmvApi.EMV_ClearApp_Api()
        val emvAppList = EMV_APPLIST()

        //VISA
        emvAppList.aid = CommonConvert.hexStringToByte("A0000000031010")
        emvAppList.aidLen = 7
        emvAppList.FloorLimit = 10000
        emvAppList.floorLimitCheck = 1
        emvAppList.SelFlag = CommonApi.PART_MATCH
        result = EmvApi.EMV_AddApp_Api(emvAppList)
        if (result != -1) {
            LogUtil.i(">>>>> ADDED VISA CREDIT DEBIT APP <<<<<")
        }

        emvAppList.aid = CommonConvert.hexStringToByte("A0000000032010")
        emvAppList.aidLen = 7
        emvAppList.FloorLimit = 10000
        emvAppList.floorLimitCheck = 1
        emvAppList.SelFlag = CommonApi.PART_MATCH
        result = EmvApi.EMV_AddApp_Api(emvAppList)
        if (result != -1) {
            LogUtil.i(">>>>> ADDED VISA ELECTRON APP <<<<<")
        }

        //MASTERCARD
        emvAppList.aid = CommonConvert.hexStringToByte("A0000000041010")
        emvAppList.aidLen = 7
        emvAppList.FloorLimit = 10000
        emvAppList.floorLimitCheck = 1
        emvAppList.SelFlag = CommonApi.PART_MATCH
        result = EmvApi.EMV_AddApp_Api(emvAppList)
        if (result != -1) {
            LogUtil.i(">>>>> ADDED MASTERCARD CREDIT DEBIT APP <<<<<")
        }

        emvAppList.aid = CommonConvert.hexStringToByte("A0000000042203")
        emvAppList.aidLen = 7
        emvAppList.FloorLimit = 10000
        emvAppList.floorLimitCheck = 1
        emvAppList.SelFlag = CommonApi.PART_MATCH
        result = EmvApi.EMV_AddApp_Api(emvAppList)
        if (result != -1) {
            LogUtil.i(">>>>> ADDED MASTERCARD SPECIFIC APP <<<<<")
        }

        emvAppList.aid = CommonConvert.hexStringToByte("A0000000043060")
        emvAppList.aidLen = 7
        emvAppList.FloorLimit = 10000
        emvAppList.floorLimitCheck = 1
        emvAppList.SelFlag = CommonApi.PART_MATCH
        result = EmvApi.EMV_AddApp_Api(emvAppList)
        if (result != -1) {
            LogUtil.i(">>>>> ADDED MAESTRO CREDIT DEBIT APP <<<<<")
        }

        //VERVE
        emvAppList.aid = CommonConvert.hexStringToByte("A0000003710001")
        emvAppList.aidLen = 7
        emvAppList.FloorLimit = 10000
        emvAppList.floorLimitCheck = 1
        emvAppList.SelFlag = CommonApi.PART_MATCH
        result = EmvApi.EMV_AddApp_Api(emvAppList)
        if (result != -1) {
            LogUtil.i(">>>>> ADDED INTERSWITCH VERVE APP <<<<<")
        }

        emvAppList.aid = CommonConvert.hexStringToByte("A0000003710002")
        emvAppList.aidLen = 7
        emvAppList.FloorLimit = 10000
        emvAppList.floorLimitCheck = 1
        emvAppList.SelFlag = CommonApi.PART_MATCH
        result = EmvApi.EMV_AddApp_Api(emvAppList)
        if (result != -1) {
            LogUtil.i(">>>>> ADDED INTERSWITCH VERVE APP <<<<<")
        }

        //Visa Contactless
        PaywaveApi.PayWave_ClearApp_Api()
        val paywaveApplist = PAYWAVE_APPLIST()
        System.arraycopy(
            byteArrayOf(0xA0.toByte(), 0x00, 0x00, 0x00, 0x03),
            0,
            paywaveApplist.AID,
            0,
            5
        )
        paywaveApplist.AidLen = 5
        paywaveApplist.bTransLimitCheck = 0
        paywaveApplist.TransLimit = 90000000
        result = PaywaveApi.PayWave_AddApp_Api(paywaveApplist)
        if (result != -1) {
            LogUtil.i(">>>>> ADDED VISA CONTACTLESS APP 1 <<<<<")
        }

        System.arraycopy(
            byteArrayOf(0xA0.toByte(), 0x00, 0x00, 0x08, 0x13),
            0,
            paywaveApplist.AID,
            0,
            5
        )
        paywaveApplist.AidLen = 5
        paywaveApplist.bTransLimitCheck = 0
        paywaveApplist.TransLimit = 90000000
        result = PaywaveApi.PayWave_AddApp_Api(paywaveApplist)
        if (result != -1) {
            LogUtil.i(">>>>> ADDED VISA CONTACTLESS APP 2 <<<<<")
        }

        //Mastercard Contactless
        PaypassApi.PayPass_ClearApp_Api()
        val paypassApplist = PAYPASS_APPLIST()
        paypassApplist.TransLimitNoODCVM = 30000
        System.arraycopy(
            byteArrayOf(0xA0.toByte(), 0x00, 0x00, 0x00, 0x04),
            0,
            paypassApplist.AID,
            0,
            5
        )
        paypassApplist.AidLen = 5
        paypassApplist.KernelID = 0x02
        paypassApplist.KernelConfig = 0x20
        paypassApplist.FloorLimit = 10000
        result = PaypassApi.PayPass_AddApp_Api(paypassApplist)
        if (result != -1) {
            LogUtil.i(">>>>> ADDED MASTERCARD CONTACTLESS APP <<<<<")
        }

        LogUtil.i(">>>>>> END LOAD AID <<<<<<")
    }

    private fun loadCAPK(onParamLoaded: () -> Unit) {
        LogUtil.i(">>>>>> START LOAD CAPK <<<<<<")
        var result: Int
        val capk = EMV_CAPK()

        //VISA
        capk.exponent[0] = 0x03
        capk.exponentLen = 1
        capk.keyID = 0x08
        capk.rid = CommonConvert.hexStringToByte("A000000003")
        capk.modul = CommonConvert.hexStringToByte("D9FD6ED75D51D0E30664BD157023EAA1FFA871E4DA65672B863D255E81E137A51DE4F72BCC9E44ACE12127F87E263D3AF9DD9CF35CA4A7B01E907000BA85D24954C2FCA3074825DDD4C0C8F186CB020F683E02F2DEAD3969133F06F7845166ACEB57CA0FC2603445469811D293BFEFBAFAB57631B3DD91E796BF850A25012F1AE38F05AA5C4D6D03B1DC2E568612785938BBC9B3CD3A910C1DA55A5A9218ACE0F7A21287752682F15832A678D6E1ED0B")
        capk.ModulLen = capk.modul.size.toByte()
        capk.checkSum = CommonConvert.hexStringToByte("20D213126955DE205ADC2FD2822BD22DE21CF9A8")
        capk.expDate = byteArrayOf(0x24, 0x12, 0x31)
        capk.arithInd = 1
        capk.hashInd = 1

        result = CommonApi.Common_AddCapk_Api(capk)
        if (result != -1) {
            LogUtil.i(">>>>> ADDED VISA CAPK 1 <<<<<")
        }

        capk.exponent[0] = 0x03
        capk.exponentLen = 1
        capk.keyID = 0x09
        capk.rid = CommonConvert.hexStringToByte("A000000003")
        capk.modul = CommonConvert.hexStringToByte("9D912248DE0A4E39C1A7DDE3F6D2588992C1A4095AFBD1824D1BA74847F2BC4926D2EFD904B4B54954CD189A54C5D1179654F8F9B0D2AB5F0357EB642FEDA95D3912C6576945FAB897E7062CAA44A4AA06B8FE6E3DBA18AF6AE3738E30429EE9BE03427C9D64F695FA8CAB4BFE376853EA34AD1D76BFCAD15908C077FFE6DC5521ECEF5D278A96E26F57359FFAEDA19434B937F1AD999DC5C41EB11935B44C18100E857F431A4A5A6BB65114F174C2D7B59FDF237D6BB1DD0916E644D709DED56481477C75D95CDD68254615F7740EC07F330AC5D67BCD75BF23D28A140826C026DBDE971A37CD3EF9B8DF644AC385010501EFC6509D7A41")
        capk.ModulLen = capk.modul.size.toByte()
        capk.checkSum = CommonConvert.hexStringToByte("1FF80A40173F52D7D27E0F26A146A1C8CCB29046")
        capk.expDate = byteArrayOf(0x31, 0x12, 0x33)
        capk.arithInd = 1
        capk.hashInd = 1

        result = CommonApi.Common_AddCapk_Api(capk)
        if (result != -1) {
            LogUtil.i(">>>>> ADDED VISA CAPK 2 <<<<<")
        }

        //MASTERCARD
        capk.exponent[0] = 0x03
        capk.exponentLen = 1
        capk.keyID = 0x05
        capk.rid = CommonConvert.hexStringToByte("A000000004")
        capk.modul = CommonConvert.hexStringToByte("B8048ABC30C90D976336543E3FD7091C8FE4800DF820ED55E7E94813ED00555B573FECA3D84AF6131A651D66CFF4284FB13B635EDD0EE40176D8BF04B7FD1C7BACF9AC7327DFAA8AA72D10DB3B8E70B2DDD811CB4196525EA386ACC33C0D9D4575916469C4E4F53E8E1C912CC618CB22DDE7C3568E90022E6BBA770202E4522A2DD623D180E215BD1D1507FE3DC90CA310D27B3EFCCD8F83DE3052CAD1E48938C68D095AAC91B5F37E28BB49EC7ED597")
        capk.ModulLen = capk.modul.size.toByte()
        capk.checkSum = CommonConvert.hexStringToByte("EBFA0D5D06D8CE702DA3EAE890701D45E274C845")
        capk.expDate = byteArrayOf(0x24, 0x12, 0x31)
        capk.arithInd = 1
        capk.hashInd = 1

        result = CommonApi.Common_AddCapk_Api(capk)
        if (result != -1) {
            LogUtil.i(">>>>> ADDED MASTERCARD CAPK 1 <<<<<")
        }

        capk.exponent[0] = 0x03
        capk.exponentLen = 1
        capk.keyID = 0x09
        capk.rid = CommonConvert.hexStringToByte("A000000004")
        capk.modul = CommonConvert.hexStringToByte("CB26FC830B43785B2BCE37C81ED334622F9622F4C89AAE641046B2353433883F307FB7C974162DA72F7A4EC75D9D657336865B8D3023D3D645667625C9A07A6B7A137CF0C64198AE38FC238006FB2603F41F4F3BB9DA1347270F2F5D8C606E420958C5F7D50A71DE30142F70DE468889B5E3A08695B938A50FC980393A9CBCE44AD2D64F630BB33AD3F5F5FD495D31F37818C1D94071342E07F1BEC2194F6035BA5DED3936500EB82DFDA6E8AFB655B1EF3D0D7EBF86B66DD9F29F6B1D324FE8B26CE38AB2013DD13F611E7A594D675C4432350EA244CC34F3873CBA06592987A1D7E852ADC22EF5A2EE28132031E48F74037E3B34AB747F")
        capk.ModulLen = capk.modul.size.toByte()
        capk.checkSum = CommonConvert.hexStringToByte("F910A1504D5FFB793D94F3B500765E1ABCAD72D9")
        capk.expDate = byteArrayOf(0x28, 0x12, 0x31)
        capk.arithInd = 1
        capk.hashInd = 1

        result = CommonApi.Common_AddCapk_Api(capk)
        if (result != -1) {
            LogUtil.i(">>>>> ADDED MASTERCARD CAPK 2 <<<<<")
        }

        //VERVE
        capk.exponent[0] = 0x03
        capk.exponentLen = 1
        capk.keyID = 0x05
        capk.rid = byteArrayOf(-96, 0, 0, 3, 113)
        capk.modul = CommonConvert.hexStringToByte("B036A8CAE0593A480976BFE84F8A67759E52B3D9F4A68CCC37FE720E594E5694CD1AE20E1B120D7A18FA5C70E044D3B12E932C9BBD9FDEA4BE11071EF8CA3AF48FF2B5DDB307FC752C5C73F5F274D4238A92B4FCE66FC93DA18E6C1CC1AA3CFAFCB071B67DAACE96D9314DB494982F5C967F698A05E1A8A69DA931B8E566270F04EAB575F5967104118E4F12ABFF9DEC92379CD955A10675282FE1B60CAD13F9BB80C272A40B6A344EA699FB9EFA6867")
        capk.ModulLen = capk.modul.size.toByte()
        capk.checkSum = CommonConvert.hexStringToByte("676822D335AB0D2C3848418CB546DF7B6A6C32C0")
        capk.expDate = byteArrayOf(31, 12, 49)
        capk.arithInd = 1
        capk.hashInd = 1

        result = CommonApi.Common_AddCapk_Api(capk)
        if (result != -1) {
            LogUtil.i(">>>>> ADDED VERVE CAPK 1 <<<<<")
        }

        capk.exponent[0] = 0x03
        capk.exponentLen = 1
        capk.keyID = 0x04
        capk.rid = byteArrayOf(-96, 0, 0, 3, 113)
        capk.modul = CommonConvert.hexStringToByte("D13CD5E1B921E4E0F0D40E2DE14CCE73E3A34ED2DCFA826531D8195641091E37C8474D19B686E8243F089A69F7B18D2D34CB4824F228F7750F96D1EFBDFF881F259A8C04DE64915A3A3D7CB846135F4083C93CDE755BC808886F600542DFF085558D5EA7F45CB15EC835064AA856D602A0A44CD021F54CF8EC0CC680B54B3665ABE74A7C43D02897FF84BB4CB98BC91D")
        capk.ModulLen = capk.modul.size.toByte()
        capk.checkSum = CommonConvert.hexStringToByte("8B36A3E3D814CE6C6EBEAAF27674BB7BC67275B1")
        capk.expDate = byteArrayOf(31, 12, 49)
        capk.arithInd = 1
        capk.hashInd = 1

        result = CommonApi.Common_AddCapk_Api(capk)
        if (result != -1) {
            LogUtil.i(">>>>> ADDED VERVE CAPK 2 <<<<<")
        }

        capk.exponent[0] = 0x03
        capk.exponentLen = 1
        capk.keyID = 0x03
        capk.rid = byteArrayOf(-96, 0, 0, 3, 113)
        capk.modul = CommonConvert.hexStringToByte("d06238b856cf2c8890a7f668ca17c19247498d193a7c11e7105dedeee6a873e8189e50493e9b17547c42ea4fa88bbef30bb6bc2409246ccc95f36622a7f4d92d46444f20b1b24bf63c5b28395d8ef18c23205c2119dfe5fba2fbfc311b2fe8a6a75b35a7dab72d421792a500cdfd8133b8a97d84a49c0bd22d52d06ea5e0ef3e471d47d8370c37aa48b564689d0035d9")
        capk.ModulLen = capk.modul.size.toByte()
        capk.checkSum = CommonConvert.hexStringToByte("319F3C608B67F1118C729B0E1516EAB07CB290C8")
        capk.expDate = byteArrayOf(31, 12, 49)
        capk.arithInd = 1
        capk.hashInd = 1

        result = CommonApi.Common_AddCapk_Api(capk)
        if (result != -1) {
            LogUtil.i(">>>>> ADDED VERVE CAPK 3 <<<<<")

            onParamLoaded()
        }

        LogUtil.i(">>>>>> END LOAD CAPK <<<<<<")
    }
}