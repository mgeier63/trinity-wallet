package org.iota.mobile.yubikey.backend

interface Backend {
    fun sendApdu(apdu: ByteArray) : ByteArray
    fun close()

}