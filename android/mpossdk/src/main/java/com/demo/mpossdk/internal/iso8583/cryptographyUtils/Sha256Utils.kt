package com.demo.mpossdk.internal.iso8583.cryptographyUtils

import java.security.MessageDigest
import java.security.NoSuchAlgorithmException

internal object Sha256Utils {
    private const val TAG = "Sha256Utils"

    fun performSha256Hash(input: ByteArray?, seed: ByteArray?): ByteArray? {
        val bb: Byte = 0x00

        //perform hash
        val md: MessageDigest
        var digest: ByteArray? = byteArrayOf(0x00) //replace with bb

        try {
            md = MessageDigest.getInstance("SHA-256")
            md.reset()
            md.update(seed)
            md.update(input)
            digest = md.digest()
        } catch (ex: NoSuchAlgorithmException) {
            ex.stackTrace
        }

        return digest
    }
}