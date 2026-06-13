package com.demo.mpossdk

import com.demo.mpossdk.internal.iso8583.utils.PosPackager
import org.jpos.iso.ISOMsg
import org.jpos.iso.ISOUtil
import org.junit.Test

class HexDumpTest {
    @Test
    fun testHexDump() {
        val isoMsg = ISOMsg()
        isoMsg.packager = PosPackager()
        isoMsg.mti = "0800"
        isoMsg.set(3, "9A0000")
        isoMsg.set(7, "0611125925")
        isoMsg.set(11, "958552")
        isoMsg.set(12, "125925")
        isoMsg.set(13, "0611")
        isoMsg.set(41, "2214OTGF")

        val packed = isoMsg.pack()
        println("HEXDUMP_RESULT: " + ISOUtil.hexString(packed))
    }
}
