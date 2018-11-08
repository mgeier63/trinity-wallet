package org.iota.mobile.yubikey.transport

import java.io.Closeable

interface Backend : Closeable {
    fun sendApdu(apdu: ByteArray): ByteArray
    val persistent: Boolean
}